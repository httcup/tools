/* 人像抠图：优先用内置的 MediaPipe 人像分割模型，环境里跑不起来时退回纯算法。
   两条路都吐同一种东西——Float32Array 的 alpha 掩码，1 是人、0 是背景，
   后面的换底色逻辑因此不必关心到底走的哪条路。

   实测记录（Chrome，960×1199 人像）：
   · GPU 委派下创建分割器约 130 ms，单张推理在毫秒级
   · 置信度掩码上采样到原图尺寸，中心取到 1.000、四角 0.000，语义是 1=人
   · 即便指定 CPU 委派，MediaPipe 的 TensorsToSegmentationCalculator 仍要
     一个 WebGL 上下文；拿不到就整个创建失败。所以 hasWebgl() 是硬前提，
     不是优化项——没有它就只能走纯算法。 */

const BASE = new URL('../vendor/mediapipe/', import.meta.url);

/* 分割时先缩到这个长边再算：模型内部本来就只吃 256×256，
   喂 4000 像素的原图只会把输出掩码撑到几千万个浮点数，白占内存。 */
const WORK_SIDE = 1024;

let loading = null;

/** 这台浏览器有没有 WebGL —— MediaPipe 分割器的硬前提。 */
export function hasWebgl() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch (error) {
    return false;
  }
}

async function createSegmenter() {
  const { FilesetResolver, ImageSegmenter } = await import(new URL('vision_bundle.mjs', BASE).href);
  const vision = await FilesetResolver.forVisionTasks(new URL('wasm', BASE).href);
  const response = await fetch(new URL('selfie_segmenter.tflite', BASE));
  if (!response.ok) throw new Error('模型读取失败，检查一下文件是不是完整的。');
  const buffer = new Uint8Array(await response.arrayBuffer());

  let lastError = null;
  for (const delegate of ['GPU', 'CPU']) {
    try {
      return await ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetBuffer: buffer, delegate },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('分割器创建失败。');
}

/** 加载并缓存分割器。失败不缓存，下次还能重试。 */
export function loadSegmenter() {
  if (!loading) {
    loading = createSegmenter().catch((error) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

/** 把任意图源画进一张长边不超过 limit 的 canvas，返回 canvas 与缩放比。 */
export function toCanvas(source, limit = WORK_SIDE) {
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  const scale = Math.min(1, limit / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** 用内置模型算 alpha，返回 {alpha, width, height, engine}。 */
export function segmentWithModel(segmenter, canvas) {
  const result = segmenter.segment(canvas);
  const mask = result.confidenceMasks && result.confidenceMasks[0];
  if (!mask) throw new Error('没有拿到人像掩码。');
  const width = mask.width;
  const height = mask.height;
  const alpha = Float32Array.from(mask.getAsFloat32Array());
  for (const item of result.confidenceMasks || []) item.close?.();
  result.categoryMask?.close?.();
  return { alpha, width, height, engine: 'model' };
}

const rgbToLab = (r, g, b) => {
  const lin = (v) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const rl = lin(r);
  const gl = lin(g);
  const bl = lin(b);
  const x = (0.4124 * rl + 0.3576 * gl + 0.1805 * bl) / 0.95047;
  const y = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
  const z = (0.0193 * rl + 0.1192 * gl + 0.9505 * bl) / 1.08883;
  const f = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
};

/** 取图像四周一圈像素的中位色，当作「旧背景」的代表色。 */
export function sampleBorder(imageData, band = 0.04) {
  const { data, width, height } = imageData;
  const bx = Math.max(1, Math.round(width * band));
  const by = Math.max(1, Math.round(height * band));
  const pick = [];
  const push = (x, y) => {
    const at = (y * width + x) * 4;
    pick.push([data[at], data[at + 1], data[at + 2]]);
  };
  for (let y = 0; y < by; y += 1) for (let x = 0; x < width; x += 2) { push(x, y); push(x, height - 1 - y); }
  for (let x = 0; x < bx; x += 1) for (let y = 0; y < height; y += 2) { push(x, y); push(width - 1 - x, y); }
  const median = (index) => {
    const list = pick.map((item) => item[index]).sort((a, b) => a - b);
    return list[list.length >> 1];
  };
  return [median(0), median(1), median(2)];
}

/* 没有 WebGL 时的兜底：从边框估背景色，标出颜色接近它的像素，
   再从四条边向内泛洪，只把「和边缘连通」的那片判成背景。
   泛洪这一步是关键——不然人物身上的白衬衫也会被当成白背景挖掉。 */
export function segmentClassic(imageData, { tolerance = 16 } = {}) {
  const { data, width, height } = imageData;
  const count = width * height;
  const [br, bg, bb] = sampleBorder(imageData);
  const base = rgbToLab(br, bg, bb);

  const like = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) {
    const at = i * 4;
    const lab = rgbToLab(data[at], data[at + 1], data[at + 2]);
    const distance = Math.hypot(lab[0] - base[0], lab[1] - base[1], lab[2] - base[2]);
    if (distance < tolerance) like[i] = 1;
  }

  const outside = new Uint8Array(count);
  const stack = new Int32Array(count);
  let top = 0;
  const seed = (i) => { if (like[i] && !outside[i]) { outside[i] = 1; stack[top++] = i; } };
  for (let x = 0; x < width; x += 1) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y += 1) { seed(y * width); seed(y * width + width - 1); }

  while (top > 0) {
    const i = stack[--top];
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) seed(i - 1);
    if (x < width - 1) seed(i + 1);
    if (y > 0) seed(i - width);
    if (y < height - 1) seed(i + width);
  }

  const alpha = new Float32Array(count);
  for (let i = 0; i < count; i += 1) alpha[i] = outside[i] ? 0 : 1;
  return { alpha, width, height, engine: 'classic', border: [br, bg, bb] };
}

/** 双线性放大掩码到目标尺寸。 */
export function scaleMask(alpha, width, height, targetWidth, targetHeight) {
  if (width === targetWidth && height === targetHeight) return alpha;
  const out = new Float32Array(targetWidth * targetHeight);
  const xRatio = (width - 1) / Math.max(1, targetWidth - 1);
  const yRatio = (height - 1) / Math.max(1, targetHeight - 1);
  for (let y = 0; y < targetHeight; y += 1) {
    const sy = y * yRatio;
    const y0 = Math.floor(sy);
    const y1 = Math.min(height - 1, y0 + 1);
    const wy = sy - y0;
    for (let x = 0; x < targetWidth; x += 1) {
      const sx = x * xRatio;
      const x0 = Math.floor(sx);
      const x1 = Math.min(width - 1, x0 + 1);
      const wx = sx - x0;
      const top = alpha[y0 * width + x0] * (1 - wx) + alpha[y0 * width + x1] * wx;
      const bottom = alpha[y1 * width + x0] * (1 - wx) + alpha[y1 * width + x1] * wx;
      out[y * targetWidth + x] = top * (1 - wy) + bottom * wy;
    }
  }
  return out;
}

/** 掩码做一次 box 模糊，让硬边变柔（纯算法那条路用得到）。 */export function soften(alpha, width, height, radius = 1) {
  if (radius < 1) return alpha;
  const out = new Float32Array(alpha.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let n = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -radius; dx <= radius; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          sum += alpha[yy * width + xx];
          n += 1;
        }
      }
      out[y * width + x] = sum / n;
    }
  }
  return out;
}

