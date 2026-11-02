/* 收款码拼接 — 读取图片、裁白边、排版合成、导出与打印。零依赖。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var els = {
    fileW: $('pq-file-w'), fileA: $('pq-file-a'),
    prevW: $('pq-prev-w'), prevA: $('pq-prev-a'),
    hintW: $('pq-hint-w'), hintA: $('pq-hint-a'),
    nameW: $('pq-name-w'), nameA: $('pq-name-a'),
    slotW: $('pq-slot-w'), slotA: $('pq-slot-a'),
    layout: $('pq-layout'), size: $('pq-size'), bg: $('pq-bg'),
    labels: $('pq-labels'), divider: $('pq-divider'),
    trim: $('pq-trim'), round: $('pq-round'), title: $('pq-title'),
    download: $('pq-download'), print: $('pq-print'), reset: $('pq-reset'),
    status: $('pq-status'), canvas: $('pq-canvas'),
    printArea: $('pq-print-area')
  };

  var imgs = { w: null, a: null };

  function setStatus(msg) { els.status.textContent = msg || ''; }

  /* ---------- 读图 ---------- */

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* 把四周接近白色的边裁掉，让两张码在版面里大小一致 */
  function trimImage(img) {
    var scale = Math.min(1, 720 / Math.max(img.naturalWidth, img.naturalHeight));
    var w = Math.max(1, Math.round(img.naturalWidth * scale));
    var h = Math.max(1, Math.round(img.naturalHeight * scale));
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, h);
    var data;
    try {
      data = g.getImageData(0, 0, w, h).data;
    } catch (e) {
      return img;
    }
    var minX = w, minY = h, maxX = -1, maxY = -1;
    var T = 244;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var a = data[i + 3];
        if (a < 12) continue;                       // 透明算背景
        var r = data[i], gg = data[i + 1], b = data[i + 2];
        if (r > T && gg > T && b > T) continue;      // 近白算背景
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < minX || maxY < minY) return img;      // 整张几乎纯白，原样返回
    var pad = Math.round(Math.min(w, h) * 0.012);
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
    var out = document.createElement('canvas');
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    out.getContext('2d').drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  function attach(file, which) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setStatus('请选择图片文件（jpg / png）。');
      return;
    }
    readFile(file).then(function (img) {
      imgs[which] = { img: img, trimmed: els.trim.checked ? trimImage(img) : img };
      var prev = which === 'w' ? els.prevW : els.prevA;
      var hint = which === 'w' ? els.hintW : els.hintA;
      var name = which === 'w' ? els.nameW : els.nameA;
      var slot = which === 'w' ? els.slotW : els.slotA;
      prev.src = img.src;
      prev.hidden = false;
      hint.hidden = true;
      name.textContent = file.name || '';
      slot.classList.add('has-img');
      draw();
    }).catch(function () {
      setStatus('这张图打不开，换一张试试。');
    });
  }

  /* ---------- 排版 ---------- */

  function roundRect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function fontStack(size) {
    return '600 ' + Math.round(size) + 'px system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
  }

  function draw() {
    var W = Number(els.size.value) || 1600;
    var layout = els.layout.value;
    var bg = els.bg.value;
    var round = els.round.checked;
    var showLabels = els.labels.checked;
    var showDivider = els.divider.checked;
    var title = els.title.value.trim();

    var margin = W * 0.055;
    var gap = W * 0.035;
    var cardPad = W * 0.022;
    var q = layout === 'v' ? W * 0.56 : W * 0.34;
    var labelH = showLabels ? W * 0.045 : 0;
    var cardW = q + cardPad * 2;
    var cardH = q + cardPad * 2 + labelH;
    var titleH = title ? W * 0.075 : 0;
    var dividerH = showDivider ? W * 0.012 : 0;

    var H;
    if (layout === 'v') H = margin * 2 + titleH + cardH * 2 + gap + dividerH;
    else H = margin * 2 + titleH + cardH;

    var cv = els.canvas;
    cv.width = Math.round(W);
    cv.height = Math.round(H);
    var g = cv.getContext('2d');

    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    if (title) {
      g.fillStyle = '#3a424d';
      g.font = fontStack(W * 0.036);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(title, W / 2, margin + titleH * 0.4, W - margin * 2);
    }

    var positions;
    if (layout === 'v') {
      var top = margin + titleH;
      positions = [
        { x: (W - cardW) / 2, y: top, which: 'w' },
        { x: (W - cardW) / 2, y: top + cardH + gap + dividerH, which: 'a' }
      ];
    } else {
      var left = (W - cardW * 2 - gap) / 2;
      var y0 = margin + titleH;
      positions = [
        { x: left, y: y0, which: 'w' },
        { x: left + cardW + gap, y: y0, which: 'a' }
      ];
    }

    positions.forEach(function (pos) {
      var item = imgs[pos.which];

      g.save();
      if (round) {
        roundRect(g, pos.x, pos.y, cardW, cardH, W * 0.018);
        g.fillStyle = '#ffffff';
        g.fill();
        g.strokeStyle = 'rgba(60,72,88,0.14)';
        g.lineWidth = Math.max(1, W * 0.0012);
        g.stroke();
      } else {
        g.fillStyle = '#ffffff';
        g.fillRect(pos.x, pos.y, cardW, cardH);
        g.strokeStyle = 'rgba(60,72,88,0.18)';
        g.lineWidth = Math.max(1, W * 0.0012);
        g.strokeRect(pos.x, pos.y, cardW, cardH);
      }

      var qx = pos.x + cardPad;
      var qy = pos.y + cardPad;

      if (item) {
        var src = item.trimmed;
        var sw = src.width || src.naturalWidth;
        var sh = src.height || src.naturalHeight;
        var side = Math.min(sw, sh);
        var sx = (sw - side) / 2;
        var sy = (sh - side) / 2;
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(src, sx, sy, side, side, qx, qy, q, q);
      } else {
        g.fillStyle = '#eef1f5';
        g.fillRect(qx, qy, q, q);
        g.fillStyle = '#8c96a3';
        g.font = fontStack(W * 0.022);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(pos.which === 'w' ? '待加入微信收款码' : '待加入支付宝收款码', qx + q / 2, qy + q / 2);
      }

      if (showLabels) {
        g.fillStyle = pos.which === 'w' ? '#07a04f' : '#1677ff';
        g.font = fontStack(W * 0.028);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(pos.which === 'w' ? '微信支付' : '支付宝', pos.x + cardW / 2, qy + q + cardPad + labelH * 0.55);
      }
      g.restore();
    });

    if (layout === 'v' && showDivider) {
      var dy = margin + titleH + cardH + gap / 2 + dividerH / 2;
      g.strokeStyle = 'rgba(60,72,88,0.18)';
      g.lineWidth = Math.max(1, W * 0.0012);
      g.setLineDash([W * 0.012, W * 0.01]);
      g.beginPath();
      g.moveTo(margin * 1.6, dy);
      g.lineTo(W - margin * 1.6, dy);
      g.stroke();
      g.setLineDash([]);
    }

    var ready = !!(imgs.w || imgs.a);
    els.download.disabled = !ready;
    els.print.disabled = !ready;
    if (imgs.w && imgs.a) setStatus('已生成，尺寸 ' + cv.width + ' × ' + cv.height + ' 像素，可直接下载或打印。');
    else if (ready) setStatus('还差一张就齐了，先把另一张收款码加进来。');
  }

  /* ---------- 下载 / 打印 ---------- */

  function fileName() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return '收款码拼接-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '.png';
  }

  els.download.addEventListener('click', function () {
    els.canvas.toBlob(function (blob) {
      if (!blob) { setStatus('导出失败，换个浏览器试试。'); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      setStatus('已下载 ' + a.download + '（' + (blob.size / 1024 / 1024).toFixed(2) + ' MB）。');
    }, 'image/png');
  });

  els.print.addEventListener('click', function () {
    var url = els.canvas.toDataURL('image/png');
    els.printArea.replaceChildren();
    var img = new Image();
    img.src = url;
    els.printArea.appendChild(img);
    document.body.classList.add('pq-printing');
    var done = function () {
      document.body.classList.remove('pq-printing');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); }, 60);
  });

  els.reset.addEventListener('click', function () {
    imgs.w = null; imgs.a = null;
    [els.fileW, els.fileA].forEach(function (f) { f.value = ''; });
    [els.slotW, els.slotA].forEach(function (s) { s.classList.remove('has-img'); });
    [els.prevW, els.prevA].forEach(function (p) { p.hidden = true; p.removeAttribute('src'); });
    [els.hintW, els.hintA].forEach(function (h) { h.hidden = false; });
    els.nameW.textContent = '';
    els.nameA.textContent = '';
    draw();
    setStatus('已清空，重新选两张收款码即可。');
  });

  /* ---------- 事件 ---------- */

  els.fileW.addEventListener('change', function () { if (els.fileW.files[0]) attach(els.fileW.files[0], 'w'); });
  els.fileA.addEventListener('change', function () { if (els.fileA.files[0]) attach(els.fileA.files[0], 'a'); });

  [els.slotW, els.slotA].forEach(function (slot) {
    slot.addEventListener('dragover', function (e) { e.preventDefault(); });
    slot.addEventListener('drop', function (e) {
      e.preventDefault();
      var which = slot === els.slotW ? 'w' : 'a';
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) attach(f, which);
    });
  });

  ['layout', 'size', 'bg', 'labels', 'divider', 'round'].forEach(function (id) {
    els[id].addEventListener('change', draw);
  });

  els.title.addEventListener('input', draw);
  els.title.addEventListener('change', draw);

  // 切换「自动裁白边」时重算当前已加载的两张图
  els.trim.addEventListener('change', function () {
    ['w', 'a'].forEach(function (k) {
      if (!imgs[k]) return;
      imgs[k].trimmed = els.trim.checked ? trimImage(imgs[k].img) : imgs[k].img;
    });
    draw();
  });

  draw();
})();
