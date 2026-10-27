#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ToolKnit 批次定义（三）：图片工具（裁剪/翻转/切图/像素画/半调/元数据）。"""

TOOLS = []

IMG_DROP = """
<section class="tool-card">
  <div class="drop" id="drop">
    <p><b>拖入图片</b> 或</p>
    <label class="btn btn-primary">选择图片<input type="file" id="file" accept="image/*" hidden></label>
  </div>
</section>
"""

CANVAS_CARD = """
<section class="tool-card">
  <div class="card-head"><h2>@@TITLE@@</h2><span class="stats" id="stats"></span></div>
  <div style="text-align:center"><canvas id="cv" style="max-width:100%;border:1px solid var(--border);border-radius:8px;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/16px 16px"></canvas></div>
  <div class="row">@@CTRLS@@<a class="btn btn-primary" id="dl" download="output.png" hidden>下载 PNG</a></div>
</section>
"""


def t(slug, name, desc, long, keys, cat, icon, body, js, note=""):
    TOOLS.append(dict(slug=slug, name=name, desc=desc, long=long, keys=keys,
                      cat=cat, icon=icon, note=note, body=body, js=js))


LOADER_JS = """var img = null;
  function loadFile(f) {
    if (!f || f.type.indexOf('image/') !== 0) return;
    var url = URL.createObjectURL(f);
    var im = new Image();
    im.onload = function () { img = im; onImage(); };
    im.src = url;
  }
  var drop = document.getElementById('drop');
  ['dragover', 'dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      drop.classList.toggle('over', ev === 'dragover');
      if (ev === 'drop') loadFile(e.dataTransfer.files[0]);
    });
  });
  document.getElementById('file').addEventListener('change', function (e) { loadFile(e.target.files[0]); });"""

t("image-crop", "图片裁剪",
  "按比例框选并裁出想要的部分。",
  "在图片上拖拽选择裁剪区域，支持自由比例与常用比例锁定，实时预览并导出 PNG。",
  "裁剪 crop 截取 图片",
  "images", "scissors",
  IMG_DROP + CANVAS_CARD.replace("@@TITLE@@", "拖拽下图选择裁剪区域").replace("@@CTRLS@@",
    '<label class="field"><span>比例锁定</span><select id="ratio"><option value="0">自由</option><option value="1">1:1</option><option value="1.3333">4:3</option><option value="0.75">3:4</option><option value="1.7778">16:9</option></select></label>'),
  """(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var sel = null, dragging = false, sx = 0, sy = 0;
""" + LOADER_JS + """
  function onImage() {
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    draw();
    document.getElementById('stats').textContent = img.naturalWidth + ' × ' + img.naturalHeight;
  }
  function ratio() { return parseFloat(document.getElementById('ratio').value) || 0; }
  function pos(e) {
    var r = cv.getBoundingClientRect();
    var p = e.touches ? e.touches[0] : e;
    return { x: (p.clientX - r.left) * cv.width / r.width, y: (p.clientY - r.top) * cv.height / r.height };
  }
  function draw() {
    ctx.drawImage(img, 0, 0);
    if (sel) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.clearRect(sel.x, sel.y, sel.w, sel.h);
      ctx.drawImage(img, sel.x, sel.y, sel.w, sel.h, sel.x, sel.y, sel.w, sel.h);
      ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 2;
      ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
    }
  }
  function start(e) { if (!img) return; dragging = true; var p = pos(e); sx = p.x; sy = p.y; sel = { x: sx, y: sy, w: 0, h: 0 }; e.preventDefault(); }
  function move(e) {
    if (!dragging || !img) return;
    var p = pos(e), R = ratio();
    var w = p.x - sx, h = p.y - sy;
    if (R) { if (Math.abs(w) > Math.abs(h) * R) h = Math.sign(h || 1) * Math.abs(w) / R; else w = Math.sign(w || 1) * Math.abs(h) * R; }
    sel = { x: Math.min(sx, sx + w), y: Math.min(sy, sy + h), w: Math.abs(w), h: Math.abs(h) };
    draw(); e.preventDefault();
  }
  function end() {
    if (!dragging) return;
    dragging = false;
    if (sel && sel.w > 4 && sel.h > 4) {
      var out = document.createElement('canvas');
      out.width = Math.round(sel.w); out.height = Math.round(sel.h);
      out.getContext('2d').drawImage(img, sel.x, sel.y, sel.w, sel.h, 0, 0, out.width, out.height);
      var dl = document.getElementById('dl');
      dl.href = out.toDataURL('image/png'); dl.hidden = false;
      document.getElementById('stats').textContent = out.width + ' × ' + out.height + ' 已生成';
    }
  }
  cv.addEventListener('mousedown', start); cv.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  cv.addEventListener('touchstart', start, { passive: false }); cv.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', end);
})();""",
  "拖出选区后点「下载 PNG」得到裁剪结果。")