/* 空间腐蚀：把前景轮廓整体往里收 radius 像素。
   和 tighten 的区别很关键——tighten 只压 alpha 在阈值附近的像素，
   碰到「模型把背景整块判成 alpha=1」的地方完全无能为力，
   那种地方只能靠空间收缩让新底色吃进去。 */
export function erode(alpha, width, height, radius = 2) {
  if (radius < 1) return alpha;
  const mid = new Float32Array(alpha.length);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      let low = alpha[row + x];
      for (let d = -radius; d <= radius; d += 1) {
        const xx = x + d;
        if (xx < 0 || xx >= width) continue;
        const value = alpha[row + xx];
        if (value < low) low = value;
      }
      mid[row + x] = low;
    }
  }
  const out = new Float32Array(alpha.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let low = mid[y * width + x];
      for (let d = -radius; d <= radius; d += 1) {
        const yy = y + d;
        if (yy < 0 || yy >= height) continue;
        const value = mid[yy * width + x];
        if (value < low) low = value;
      }
      out[y * width + x] = low;
    }
  }
  return out;
}

/* 模型把边缘判成「人」的地方，换完底色会露出一圈旧底色——实测这张人像有
   2.4% 的像素 alpha=1、颜色却和旧背景只差 31，看着就是一圈暗红斑。
   这里只在贴近背景的窄带里动手：把颜色仍然等于旧背景的像素剔掉。
   限定在窄带里是关键，否则人物身上跟背景同色的衣服会被一起挖空。 */
