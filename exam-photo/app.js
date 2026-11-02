/* 报名证件照处理 — 选区裁剪、按规格缩放、KB 压缩导出。零依赖。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var img = $('ep-img');
  var cropBox = $('ep-crop');
  var sel = $('ep-sel');

  var spec = { w: 480, h: 640, kb: 40 };
  var natural = null;      // img.naturalWidth/Height
  var selRect = null;      // 相对 img 显示区域的比例选区 {x,y,w,h}，0..1

  /* ── 规格输入 ───────────────────────────────────────────── */
  function readSpec() {
    var w = Math.round(Number($('ep-w').value));
    var h = Math.round(Number($('ep-h').value));
    var kb = Math.round(Number($('ep-kb').value));
    spec.w = clamp(isNaN(w) ? 480 : w, 20, 5000);
    spec.h = clamp(isNaN(h) ? 640 : h, 20, 5000);
    spec.kb = clamp(isNaN(kb) ? 40 : kb, 5, 2048);
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  $('ep-preset').addEventListener('change', function () {
    if (!this.value) return;
    var p = this.value.split('x');
    $('ep-w').value = p[0];
    $('ep-h').value = p[1];
    readSpec();
    layoutSelection();
  });
  ['ep-w', 'ep-h'].forEach(function (id) {
    $(id).addEventListener('change', function () { readSpec(); layoutSelection(); });
  });
  $('ep-kb').addEventListener('change', readSpec);

  /* ── 载入图片 ───────────────────────────────────────────── */
  function loadFile(file) {
    var url = URL.createObjectURL(file);
    var probe = new Image();
    probe.onload = function () {
      natural = { w: probe.naturalWidth, h: probe.naturalHeight };
      img.src = url;
      img.onload = function () {
        cropBox.hidden = false;
        $('ep-upload').hidden = true;
        $('ep-redo-file').hidden = false;
        $('ep-gen').disabled = false;
        layoutSelection();
      };
    };
    probe.onerror = function () { window.alert('图片读取失败，换一张试试。'); };
    probe.src = url;
  }

  $('ep-file').addEventListener('change', function () {
    if (this.files[0]) loadFile(this.files[0]);
    this.value = '';
  });
  $('ep-redo-file').addEventListener('click', function () { $('ep-file').click(); });
  $('ep-upload').addEventListener('click', function () { $('ep-file').click(); });

  /* ── 选区（比例坐标）────────────────────────────────────── */
  function layoutSelection() {
    readSpec();
    if (!img.naturalWidth) return;
    if (!selRect) {
      // 默认居中，宽取高度按比例
      var ar = spec.w / spec.h;
      var h0 = 0.72, w0 = h0 * ar;
      if (w0 > 0.9) { w0 = 0.9; h0 = w0 / ar; }
      selRect = { x: (1 - w0) / 2, y: (1 - h0) / 2, w: w0, h: h0 };
    } else {
      // 保持选区高度，宽度按新比例
      var ar2 = spec.w / spec.h;
      var cy = selRect.y + selRect.h / 2;
      var h1 = selRect.h, w1 = h1 * ar2;
      if (w1 > 1) { w1 = 1; h1 = w1 / ar2; }
      selRect = { x: clamp((selRect.x + selRect.w / 2) - w1 / 2, 0, 1 - w1), y: clamp(cy - h1 / 2, 0, 1 - h1), w: w1, h: h1 };
    }
    paintSelection();
  }

  function paintSelection() {
    var r = img.getBoundingClientRect();
    var box = cropBox.getBoundingClientRect();
    // img 以 object-fit:contain 呈现，计算实际绘制区域
    var scale = Math.min(r.width / natural.w, r.height / natural.h, 1);
    var dw = natural.w * scale, dh = natural.h * scale;
    var ox = (box.width - dw) / 2, oy = (box.height - dh) / 2;
    sel.style.left = (ox + selRect.x * dw) + 'px';
    sel.style.top = (oy + selRect.y * dh) + 'px';
    sel.style.width = (selRect.w * dw) + 'px';
    sel.style.height = (selRect.h * dh) + 'px';
  }

  window.addEventListener('resize', function () { if (selRect) paintSelection(); });

  // 拖动：移动 / 四角缩放（保持比例）
  var drag = null;
  sel.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var h = e.target.dataset ? e.target.dataset.h : null;
    drag = { handle: h || 'move', start: { x: e.clientX, y: e.clientY }, orig: Object.assign({}, selRect) };
    sel.setPointerCapture(e.pointerId);
  });
  sel.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var box = cropBox.getBoundingClientRect();
    var r = img.getBoundingClientRect();
    var scale = Math.min(r.width / natural.w, r.height / natural.h, 1);
    var dw = natural.w * scale, dh = natural.h * scale;
    var ox = (box.width - dw) / 2, oy = (box.height - dh) / 2;

    var dx = (e.clientX - drag.start.x) / dw;
    var dy = (e.clientY - drag.start.y) / dh;
    var o = drag.orig;
    var ar = spec.w / spec.h;

    if (drag.handle === 'move') {
      selRect.x = clamp(o.x + dx, 0, 1 - o.w);
      selRect.y = clamp(o.y + dy, 0, 1 - o.h);
    } else {
      // 角点缩放：以对角为锚，保持宽高比
      var anchorX = (drag.handle === 'nw' || drag.handle === 'sw') ? o.x + o.w : o.x;
      var anchorY = (drag.handle === 'nw' || drag.handle === 'ne') ? o.y + o.h : o.y;
      var cornerX = (drag.handle === 'nw' || drag.handle === 'sw') ? o.x : o.x + o.w;
      var cornerY = (drag.handle === 'nw' || drag.handle === 'ne') ? o.y : o.y + o.h;
      var nx = clamp(cornerX + dx, 0, 1);
      var ny = clamp(cornerY + dy, 0, 1);
      var w2 = Math.abs(nx - anchorX), h2 = Math.abs(ny - anchorY);
      var hh = Math.min(h2, w2 / ar);
      if (hh < 0.08) hh = 0.08;
      var ww = hh * ar;
      if (ww > 1) { ww = 1; hh = ww / ar; }
      var x2 = anchorX + (cornerX >= anchorX ? ww : -ww);
      var y2 = anchorY + (cornerY >= anchorY ? hh : -hh);
      selRect = {
        x: clamp(Math.min(anchorX, x2), 0, 1 - ww),
        y: clamp(Math.min(anchorY, y2), 0, 1 - hh),
        w: ww, h: hh
      };
    }
    paintSelection();
  });
  function endDrag() { drag = null; }
  sel.addEventListener('pointerup', endDrag);
  sel.addEventListener('pointercancel', endDrag);

  /* ── 生成：裁剪 + 缩放 + KB 压缩 ────────────────────────── */
  function renderOutput(quality) {
    var out = document.createElement('canvas');
    out.width = spec.w; out.height = spec.h;
    var c = out.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, spec.w, spec.h);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    var sx = selRect.x * natural.w, sy = selRect.y * natural.h;
    var sw = selRect.w * natural.w, sh = selRect.h * natural.h;
    c.drawImage(img, sx, sy, sw, sh, 0, 0, spec.w, spec.h);
    return out;
  }

  function generate() {
    if (!natural || !selRect) return;
    readSpec();
    var canvas = renderOutput(1);
    // 二分 JPEG 质量压到 KB 上限内
    var lo = 0.3, hi = 0.95, best = null, bestQ = lo;
    var maxBytes = spec.kb * 1024;
    for (var i = 0; i < 9; i++) {
      var q = (lo + hi) / 2;
      var dataUrl = canvas.toDataURL('image/jpeg', q);
      var bytes = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);
      if (bytes <= maxBytes) { best = dataUrl; bestQ = q; lo = q; }
      else hi = q;
    }
    if (!best) { best = canvas.toDataURL('image/jpeg', 0.3); bestQ = 0.3; }
    var finalBytes = Math.round((best.length - 'data:image/jpeg;base64,'.length) * 3 / 4);

    $('ep-out').src = best;
    var dl = $('ep-dl');
    dl.href = best;
    dl.setAttribute('download', '报名证件照-' + spec.w + 'x' + spec.h + '.jpg');
    var actualKB = (finalBytes / 1024).toFixed(1);
    $('ep-meta').textContent = spec.w + '×' + spec.h + ' px · ' + actualKB + ' KB（上限 ' + spec.kb + ' KB，质量 ' + bestQ.toFixed(2) + '）· JPG';
    $('ep-result').hidden = false;
    $('ep-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  $('ep-gen').addEventListener('click', generate);

  /* ── 测试钩子（?test=1）────────────────────────────────── */
  if (location.search.indexOf('test=1') >= 0) runTests();

  function runTests() {
    window.EP = { state: function () { return { sel: selRect, spec: spec, natural: natural }; } };
    var out = [];
    var T = function (name, fn) {
      try { fn(); out.push(name + ': PASS'); }
      catch (e) { out.push(name + ': FAIL ' + e.message); }
    };
    var assert = function (c, m) { if (!c) throw new Error(m || 'assert'); };

    // 合成一张「证件照」：渐变背景 + 圆头，480x640 显示
    var testCanvas = document.createElement('canvas');
    testCanvas.width = 1200; testCanvas.height = 900;
    var tc = testCanvas.getContext('2d');
    var g = tc.createLinearGradient(0, 0, 0, 900);
    g.addColorStop(0, '#dbe7f5'); g.addColorStop(1, '#b9cfe8');
    tc.fillStyle = g; tc.fillRect(0, 0, 1200, 900);
    tc.fillStyle = '#8a6f5c';
    tc.beginPath(); tc.arc(600, 380, 130, 0, Math.PI * 2); tc.fill();
    tc.fillRect(460, 500, 280, 400);

    T('规格读取与夹取', function () {
      $('ep-w').value = '99999'; $('ep-h').value = '0';
      readSpec();
      assert(spec.w === 5000 && spec.h === 20, '应夹取到 5000/20: ' + spec.w + '/' + spec.h);
      $('ep-w').value = '480'; $('ep-h').value = '640';
      readSpec();
      assert(spec.w === 480 && spec.h === 640, '应恢复 480/640');
    });

    T('选区比例与宽高比', function () {
      // 直接注入合成图
      natural = { w: 1200, h: 900 };
      img.src = testCanvas.toDataURL();
      img.onload = function () {
        cropBox.hidden = false;
        layoutSelection();
        var ar = selRect.w / selRect.h;
        var expect = spec.w / spec.h;
        assert(Math.abs(ar - expect) < 0.02, '选区比例应≈0.75: ' + ar.toFixed(3));
        assert(selRect.x >= 0 && selRect.y >= 0 && selRect.x + selRect.w <= 1.001 && selRect.y + selRect.h <= 1.001, '选区应在图内');
        out.push('__CONTINUE__');
      };
    });

    // 后面的测试在 onload 之后继续（用轮询标记）
    var poll = setInterval(function () {
      if (!out.length || out[out.length - 1] !== '__CONTINUE__') return;
      clearInterval(poll);
      out.pop();

      T('生成成品：尺寸与 KB', function () {
        generate();
        var outImg = $('ep-out');
        assert(outImg.src.indexOf('data:image/jpeg') === 0, '输出应为 JPEG dataURL');
        assert(!$('ep-result').hidden, '结果区应显示');
        var meta = $('ep-meta').textContent;
        var kbMatch = meta.match(/([\d.]+) KB/);
        assert(kbMatch && Number(kbMatch[1]) <= spec.kb, '体积应≤上限: ' + meta);
        // 校验实际像素
        var probe = new Image();
        probe.onload = function () {
          try {
            assert(probe.naturalWidth === spec.w && probe.naturalHeight === spec.h, '成品像素应 ' + spec.w + 'x' + spec.h + '，实际 ' + probe.naturalWidth + 'x' + probe.naturalHeight);
            finish();
          } catch (e) { out.push('成品像素校验: FAIL ' + e.message); finish(); }
        };
        probe.src = outImg.src;
      });

      var finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        var pass = out.filter(function (s) { return s.indexOf('PASS') >= 0; }).length;
        var pre = document.createElement('pre');
        pre.id = 'r';
        pre.textContent = out.join('\n') + '\nRESULTS: ' + pass + '/' + out.length + ' PASS';
        document.body.appendChild(pre);
      }
      setTimeout(finish, 3000);
    }, 200);
  }
})();