t("circle-crop", "圆形头像裁剪",
  "裁出正圆形头像并保留透明底。",
  "从图片中心裁出正圆头像，可缩放与平移，导出带透明背景的圆形 PNG，适合微信、GitHub 头像。",
  "头像 圆形 裁剪 avatar",
  "images", "circle",
  IMG_DROP + CANVAS_CARD.replace("@@TITLE@@", "滚轮缩放，拖动平移").replace("@@CTRLS@@",
    '<label class="field"><span>输出尺寸</span><select id="size"><option value="256">256 px</option><option value="512" selected>512 px</option><option value="1024">1024 px</option></select></label><button class="btn" type="button" id="reset">重置</button>'),
  """(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var scale = 1, ox = 0, oy = 0, base = 1;
""" + LOADER_JS + """
  function onImage() {
    var side = Math.min(img.naturalWidth, img.naturalHeight);
    cv.width = cv.height = 420;
    base = 420 / side;
    scale = 1; ox = oy = 0;
    document.getElementById('stats').textContent = img.naturalWidth + ' × ' + img.naturalHeight;
    draw();
  }
  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    var s = base * scale;
    var w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cv.width - w) / 2 + ox, (cv.height - h) / 2 + oy, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(cv.width / 2, cv.height / 2, cv.width / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cv.width / 2, cv.height / 2, cv.width / 2 - 1, 0, Math.PI * 2); ctx.stroke();
  }
  function out() {
    var n = parseInt(document.getElementById('size').value);
    var o = document.createElement('canvas'); o.width = o.height = n;
    o.getContext('2d').drawImage(cv, 0, 0, n, n);
    return o;
  }
  function refresh() { draw(); var dl = document.getElementById('dl'); dl.href = out().toDataURL('image/png'); dl.hidden = false; }
  cv.addEventListener('wheel', function (e) {
    if (!img) return;
    e.preventDefault();
    scale = Math.min(6, Math.max(0.3, scale * (e.deltaY < 0 ? 1.1 : 0.9)));
    refresh();
  }, { passive: false });
  var drag = null;
  cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, ox: ox, oy: oy }; });
  window.addEventListener('pointermove', function (e) {
    if (!drag || !img) return;
    ox = drag.ox + (e.clientX - drag.x); oy = drag.oy + (e.clientY - drag.y); draw();
  });
  window.addEventListener('pointerup', function () { if (drag) { drag = null; refresh(); } });
  document.getElementById('size').addEventListener('change', refresh);
  document.getElementById('reset').addEventListener('click', function () { scale = 1; ox = oy = 0; refresh(); });
})();""",
  "圆形外部是透明的，导出后可直接当头像用。")