export function cleanTint(alpha, imageData, border, { tolerance = 45, reach = 3 } = {}) {
  const { data, width, height } = imageData;
  const count = width * height;
  const isBg = new Uint8Array(count);
  let hasBg = false;
  for (let i = 0; i < count; i += 1) {
    if (alpha[i] <= 0.02) { isBg[i] = 1; hasBg = true; }
  }
  if (!hasBg) return alpha;

  const grow = (src) => {
    const mid = new Uint8Array(count);
    for (let y = 0; y < height; y += 1) {
      const row = y * width;
      for (let x = 0; x < width; x += 1) {
        if (!src[row + x]) continue;
        for (let dx = -reach; dx <= reach; dx += 1) {
          const xx = x + dx;
          if (xx >= 0 && xx < width) mid[row + xx] = 1;
        }
      }
    }
    const out = new Uint8Array(count);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!mid[y * width + x]) continue;
        for (let dy = -reach; dy <= reach; dy += 1) {
          const yy = y + dy;
          if (yy >= 0 && yy < height) out[yy * width + x] = 1;
        }
      }
    }
    return out;
  };

  const near = grow(isBg);
  const out = Float32Array.from(alpha);
  const [br, bg, bb] = border;
  for (let i = 0; i < count; i += 1) {
    if (!near[i] || alpha[i] <= 0.02) continue;
    const p = i * 4;
    const distance = Math.hypot(data[p] - br, data[p + 1] - bg, data[p + 2] - bb);
    if (distance < tolerance) out[i] = 0;
  }
  return out;
}

/** 把 alpha 往 0 推（背景侧膨胀），数值越大边缘收得越紧。 */
export function tighten(alpha, amount) {
  if (amount <= 0) return alpha;
  const cut = Math.min(0.95, amount);
  const out = new Float32Array(alpha.length);
  for (let i = 0; i < alpha.length; i += 1) {
    const value = alpha[i];
    out[i] = value <= cut ? 0 : (value - cut) / (1 - cut);
  }
  return out;
}

/* 把抠好的人像画到新底色上。
   clean 打开时会对边缘做一次颜色去污：半透明像素里原本混着旧背景的颜色，
   直接按 alpha 叠新底色会留下一圈旧背景的残影。

   去污用的是 F = C + (1-a)/a × (C - B)（把 C = aF + (1-a)B 反解出来）。
   这里有个坑：a 很小时 (1-a)/a 会冲到几十倍，把像素顶到 255 再 clamp，
   结果就是头发边缘一圈死白。所以放大系数要封顶，a 小于 0.05 时按 0.05 算。
   上限取 0.6 是量出来的：1.2 时旧背景里偏亮的红色会被推成粉白，实测左肩
   那圈浅色斑就是这么来的；0.6 只做温和校正，剩下的交给空间腐蚀去收。 */
export function composite(sourceCanvas, { alpha, width, height }, options = {}) {
  const {
    color = '#ffffff',
    transparent = false,
    tight = 0,
    border = null,
    clean = true,
  } = options;

  const target = document.createElement('canvas');
  target.width = sourceCanvas.width;
  target.height = sourceCanvas.height;
  const ctx = target.getContext('2d', { willReadFrequently: true });

  const full = scaleMask(alpha, width, height, target.width, target.height);
  const mask = tighten(full, tight);

  const source = ctx.createImageData(target.width, target.height);
  const src = sourceCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, target.width, target.height).data;
  const out = source.data;

  const raw = String(color).replace('#', '');
  const hex = raw.length === 3 ? raw.replace(/./g, (ch) => ch + ch) : raw;
  const bgR = parseInt(hex.slice(0, 2), 16) || 0;
  const bgG = parseInt(hex.slice(2, 4), 16) || 0;
  const bgB = parseInt(hex.slice(4, 6), 16) || 0;
  const old = border || [255, 255, 255];

  for (let i = 0, p = 0; i < mask.length; i += 1, p += 4) {
    const a = mask[i];
    const at = p;
    if (a <= 0) {
      out[at] = bgR;
      out[at + 1] = bgG;
      out[at + 2] = bgB;
      out[at + 3] = transparent ? 0 : 255;
      continue;
    }
    let r = src[at];
    let g = src[at + 1];
    let b = src[at + 2];
    if (clean && a < 0.98) {
      const k = Math.min(0.6, (1 - a) / Math.max(a, 0.05));
      r = Math.min(255, Math.max(0, r + k * (r - old[0])));
      g = Math.min(255, Math.max(0, g + k * (g - old[1])));
      b = Math.min(255, Math.max(0, b + k * (b - old[2])));
    }
    if (a >= 0.999) {
      out[at] = r;
      out[at + 1] = g;
      out[at + 2] = b;
      out[at + 3] = 255;
      continue;
    }
    out[at] = r * a + bgR * (1 - a);
    out[at + 1] = g * a + bgG * (1 - a);
    out[at + 2] = b * a + bgB * (1 - a);
    out[at + 3] = transparent ? Math.round(a * 255) : 255;
  }

  ctx.putImageData(source, 0, 0);
  return target;
}
