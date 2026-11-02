/* PDF 读取与渲染：把 pdf.js 包一层，输出「行 + 段落」的结构，
   让转 Word / PPT / HTML / 图片 的几个工具共用同一份解析结果。 */

const PDFJS_PATH = '../vendor/pdfjs/pdf.min.js';
const WORKER_PATH = '../vendor/pdfjs/pdf.worker.min.js';

let loader = null;

/** 只在需要时加载 pdf.js，一页里多个工具也只会加载一次。 */
export function loadPdfjs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = PDFJS_PATH;
    tag.onload = () => {
      const lib = window.pdfjsLib;
      if (!lib) {
        reject(new Error('pdf.nolib'));
        return;
      }
      lib.GlobalWorkerOptions.workerSrc = WORKER_PATH;
      resolve(lib);
    };
    tag.onerror = () => reject(new Error('pdf.nolib'));
    document.head.appendChild(tag);
  });
  return loader;
}

export class PdfPasswordError extends Error {}
export class PdfBrokenError extends Error {}

/** 打开一个 PDF 文件，加密的会抛 PdfPasswordError（password 为空时）。 */
export async function openPdf(file, password = '') {
  const lib = await loadPdfjs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const task = lib.getDocument({
    data: bytes,
    password: password || undefined,
    isEvalSupported: false,
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const doc = await task.promise;
    doc.__name = file.name || 'document.pdf';
    return doc;
  } catch (error) {
    if (error?.name === 'PasswordException') throw new PdfPasswordError(error.code);
    throw new PdfBrokenError(error?.message || 'pdf.broken');
  }
}

/* 一行文字的高度容差：同一行里 y 会有一两点的抖动 */
const LINE_TOL = 0.55;

function sizeOf(item) {
  const [a, b, c, d] = item.transform;
  return Math.hypot(c, d) || Math.hypot(a, b) || item.height || 10;
}

function isCjk(text) {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(text);
}

/** 把 pdf.js 的文本片段拼成行。 */
function toLines(items) {
  const pieces = [];
  for (const item of items) {
    if (!item.str) continue;
    const size = sizeOf(item);
    pieces.push({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      w: item.width || 0,
      size,
      eol: !!item.hasEOL,
    });
  }
  pieces.sort((a, b) => (Math.abs(b.y - a.y) > LINE_TOL ? b.y - a.y : a.x - b.x));

  const lines = [];
  let current = null;
  for (const piece of pieces) {
    const limit = Math.max(2, piece.size * LINE_TOL);
    if (!current || Math.abs(current.y - piece.y) > limit) {
      current = { y: piece.y, size: piece.size, pieces: [piece] };
      lines.push(current);
    } else {
      current.pieces.push(piece);
      current.size = Math.max(current.size, piece.size);
    }
  }

  return lines.map((line) => {
    const parts = line.pieces.sort((a, b) => a.x - b.x);
    let text = '';
    let prev = null;
    for (const part of parts) {
      if (prev) {
        const gap = part.x - (prev.x + prev.w);
        const needSpace = gap > prev.size * 0.28 && !isCjk(prev.text) && !isCjk(part.text) && !/\s$/.test(text);
        if (needSpace) text += ' ';
      }
      text += part.text;
      prev = part;
    }
    const first = parts[0];
    const last = parts[parts.length - 1];
    return {
      text: text.replace(/\s+/g, ' ').trim(),
      x: first.x,
      y: line.y,
      w: last.x + last.w - first.x,
      size: line.size,
    };
  }).filter((line) => line.text);
}

/** 行 → 段落：竖直间距小、左边界接近的算同一段。 */
function toParagraphs(lines, pageWidth) {
  const out = [];
  const sorted = lines.slice().sort((a, b) => (Math.abs(b.y - a.y) > 1 ? b.y - a.y : a.x - b.x));
  let block = null;

  for (const line of sorted) {
    if (!block) {
      block = { lines: [line], top: line.y, bottom: line.y, left: line.x, right: line.x + line.w, size: line.size };
      continue;
    }
    const gap = block.bottom - line.y;
    const sameBlock =
      gap < line.size * 1.85 &&
      Math.abs(line.x - block.left) < Math.max(pageWidth * 0.06, line.size * 3) &&
      Math.abs(line.size - block.size) < block.size * 0.35;
    if (sameBlock) {
      block.lines.push(line);
      block.bottom = Math.min(block.bottom, line.y);
      block.right = Math.max(block.right, line.x + line.w);
      block.left = Math.min(block.left, line.x);
      block.size = Math.max(block.size, line.size);
    } else {
      out.push(block);
      block = { lines: [line], top: line.y, bottom: line.y, left: line.x, right: line.x + line.w, size: line.size };
    }
  }
  if (block) out.push(block);

  return out.map((item) => {
    let text = '';
    for (const line of item.lines) {
      if (!text) {
        text = line.text;
      } else if (/[a-zA-Z0-9]$/.test(text) && /^[a-zA-Z0-9]/.test(line.text)) {
        text += ' ' + line.text;
      } else {
        text += line.text;
      }
    }
    return {
      text,
      left: item.left,
      right: item.right,
      top: item.top,
      bottom: item.bottom,
      height: item.top - item.bottom || item.size,
      size: item.size,
    };
  });
}

/** 读一页：尺寸、行、段落。 */
export async function readPage(doc, n) {
  const page = await doc.getPage(n);
  const view = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const lines = toLines(content.items);
  const model = {
    index: n,
    width: view.width,
    height: view.height,
    rotation: view.rotation,
    lines,
    paragraphs: toParagraphs(lines, view.width),
    text: lines.map((line) => line.text).join('\n'),
  };
  page.cleanup();
  return model;
}

/** 抽取整本文档的文字结构。 */
export async function extract(file, { onProgress, pages = null } = {}) {
  const doc = await openPdf(file);
  const list = pages || Array.from({ length: doc.numPages }, (_, i) => i + 1);
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    out.push(await readPage(doc, list[i]));
    onProgress?.(i + 1, list.length);
  }
  return { pages: out, numPages: doc.numPages, name: doc.__name };
}

/** 把某一页画到 canvas 上，返回 canvas。 */
export async function renderPage(doc, pageNumber, scale = 2, canvas = null) {
  const page = await doc.getPage(pageNumber);
  const view = page.getViewport({ scale });
  const target = canvas || document.createElement('canvas');
  target.width = Math.max(1, Math.round(view.width));
  target.height = Math.max(1, Math.round(view.height));
  const ctx = target.getContext('2d', { alpha: false });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, target.width, target.height);
  await page.render({ canvasContext: ctx, viewport: view, background: '#ffffff' }).promise;
  page.cleanup();
  return target;
}

export function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** 这一页是不是几乎没有文字（扫描件）——用来提示 OCR 或按图处理。 */
export function looksScanned(page) {
  return page.text.replace(/\s/g, '').length < 20;
}