t("flip-image", "图片翻转",
  "水平或垂直镜像翻转图片。",
  "把图片水平镜像或垂直翻转后导出，自拍镜像、对称构图一键完成，全程本地处理。",
  "翻转 镜像 mirror flip 图片",
  "images", "flip",
  IMG_DROP + CANVAS_CARD.replace("@@TITLE@@", "翻转预览").replace("@@CTRLS@@",
    '<button class="btn" type="button" id="hBtn">⇄ 水平镜像</button><button class="btn" type="button" id="vBtn">⇅ 垂直翻转</button><button class="btn" type="button" id="bBtn">旋转 180°</button>'),
  """(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var mode = 'none';
""" + LOADER_JS + """
  function onImage() {
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    document.getElementById('stats').textContent = cv.width + ' × ' + cv.height;
    draw();
  }
  function draw() {
    ctx.save();
    if (mode === 'h') { ctx.translate(cv.width, 0); ctx.scale(-1, 1); }
    if (mode === 'v') { ctx.translate(0, cv.height); ctx.scale(1, -1); }
    if (mode === 'b') { ctx.translate(cv.width, cv.height); ctx.rotate(Math.PI); }
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    var dl = document.getElementById('dl');
    dl.href = cv.toDataURL('image/png'); dl.hidden = false;
  }
  [['hBtn', 'h'], ['vBtn', 'v'], ['bBtn', 'b']].forEach(function (p) {
    document.getElementById(p[0]).addEventListener('click', function () {
      mode = (mode === p[1] ? 'none' : p[1]); if (img) draw();
    });
  });
})();""",
  "再点一次按钮可恢复原图方向。")

t("carousel-splitter", "轮播图无缝切分",
  "把长图切成多张衔接的轮播图。",
  "把一张长图按等高切成 2–20 张衔接的轮播图，支持指定张数或每张高度，按序下载 PNG 或打包 ZIP。",
  "轮播 切图 长图 分割 小红书",
  "images", "grid",
  IMG_DROP + CANVAS_CARD.replace("@@TITLE@@", "切分预览").replace("@@CTRLS@@",
    '<label class="field"><span>切分方式</span><select id="mode"><option value="count">按张数</option><option value="height">按每张高度</option></select></label><label class="field"><span>张数 / 高度 px</span><input type="number" id="n" value="4" min="2" max="30"></label><button class="btn btn-primary" type="button" id="zipBtn">下载 ZIP</button>'),
  """(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
""" + LOADER_JS + """
  function slices() {
    var mode = document.getElementById('mode').value;
    var n = parseInt(document.getElementById('n').value) || 4;
    var H = img.naturalHeight, W = img.naturalWidth;
    var count = mode === 'count' ? n : Math.max(1, Math.ceil(H / n));
    count = Math.min(count, 30);
    var h = Math.ceil(H / count);
    var list = [];
    for (var i = 0; i < count; i++) {
      var y = i * (H - h) / Math.max(1, count - 1);
      list.push({ y: Math.round(y), h: h });
    }
    return list;
  }
  function onImage() {
    cv.width = Math.min(img.naturalWidth, 420);
    cv.height = Math.min(img.naturalHeight, 900);
    document.getElementById('stats').textContent = img.naturalWidth + ' × ' + img.naturalHeight;
    draw();
  }
  function draw() {
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#2b6cb0'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
    slices().forEach(function (s, i) {
      if (i === 0) return;
      var y = s.y / img.naturalHeight * cv.height;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y); ctx.stroke();
    });
    ctx.setLineDash([]);
  }
  function files() {
    return slices().map(function (s, i) {
      var c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = s.h;
      c.getContext('2d').drawImage(img, 0, s.y, img.naturalWidth, s.h, 0, 0, c.width, c.height);
      return { name: 'slide-' + (i + 1) + '.png', blob: c.toDataURL('image/png') };
    });
  }
  document.getElementById('n').addEventListener('input', function () { if (img) draw(); });
  document.getElementById('mode').addEventListener('change', function () { if (img) draw(); });
  document.getElementById('zipBtn').addEventListener('click', function () {
    if (!img) return;
    var parts = files().map(function (f) {
      var b = f.blob.split(',')[1], bin = atob(b), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return { name: f.name, data: arr };
    });
    if (window.TkZip) TkZip.build(parts, 'carousel.zip');
    else parts.forEach(function (p, i) {
      var a = document.createElement('a');
      a.href = 'data:image/png;base64,' + btoa(String.fromCharCode.apply(null, p.data));
      a.download = p.name;
      setTimeout(function () { a.click(); }, i * 250);
    });
  });
})();""",
  "相邻两张有少量重叠，保证轮播衔接无缝；不装 ZIP 依赖时逐张下载。")

