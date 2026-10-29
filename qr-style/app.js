/* 二维码生成和美化：几何引擎移植自 httcup/qraft（参考 QRBTF 形态的独立实现）。
   编码用站内本地 js/qrcode.min.js（qrcode-generator），全部计算在浏览器内完成，无任何请求。 */
(function () {
  'use strict';

  /* ================= 几何引擎（module 单位：矩阵占 [0, n]） ================= */

  function num(v) {
    var r = Math.round(v * 1000) / 1000;
    return Object.is(r, -0) ? '0' : String(r);
  }

  /* 四角独立半径的圆角矩形 */
  function rr(x, y, w, h, tl, tr, br, bl) {
    var lim = Math.min(w, h) / 2;
    tl = Math.min(tl, lim); tr = Math.min(tr, lim);
    br = Math.min(br, lim); bl = Math.min(bl, lim);
    var d = 'M' + num(x + tl) + ' ' + num(y) + 'H' + num(x + w - tr);
    if (tr > 0) d += 'A' + num(tr) + ' ' + num(tr) + ' 0 0 1 ' + num(x + w) + ' ' + num(y + tr);
    d += 'V' + num(y + h - br);
    if (br > 0) d += 'A' + num(br) + ' ' + num(br) + ' 0 0 1 ' + num(x + w - br) + ' ' + num(y + h);
    d += 'H' + num(x + bl);
    if (bl > 0) d += 'A' + num(bl) + ' ' + num(bl) + ' 0 0 1 ' + num(x) + ' ' + num(y + h - bl);
    d += 'V' + num(y + tl);
    if (tl > 0) d += 'A' + num(tl) + ' ' + num(tl) + ' 0 0 1 ' + num(x + tl) + ' ' + num(y);
    return d + 'Z';
  }

  function circle(cx, cy, r) {
    return 'M' + num(cx - r) + ' ' + num(cy) +
      'a' + num(r) + ' ' + num(r) + ' 0 1 0 ' + num(2 * r) + ' 0' +
      'a' + num(r) + ' ' + num(r) + ' 0 1 0 ' + num(-2 * r) + ' 0Z';
  }

  function diamond(x, y, s) {
    return 'M' + num(x + s / 2) + ' ' + num(y) +
      'L' + num(x + s) + ' ' + num(y + s / 2) +
      'L' + num(x + s / 2) + ' ' + num(y + s) +
      'L' + num(x) + ' ' + num(y + s / 2) + 'Z';
  }

  function isFinder(r, c, n) {
    function inside(r0, c0) { return r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7; }
    return inside(0, 0) || inside(0, n - 7) || inside(n - 7, 0);
  }

  /* 按环特征（深/浅/深）定位 5x5 校正图形 */
  function findAlignmentCenters(matrix) {
    var n = matrix.length, out = [];
    for (var r = 2; r < n - 2; r++) {
      for (var c = 2; c < n - 2; c++) {
        if (!matrix[r][c]) continue;
        if (isFinder(r - 2, c - 2, n)) continue;
        var ok = true, dr, dc;
        for (dr = -1; dr <= 1 && ok; dr++) {
          for (dc = -1; dc <= 1 && ok; dc++) {
            if ((dr || dc) && matrix[r + dr][c + dc]) ok = false;
          }
        }
        for (dr = -2; dr <= 2 && ok; dr++) {
          for (dc = -2; dc <= 2 && ok; dc++) {
            var ring = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            if (ring && !matrix[r + dr][c + dc]) ok = false;
          }
        }
        if (ok) out.push([r, c]);
      }
    }
    return out;
  }

  /* 与定位角同视觉语言的 5x5 迷你眼 */
  function miniEye(eye, r0, c0) {
    var cy = r0 + 2.5, cx = c0 + 2.5, ring = '', core = '';
    if (eye === 'circle') {
      ring = circle(cx, cy, 2.5) + circle(cx, cy, 1.5);
      core = circle(cx, cy, 0.5);
    } else if (eye === 'leaf') {
      ring = rr(c0, r0, 5, 5, 0, 2.5, 0, 2.5) + rr(c0 + 1, r0 + 1, 3, 3, 0, 1.5, 0, 1.5);
      core = rr(c0 + 2, r0 + 2, 1, 1, 0, 0.5, 0, 0.5);
    } else if (eye === 'square') {
      ring = rr(c0, r0, 5, 5, 0, 0, 0, 0) + rr(c0 + 1, r0 + 1, 3, 3, 0, 0, 0, 0);
      core = rr(c0 + 2, r0 + 2, 1, 1, 0, 0, 0, 0);
    } else {
      ring = rr(c0, r0, 5, 5, 1.5, 1.5, 1.5, 1.5) + rr(c0 + 1, r0 + 1, 3, 3, 1, 1, 1, 1);
      core = rr(c0 + 2, r0 + 2, 1, 1, 0.34, 0.34, 0.34, 0.34);
    }
    return [{ d: ring, rule: 'evenodd' }, { d: core }];
  }

  function buildBody(matrix, style, eye) {
    var n = matrix.length;
    var draw = matrix.map(function (row, r) {
      return row.map(function (v, c) { return v && !isFinder(r, c, n); });
    });
    function on(r, c) { return r >= 0 && r < n && c >= 0 && c < n && draw[r][c]; }
    var out = [];

    /* 风格化点阵可能让 5x5 校正图形难以识读，这些格子单独画 */
    var solid = {}, covered = {};
    var aligns = (style === 'diamond' || style === 'dot' || style === 'liquid')
      ? findAlignmentCenters(matrix) : [];
    aligns.forEach(function (p) {
      for (var dr = -2; dr <= 2; dr++) {
        for (var dc = -2; dc <= 2; dc++) {
          var key = (p[0] + dr) + ',' + (p[1] + dc);
          covered[key] = true;
          if (style === 'diamond') solid[key] = true;
        }
      }
    });

    if (style === 'line' || style === 'vline') {
      var horizontal = style === 'line';
      for (var a = 0; a < n; a++) {
        var b = 0;
        while (b < n) {
          var value = horizontal ? draw[a][b] : draw[b][a];
          if (!value) { b++; continue; }
          var start = b;
          while (b < n && (horizontal ? draw[a][b] : draw[b][a])) b++;
          var len = b - start;
          var rad = Math.min(0.46, len / 2);
          out.push({
            d: horizontal
              ? rr(start, a + 0.04, len, 0.92, rad, rad, rad, rad)
              : rr(a + 0.04, start, 0.92, len, rad, rad, rad, rad)
          });
        }
      }
      return out;
    }

    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (!draw[r][c]) continue;
        if (style !== 'diamond' && covered[r + ',' + c]) continue;
        switch (style) {
          case 'classic':
            out.push({ d: rr(c, r, 1, 1, 0, 0, 0, 0) }); break;
          case 'rounded':
            out.push({ d: rr(c + 0.015, r + 0.015, 0.97, 0.97, 0.34, 0.34, 0.34, 0.34) }); break;
          case 'dot':
            out.push({ d: circle(c + 0.5, r + 0.5, 0.5) }); break;
          case 'liquid':
            out.push({ d: circle(c + 0.5, r + 0.5, 0.5) });
            if (on(r, c + 1)) out.push({ d: rr(c + 0.5, r + 0.16, 1, 0.68, 0.34, 0.34, 0.34, 0.34) });
            if (on(r + 1, c)) out.push({ d: rr(c + 0.16, r + 0.5, 0.68, 1, 0.34, 0.34, 0.34, 0.34) });
            if (on(r + 1, c + 1) && !on(r, c + 1) && !on(r + 1, c))
              out.push({ d: circle(c + 1, r + 1, 0.24) });
            break;
          case 'diamond':
            out.push(solid[r + ',' + c]
              ? { d: rr(c, r, 1, 1, 0.24, 0.24, 0.24, 0.24) }
              : { d: diamond(c - 0.12, r - 0.12, 1.24) });
            break;
          case 'leaf':
            out.push({ d: rr(c, r, 1, 1, 0, 0.5, 0, 0.5) }); break;
        }
      }
    }

    if (style === 'dot' || style === 'liquid') {
      aligns.forEach(function (p) {
        out.push.apply(out, miniEye(eye, p[0] - 2, p[1] - 2));
      });
    }
    return out;
  }

  function eyeShapes(eye, r0, c0) {
    var outer = { d: '', rule: 'evenodd' }, innerD = '';
    if (eye === 'square') {
      outer.d = rr(c0, r0, 7, 7, 0, 0, 0, 0) + rr(c0 + 1, r0 + 1, 5, 5, 0, 0, 0, 0);
      innerD = rr(c0 + 2, r0 + 2, 3, 3, 0, 0, 0, 0);
    } else if (eye === 'rounded') {
      outer.d = rr(c0, r0, 7, 7, 2, 2, 2, 2) + rr(c0 + 1, r0 + 1, 5, 5, 1.4, 1.4, 1.4, 1.4);
      innerD = rr(c0 + 2, r0 + 2, 3, 3, 0.95, 0.95, 0.95, 0.95);
    } else if (eye === 'circle') {
      outer.d = circle(c0 + 3.5, r0 + 3.5, 3.5) + circle(c0 + 3.5, r0 + 3.5, 2.5);
      innerD = circle(c0 + 3.5, r0 + 3.5, 1.62);
    } else {
      outer.d = rr(c0, r0, 7, 7, 0, 3.5, 0, 3.5) + rr(c0 + 1, r0 + 1, 5, 5, 0, 2.4, 0, 2.4);
      innerD = rr(c0 + 2, r0 + 2, 3, 3, 0, 1.5, 0, 1.5);
    }
    return [outer, { d: innerD }];
  }

  function buildEyes(matrix, eye) {
    var n = matrix.length;
    return [[0, 0], [0, n - 7], [n - 7, 0]].map(function (p) {
      return eyeShapes(eye, p[0], p[1]);
    }).reduce(function (a, b) { return a.concat(b); }, []);
  }

  function renderEyeSvg(eye, color, px) {
    px = px || 56;
    var shapes = eyeShapes(eye, 0, 0);
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px +
      '" viewBox="0 0 7 7" fill="' + color + '">' + shapes.map(function (s) {
        return '<path d="' + s.d + '"' + (s.rule ? ' fill-rule="' + s.rule + '"' : '') + '/>';
      }).join('') + '</svg>';
  }

  function logoBox(n, scale) {
    var size = Math.max(0.001, n * scale);
    var center = n / 2;
    var pad = size * 0.11;
    return { size: size, x: center - size / 2, y: center - size / 2, pad: pad };
  }

  function angleVec(angle) {
    var rad = (angle * Math.PI) / 180;
    return { dx: Math.cos(rad), dy: Math.sin(rad) };
  }

  function shapesOf(matrix, d) {
    return buildBody(matrix, d.style, d.eye).concat(buildEyes(matrix, d.eye));
  }

  function renderSvg(matrix, d, px) {
    var n = matrix.length, m = d.margin;
    var W = n + 2 * m;
    var fill = d.gradient ? 'url(#qs-g)' : d.fg;
    var v = angleVec(d.angle);
    var half = (n * Math.SQRT2) / 2, cx = n / 2, cy = n / 2;
    var parts = [];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + px + '" height="' + px +
      '" viewBox="' + num(-m) + ' ' + num(-m) + ' ' + num(W) + ' ' + num(W) + '" shape-rendering="geometricPrecision">');
    if (d.gradient) {
      parts.push('<defs><linearGradient id="qs-g" gradientUnits="userSpaceOnUse" x1="' + num(cx - v.dx * half) +
        '" y1="' + num(cy - v.dy * half) + '" x2="' + num(cx + v.dx * half) + '" y2="' + num(cy + v.dy * half) +
        '"><stop offset="0" stop-color="' + d.fg + '"/><stop offset="1" stop-color="' + d.fg2 + '"/></linearGradient></defs>');
    }
    if (!d.transparent) {
      parts.push('<rect x="' + num(-m) + '" y="' + num(-m) + '" width="' + num(W) + '" height="' + num(W) + '" fill="' + d.bg + '"/>');
    }
    parts.push('<g fill="' + fill + '">');
    shapesOf(matrix, d).forEach(function (s) {
      parts.push('<path d="' + s.d + '"' + (s.rule ? ' fill-rule="' + s.rule + '"' : '') + '/>');
    });
    parts.push('</g>');
    if (d.logo) {
      var plate = logoBox(n, d.logoScale);
      parts.push('<rect x="' + num(plate.x - plate.pad) + '" y="' + num(plate.y - plate.pad) +
        '" width="' + num(plate.size + plate.pad * 2) + '" height="' + num(plate.size + plate.pad * 2) +
        '" rx="' + num((plate.size + plate.pad * 2) * 0.24) + '" fill="' + (d.transparent ? '#ffffff' : d.bg) + '"/>');
      parts.push('<image href="' + d.logo + '" xlink:href="' + d.logo + '" x="' + num(plate.x) + '" y="' + num(plate.y) +
        '" width="' + num(plate.size) + '" height="' + num(plate.size) + '" preserveAspectRatio="xMidYMid meet"/>');
    }
    parts.push('</svg>');
    return parts.join('');
  }

  function drawQr(ctx, matrix, d, px, logoImage) {
    var n = matrix.length, m = d.margin;
    var W = n + 2 * m;
    var scale = px / W;

    ctx.clearRect(0, 0, px, px);
    if (!d.transparent) {
      ctx.fillStyle = d.bg;
      ctx.fillRect(0, 0, px, px);
    }
    ctx.save();
    ctx.translate(m * scale, m * scale);
    ctx.scale(scale, scale);
    if (d.gradient) {
      var v = angleVec(d.angle);
      var half = (n * Math.SQRT2) / 2;
      var g = ctx.createLinearGradient(n / 2 - v.dx * half, n / 2 - v.dy * half, n / 2 + v.dx * half, n / 2 + v.dy * half);
      g.addColorStop(0, d.fg);
      g.addColorStop(1, d.fg2);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = d.fg;
    }
    shapesOf(matrix, d).forEach(function (s) {
      ctx.fill(new Path2D(s.d), s.rule || 'nonzero');
    });
    if (logoImage && d.logo) {
      var plate = logoBox(n, d.logoScale);
      var boxW = plate.size + plate.pad * 2;
      ctx.fillStyle = d.transparent ? '#ffffff' : d.bg;
      var radius = boxW * 0.24;
      ctx.fill(new Path2D(rr(plate.x - plate.pad, plate.y - plate.pad, boxW, boxW, radius, radius, radius, radius)));
      var ar = logoImage.width / logoImage.height || 1;
      var w = plate.size, h = plate.size;
      if (ar > 1) h = plate.size / ar; else w = plate.size * ar;
      ctx.drawImage(logoImage, plate.x + (plate.size - w) / 2, plate.y + (plate.size - h) / 2, w, h);
    }
    ctx.restore();
  }

  window.QrStyle = {
    makeMatrix: makeMatrix,
    renderSvg: renderSvg,
    drawQr: drawQr,
    renderEyeSvg: renderEyeSvg,
    fits: fits
  };

  /* ================= 编码 ================= */

  function makeMatrix(text, ecc) {
    var qr = qrcode(0, ecc); /* typeNumber 0 = 自动版本 */
    qr.addData(text, 'Byte');
    qr.make();
    var n = qr.getModuleCount(), matrix = [];
    for (var r = 0; r < n; r++) {
      var row = [];
      for (var c = 0; c < n; c++) row.push(qr.isDark(r, c));
      matrix.push(row);
    }
    return matrix;
  }

  function fits(text, ecc) {
    try { makeMatrix(text, ecc); return true; } catch (e) { return false; }
  }

  /* ================= UI ================= */

  var STYLE_IDS = ['classic', 'rounded', 'dot', 'liquid', 'line', 'vline', 'diamond', 'leaf'];
  var STYLE_NAMES = { classic: '经典', rounded: '圆角', dot: '圆点', liquid: '液态', line: '线条', vline: '竖线', diamond: '菱形', leaf: '花瓣' };
  var EYE_IDS = ['square', 'rounded', 'circle', 'leaf'];
  var EYE_NAMES = { square: '方形', rounded: '圆角', circle: '圆形', leaf: '花瓣' };
  var ECC_LEVELS = ['L', 'M', 'Q', 'H'];
  var PALETTES = [
    { fg: '#111111', fg2: '#4b5563', angle: 45, bg: '#ffffff' },
    { fg: '#0f172a', fg2: '#1d4ed8', angle: 40, bg: '#ffffff' },
    { fg: '#3b0764', fg2: '#db2777', angle: 35, bg: '#fff7fb' },
    { fg: '#7c2d12', fg2: '#f59e0b', angle: 30, bg: '#fffbf2' },
    { fg: '#022c22', fg2: '#10b981', angle: 25, bg: '#f5fffb' },
    { fg: '#1e1b4b', fg2: '#6366f1', angle: 55, bg: '#f7f7ff' },
    { fg: '#4a044e', fg2: '#f472b6', angle: 60, bg: '#fff5fa' },
    { fg: '#082f49', fg2: '#0ea5e9', angle: 45, bg: '#f5fbff' }
  ];

  var DEFAULTS = {
    text: 'https://139t.cn/',
    style: 'liquid', eye: 'rounded', ecc: 'M',
    fg: '#111111', fg2: '#5b21b6', gradient: false, angle: 45,
    bg: '#ffffff', transparent: false, margin: 2,
    logo: null, logoScale: 0.22, exportPx: 1024
  };

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    text: $('qs-text'), err: $('qs-err'),
    styleWrap: $('qs-styles'), eyeWrap: $('qs-eyes'),
    ecc: $('qs-ecc'), fg: $('qs-fg'), fg2: $('qs-fg2'),
    gradient: $('qs-gradient'), angle: $('qs-angle'), angleV: $('qs-angle-v'),
    bg: $('qs-bg'), transparent: $('qs-transparent'),
    margin: $('qs-margin'), marginV: $('qs-margin-v'),
    logo: $('qs-logo'), logoClear: $('qs-logo-clear'), logoScale: $('qs-logo-scale'), logoScaleV: $('qs-logo-scale-v'),
    palettes: $('qs-palettes'), random: $('qs-random'),
    exportPx: $('qs-export-px'), png: $('qs-png'), svg: $('qs-svg'),
    canvas: $('qs-canvas'), size: $('qs-size')
  };

  var design = load();
  var logoImage = null;

  function load() {
    try {
      var raw = localStorage.getItem('qrstyle.v1');
      if (raw) {
        var saved = JSON.parse(raw);
        var d = {};
        Object.keys(DEFAULTS).forEach(function (k) { d[k] = (k in saved) ? saved[k] : DEFAULTS[k]; });
        return d;
      }
    } catch (e) { /* ignore */ }
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  function save() {
    try { localStorage.setItem('qrstyle.v1', JSON.stringify(design)); } catch (e) { /* ignore */ }
  }

  function logoname() { return logoImage; }

  function pickers() {
    els.styleWrap.innerHTML = '';
    STYLE_IDS.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt' + (design.style === id ? ' on' : '');
      b.textContent = STYLE_NAMES[id];
      b.addEventListener('click', function () { design.style = id; save(); pickers(); render(); });
      els.styleWrap.appendChild(b);
    });
    els.eyeWrap.innerHTML = '';
    EYE_IDS.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt opt-eye' + (design.eye === id ? ' on' : '');
      b.title = EYE_NAMES[id];
      b.setAttribute('aria-label', '定位点：' + EYE_NAMES[id]);
      b.innerHTML = renderEyeSvg(id, 'currentColor', 26);
      b.addEventListener('click', function () { design.eye = id; save(); pickers(); render(); });
      els.eyeWrap.appendChild(b);
    });
    els.palettes.innerHTML = '';
    PALETTES.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.title = '使用这套配色';
      b.style.background = 'linear-gradient(135deg,' + p.fg + ' 50%,' + p.fg2 + ' 50%)';
      b.setAttribute('aria-label', '配色 ' + p.fg + ' → ' + p.fg2);
      b.addEventListener('click', function () {
        design.fg = p.fg; design.fg2 = p.fg2; design.angle = p.angle; design.bg = p.bg;
        design.gradient = true;
        save(); syncInputs(); render();
      });
      els.palettes.appendChild(b);
    });
  }

  function syncInputs() {
    els.text.value = design.text;
    els.ecc.value = design.ecc;
    els.fg.value = design.fg;
    els.fg2.value = design.fg2;
    els.gradient.checked = design.gradient;
    els.angle.value = design.angle;
    els.angleV.textContent = design.angle + '°';
    els.bg.value = design.bg;
    els.transparent.checked = design.transparent;
    els.margin.value = design.margin;
    els.marginV.textContent = design.margin;
    els.logoScale.value = design.logoScale;
    els.logoScaleV.textContent = Math.round(design.logoScale * 100) + '%';
    els.exportPx.value = String(design.exportPx);
  }

  function render() {
    var text = els.text.value;
    design.text = text;
    if (!text) {
      els.err.hidden = false;
      els.err.textContent = '先输入要编码的文字或链接。';
      els.size.textContent = '';
      var ctx0 = els.canvas.getContext('2d');
      ctx0.clearRect(0, 0, els.canvas.width, els.canvas.height);
      return;
    }
    var ecc = design.logo ? 'H' : els.ecc.value; /* 有标志时强制 H 级容错 */
    design.ecc = els.ecc.value;
    if (!fits(text, ecc)) {
      els.err.hidden = false;
      els.err.textContent = design.logo
        ? '内容太长：内嵌标志需要 H 级容错，装不下这些内容，请缩短文字或换小一点的标志。'
        : '内容太长，当前容错等级装不下，试试缩短文字或换成 L 级。';
      els.size.textContent = '';
      return;
    }
    els.err.hidden = true;
    var matrix = makeMatrix(text, ecc);
    var cssPx = els.canvas.clientWidth || 320;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var px = Math.max(320, Math.round(cssPx * dpr));
    if (els.canvas.width !== px) { els.canvas.width = px; els.canvas.height = px; }
    drawQr(els.canvas.getContext('2d'), matrix, design, px, logoImage);
    els.size.textContent = '矩阵 ' + matrix.length + '×' + matrix.length + ' · 容错 ' + ecc +
      (design.logo ? '（内嵌标志自动用 H）' : '');
  }

  function readFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 512;
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var w = Math.max(1, Math.round(img.width * scale));
        var h = Math.max(1, Math.round(img.height * scale));
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        design.logo = c.toDataURL('image/png');
        logoImage = img;
        save(); render();
        els.logoClear.hidden = false;
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function bind() {
    els.text.addEventListener('input', render);
    els.ecc.addEventListener('change', function () { design.ecc = els.ecc.value; save(); render(); });
    els.fg.addEventListener('input', function () { design.fg = els.fg.value; save(); render(); });
    els.fg2.addEventListener('input', function () { design.fg2 = els.fg2.value; save(); render(); });
    els.gradient.addEventListener('change', function () { design.gradient = els.gradient.checked; save(); render(); });
    els.angle.addEventListener('input', function () {
      design.angle = Number(els.angle.value);
      els.angleV.textContent = design.angle + '°';
      save(); render();
    });
    els.bg.addEventListener('input', function () { design.bg = els.bg.value; save(); render(); });
    els.transparent.addEventListener('change', function () { design.transparent = els.transparent.checked; save(); render(); });
    els.margin.addEventListener('input', function () {
      design.margin = Number(els.margin.value);
      els.marginV.textContent = design.margin;
      save(); render();
    });
    els.logo.addEventListener('change', function () {
      if (els.logo.files && els.logo.files[0]) readFile(els.logo.files[0]);
    });
    els.logoClear.addEventListener('click', function () {
      design.logo = null; logoImage = null;
      els.logo.value = '';
      els.logoClear.hidden = true;
      save(); render();
    });
    els.logoScale.addEventListener('input', function () {
      design.logoScale = Number(els.logoScale.value);
      els.logoScaleV.textContent = Math.round(design.logoScale * 100) + '%';
      save(); render();
    });
    els.random.addEventListener('click', function () {
      var p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      design.style = STYLE_IDS[Math.floor(Math.random() * STYLE_IDS.length)];
      design.eye = EYE_IDS[Math.floor(Math.random() * EYE_IDS.length)];
      design.fg = p.fg; design.fg2 = p.fg2; design.angle = p.angle; design.bg = p.bg;
      design.gradient = Math.random() > 0.35;
      save(); pickers(); syncInputs(); render();
    });
    els.exportPx.addEventListener('change', function () { design.exportPx = Number(els.exportPx.value); save(); });
    els.png.addEventListener('click', function () {
      var matrix = makeMatrix(design.text, design.logo ? 'H' : design.ecc);
      var px = design.exportPx || 1024;
      var c = document.createElement('canvas');
      c.width = px; c.height = px;
      drawQr(c.getContext('2d'), matrix, design, px, logoImage);
      c.toBlob(function (b) { download(b, 'qr-' + px + '.png'); }, 'image/png');
    });
    els.svg.addEventListener('click', function () {
      var matrix = makeMatrix(design.text, design.logo ? 'H' : design.ecc);
      var svg = renderSvg(matrix, design, 1024);
      download(new Blob([svg], { type: 'image/svg+xml' }), 'qr.svg');
    });
    window.addEventListener('resize', render);
  }

  window.addEventListener('DOMContentLoaded', function () {
    pickers();
    syncInputs();
    bind();
    if (design.logo) {
      var img = new Image();
      img.onload = function () { logoImage = img; els.logoClear.hidden = false; render(); };
      img.src = design.logo;
    } else {
      els.logoClear.hidden = true;
    }
    render();
  });
})();