t("image-grid-split", "九宫格切图",
  "把图片切成宫格并逐格导出。",
  "把正方形或任意图片切成 3×3 / 4×4 / 5×5 宫格，先补成正方形再切，适合朋友圈九宫格发布。",
  "九宫格 宫格 切图 朋友圈",
  "images", "grid",
  IMG_DROP + CANVAS_CARD.replace("@@TITLE@@", "宫格预览").replace("@@CTRLS@@",
    '<label class="field"><span>宫格</span><select id="g"><option value="3">3 × 3</option><option value="4">4 × 4</option><option value="5">5 × 5</option></select></label><button class="btn btn-primary" type="button" id="goBtn">逐格下载</button>'),
  """(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
""" + LOADER_JS + """
  function onImage() {
    var side = Math.min(img.naturalWidth, img.naturalHeight);
    cv.width = cv.height = Math.min(side, 500);
    draw();
  }
  function draw() {
    var side = Math.min(img.naturalWidth, img.naturalHeight);
    var sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, cv.width, cv.height);
    var n = parseInt(document.getElementById('g').value);
    ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 1.5;
    for (var i = 1; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(i * cv.width / n, 0); ctx.lineTo(i * cv.width / n, cv.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cv.height / n); ctx.lineTo(cv.width, i * cv.height / n); ctx.stroke();
    }
  }
  document.getElementById('g').addEventListener('change', function () { if (img) draw(); });
  document.getElementById('goBtn').addEventListener('click', function () {
    if (!img) return;
    var n = parseInt(document.getElementById('g').value);
    var cell = cv.width / n;
    for (var i = 0; i < n * n; i++) {
      (function (idx) {
        setTimeout(function () {
          var c = document.createElement('canvas');
          c.width = c.height = cell;
          c.getContext('2d').drawImage(cv, (idx % n) * cell, Math.floor(idx / n) * cell, cell, cell, 0, 0, cell, cell);
          var a = document.createElement('a');
          a.href = c.toDataURL('image/png');
          a.download = 'grid-' + (idx + 1) + '.png';
          a.click();
        }, idx * 220);
      })(i);
    }
  });
})();""",
  "非正方形图片会先居中裁成正方形再切。")

t("pixel-art-converter", "像素画转换器",
  "把照片变成复古像素风。",
  "把图片缩小取样并可选调色板量化，生成复古像素风图像，可调块大小与饱和度，导出 PNG。",
  "像素画 pixel art 复古 马赛克",
  "images", "pixel",
  IMG_DROP + CANVAS_CARD.replace("@@TITLE@@", "像素化预览").replace("@@CTRLS@@",
    '<label class="field"><span>块大小</span><input type="range" id="px" min="2" max="24" value="8"></label><label class="field"><span>色彩数</span><input type="range" id="pal" min="2" max="64" value="16"></label>'),
  """(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
""" + LOADER_JS + """
  function onImage() { cv.width = img.naturalWidth; cv.height = img.naturalHeight; render(); }
  function quant(v, levels) {
    var step = 255 / (levels - 1);
    return Math.round(Math.round(v / step) * step);
  }
  function render() {
    if (!img) return;
    var px = parseInt(document.getElementById('px').value);
    var levels = parseInt(document.getElementById('pal').value);
    var w = Math.max(1, Math.round(cv.width / px)), h = Math.max(1, Math.round(cv.height / px));
    var tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    var tc = tmp.getContext('2d');
    tc.drawImage(img, 0, 0, w, h);
    var d = tc.getImageData(0, 0, w, h);
    for (var i = 0; i < d.data.length; i += 4) {
      d.data[i] = quant(d.data[i], levels);
      d.data[i + 1] = quant(d.data[i + 1], levels);
      d.data[i + 2] = quant(d.data[i + 2], levels);
    }
    tc.putImageData(d, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(tmp, 0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = true;
    var dl = document.getElementById('dl');
    dl.href = cv.toDataURL('image/png'); dl.hidden = false;
    document.getElementById('stats').textContent = '块 ' + px + 'px · ' + levels + ' 级色';
  }
  ['px', 'pal'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
  });
})();""",
  "块越大越「像素」；色彩数越低越复古。")

t("silk-screen", "丝网印刷滤镜",
  "三色半调网点风格化照片。",
  "把照片转成三通道半调网点效果，可调网点尺寸、角度与三种通道颜色，输出印刷风格设计图。",
  "半调 丝网印刷 网点 海报 风格化",
  "images", "halftone",
  IMG_DROP + CANVAS_CARD.replace("@@TITLE@@", "半调预览").replace("@@CTRLS@@",
    '<label class="field"><span>网点间距</span><input type="range" id="dot" min="4" max="24" value="8"></label>'
    '<label class="field"><span>C 色</span><input type="color" id="cC" value="#1a6db3"></label>'
    '<label class="field"><span>M 色</span><input type="color" id="cM" value="#d04a5e"></label>'
    '<label class="field"><span>Y 色</span><input type="color" id="cY" value="#e9b53a"></label>'),
  """(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
""" + LOADER_JS + """
  function onImage() {
    var maxW = 720;
    var s = Math.min(1, maxW / img.naturalWidth);
    cv.width = Math.round(img.naturalWidth * s);
    cv.height = Math.round(img.naturalHeight * s);
    render();
  }
  function render() {
    if (!img) return;
    var gap = parseInt(document.getElementById('dot').value);
    var cols = [document.getElementById('cC').value, document.getElementById('cM').value, document.getElementById('cY').value];
    var angles = [15, 75, 0];
    var tmp = document.createElement('canvas');
    tmp.width = cv.width; tmp.height = cv.height;
    var tc = tmp.getContext('2d');
    tc.drawImage(img, 0, 0, cv.width, cv.height);
    var d = tc.getImageData(0, 0, cv.width, cv.height).data;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'multiply';
    [0, 1, 2].forEach(function (ch) {
      ctx.fillStyle = cols[ch];
      var a = angles[ch] * Math.PI / 180;
      ctx.save();
      ctx.translate(cv.width / 2, cv.height / 2);
      ctx.rotate(a);
      ctx.translate(-cv.width / 2, -cv.height / 2);
      for (var y = -gap; y < cv.height + gap * 2; y += gap) {
        for (var x = -gap; x < cv.width + gap * 2; x += gap) {
          var sx = Math.round(x + cv.width / 2 * 0), sy = Math.round(y);
          if (sx >= 0 && sx < cv.width && sy >= 0 && sy < cv.height) {
            var v = d[(sy * cv.width + Math.min(cv.width - 1, sx)) * 4 + ch] / 255;
            var r = gap * 0.62 * Math.sqrt(1 - v);
            if (r > 0.3) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
          }
        }
      }
      ctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over';
    var dl = document.getElementById('dl');
    dl.href = cv.toDataURL('image/png'); dl.hidden = false;
    document.getElementById('stats').textContent = '网点 ' + gap + 'px';
  }
  ['dot', 'cC', 'cM', 'cY'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
  });
})();""",
  "用 multiply 混合模拟 CMY 三版套印，曝光不足的区域网点更大。")

t("ai-image-metadata-viewer", "AI 图片元数据查看",
  "查看 AI 生成图片里的提示词。",
  "读取 PNG / JPEG 的内嵌元数据：PNG 文本块（Stable Diffusion、ComfyUI 等）与 JPEG EXIF，查看提示词与生成参数，文件不上传。",
  "ai 元数据 提示词 exif png comfyui",
  "images", "info",
  """
<section class="tool-card">
  <div class="drop" id="drop">
    <p><b>拖入 PNG / JPEG</b> 或</p>
    <label class="btn btn-primary">选择文件<input type="file" id="file" accept="image/png,image/jpeg" hidden></label>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>元数据</h2><span class="stats" id="stats"></span></div>
  <dl class="kv" id="res"></dl>
  <p class="note">仅解析文件头部字节，不会上传或修改图片；多数 AI 工具把提示词写在 PNG 的 tEXt / iTXt 块里。</p>
</section>
""",
  """(function () {
  'use strict';
  var drop = document.getElementById('drop');
  function show(rows, stat) {
    document.getElementById('res').innerHTML = rows.map(function (r) {
      return '<dt>' + TK.esc(r[0]) + '</dt><dd style="white-space:pre-wrap;max-width:60ch">' + TK.esc(r[1]) + '</dd>';
    }).join('') || '<dt>没有找到</dt><dd>这个文件没有可读的文本元数据。</dd>';
    document.getElementById('stats').textContent = stat;
  }
  function parsePng(buf) {
    var v = new DataView(buf), rows = [];
    if (v.getUint32(0) !== 0x89504E47) return null;
    var off = 8;
    while (off + 12 <= buf.byteLength) {
      var len = v.getUint32(off), type = String.fromCharCode(v.getUint8(off + 4), v.getUint8(off + 5), v.getUint8(off + 6), v.getUint8(off + 7));
      if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
        var bytes = new Uint8Array(buf, off + 8, len);
        var s = new TextDecoder('latin1').decode(bytes);
        var nul = s.indexOf('\\u0000');
        var key = s.slice(0, nul), val = s.slice(nul + 1).replace(/^\\u0000.\\u0000/, '');
        if (type === 'zTXt') val = '(压缩数据，未解压)';
        if (key === 'iTXt' || type === 'iTXt') { var parts = s.split('\\u0000'); key = parts[0]; val = parts.slice(5).join('\\u0000'); }
        rows.push([key, val]);
      }
      if (type === 'IEND') break;
      off += 12 + len;
    }
    return rows;
  }
  function parseJpeg(buf) {
    var v = new DataView(buf), off = 2, rows = [];
    while (off + 4 < buf.byteLength) {
      if (v.getUint8(off) !== 0xFF) { off++; continue; }
      var marker = v.getUint8(off + 1), len = v.getUint16(off + 2);
      if (marker === 0xE1 && off + 4 + 6 < buf.byteLength) {
        var head = new TextDecoder('latin1').decode(new Uint8Array(buf, off + 4, 6));
        if (head === 'Exif\\u0000\\u0000') {
          try {
            var dv = new DataView(buf, off + 10);
            var le = dv.getUint16(0) === 0x4949;
            var ifd = dv.getUint32(4, le);
            var names = { 271: '厂商', 272: '型号', 306: '拍摄时间', 305: '软件', 8298: '版权', 270: '描述' };
            for (var i = 0; i < 60; i++) {
              var e = ifd + 12 * i;
              if (e + 12 > dv.byteLength) break;
              var tag = dv.getUint16(e, le);
              if (names[tag]) {
                var cnt = dv.getUint32(e + 4, le);
                var vo = dv.getUint32(e + 8, le);
                if (vo + cnt <= dv.byteLength) rows.push([names[tag], new TextDecoder().decode(new Uint8Array(dv.buffer, dv.byteOffset + vo, cnt)).replace(/\\u0000+$/, '')]);
              }
            }
          } catch (err) { rows.push(['EXIF', '解析失败']); }
        }
      }
      if (marker === 0xDA) break;
      off += 2 + len;
    }
    return rows;
  }
  function load(f) {
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      var buf = fr.result;
      var rows = parsePng(buf) || parseJpeg(buf) || [];
      show(rows, f.name + ' · ' + (buf.byteLength / 1024).toFixed(0) + ' KB');
    };
    fr.readAsArrayBuffer(f);
  }
  ['dragover', 'dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      drop.classList.toggle('over', ev === 'dragover');
      if (ev === 'drop') load(e.dataTransfer.files[0]);
    });
  });
  document.getElementById('file').addEventListener('change', function (e) { load(e.target.files[0]); });
})();""",
  "提示词通常在 parameters / prompt / Description 等键下。")
