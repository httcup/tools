/* 收款码二合一 — 解码两张收款码、物理合并、本地自检、导出。零依赖，复用站内 QR 编解码模块。 */
import { scan } from '../qr-barcode-reader/src/scan.js';
import { makeQr } from '../qr-barcode-reader/src/shared/qr.js';

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var QUIET = 4; // 静区（模块数）

  var els = {
    fileWx: $('p2-file-wx'), fileAli: $('p2-file-ali'),
    textWx: $('p2-text-wx'), textAli: $('p2-text-ali'),
    warn: $('p2-warn'),
    ratio: $('p2-ratio'), ratioOut: $('p2-ratio-out'),
    size: $('p2-size'),
    gen: $('p2-gen'),
    result: $('p2-result'), canvas: $('p2-canvas'),
    check: $('p2-check'), checkWx: $('p2-check-wx'), checkAli: $('p2-check-ali'),
    dl: $('p2-dl'), note: $('p2-note')
  };

  /* ── 上传识别 ───────────────────────────────────────────── */
  function wireSlot(fileInput, textInput) {
    fileInput.addEventListener('change', async function () {
      var file = this.files[0];
      if (!file) return;
      this.value = '';
      try {
        var text = await scanImageFile(file);
        if (!text) {
          setWarn('有一张码没识别出来，换个更清晰的截图试试，或手动粘贴码内容。');
          return;
        }
        textInput.value = text;
        validate();
      } catch (e) {
        setWarn('识别失败：' + e.message);
      }
    });
  }
  wireSlot(els.fileWx, els.textWx);
  wireSlot(els.fileAli, els.textAli);

  function scanImageFile(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = async function () {
        try {
          var c = document.createElement('canvas');
          var scale = Math.min(1.5, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
          c.width = Math.round(img.naturalWidth * scale);
          c.height = Math.round(img.naturalHeight * scale);
          var ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, c.width, c.height);
          var data = ctx.getImageData(0, 0, c.width, c.height);
          var found = scan(data, { thorough: true });
          URL.revokeObjectURL(url);
          resolve(found ? found.text : null);
        } catch (e) { reject(e); }
      };
      img.onerror = function () { reject(new Error('图片读取失败')); };
      img.src = url;
    });
  }

  function setWarn(msg) {
    els.warn.textContent = msg;
    els.warn.hidden = !msg;
  }

  function looksAlipay(t) {
    return /qr\.alipay\.com|alipays:\/\//i.test(t || '');
  }
  function looksWechat(t) {
    return /^wxp:\/\//i.test(t || '') || /weixin/i.test(t || '');
  }

  function validate() {
    var wx = els.textWx.value.trim();
    var ali = els.textAli.value.trim();
    var msgs = [];
    if (wx && looksAlipay(wx) && !looksWechat(wx)) msgs.push('「微信码内容」看起来像支付宝链接，两张码是不是填反了？');
    if (ali && !looksAlipay(ali)) msgs.push('「支付宝码内容」不像支付宝收款码链接（一般含 qr.alipay.com）。');
    setWarn(msgs.join('；'));
    els.gen.disabled = !(wx && ali);
  }
  els.textWx.addEventListener('input', validate);
  els.textAli.addEventListener('input', validate);

  /* ── 符号渲染 ───────────────────────────────────────────── */
  function renderSymbol(sym, modulePx) {
    var total = (sym.size + QUIET * 2) * modulePx;
    var c = document.createElement('canvas');
    c.width = total; c.height = total;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, total, total);
    ctx.fillStyle = '#000000';
    for (var r = 0; r < sym.size; r++) {
      for (var col = 0; col < sym.size; col++) {
        if (sym.modules[r * sym.size + col]) {
          ctx.fillRect((QUIET + col) * modulePx, (QUIET + r) * modulePx, modulePx, modulePx);
        }
      }
    }
    return c;
  }

  /* ── 物理合并 ───────────────────────────────────────────── */
  function compose(wxText, aliText, ratio, exportSize) {
    var wxSym = makeQr(wxText, { level: 'H' });
    var aliSym = makeQr(aliText, { level: 'H' });

    var modulePx = Math.max(2, Math.round(exportSize / ((wxSym.size + QUIET * 2) * 2)) * 2 / 2);
    // 保证总宽约等于 exportSize
    modulePx = exportSize / (wxSym.size + QUIET * 2);

    var base = renderSymbol(wxSym, modulePx);
    var bctx = base.getContext('2d');

    // 支付宝码：旋转 180°（不做去角——实测擦除对齐图案区会让多数解码器失效，
    // 而 180° 旋转本身已让定位角朝向与微信码错开，足以被单独检出）
    var aliCanvas = renderSymbol(aliSym, modulePx);
    var rotated = document.createElement('canvas');
    rotated.width = aliCanvas.width; rotated.height = aliCanvas.height;
    var rctx = rotated.getContext('2d');
    rctx.translate(rotated.width, rotated.height);
    rctx.rotate(Math.PI);
    rctx.drawImage(aliCanvas, 0, 0);

    // 融合到微信码右下角（覆盖其右下区域，H 级纠错恢复）
    var fragPx = Math.round(base.width * ratio / 100);
    var x = base.width - QUIET * modulePx - fragPx;
    var y = base.height - QUIET * modulePx - fragPx;
    bctx.drawImage(rotated, x, y, fragPx, fragPx);

    return { canvas: base, fragRect: { x: x, y: y, w: fragPx, h: fragPx }, modulePx: modulePx };
  }

  /* ── 本地自检 ───────────────────────────────────────────── */
  async function scanRegion(canvas, x, y, w, h, margin) {
    margin = (margin === undefined) ? 8 : margin;
    var cx = Math.max(0, Math.round(x - margin));
    var cy = Math.max(0, Math.round(y - margin));
    var cw = Math.min(canvas.width - cx, Math.round(w + margin * 2));
    var ch = Math.min(canvas.height - cy, Math.round(h + margin * 2));
    var c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
    var data = ctx.getImageData(0, 0, cw, ch);
    var found = scan(data, { thorough: true });
    return found ? found.text : null;
  }

  function badge(el, ok, text) {
    el.classList.remove('ok', 'bad');
    el.classList.add(ok ? 'ok' : 'bad');
    el.textContent = text;
  }

  async function generate() {
    var wx = els.textWx.value.trim();
    var ali = els.textAli.value.trim();
    if (!wx || !ali) return;
    var ratio = Number(els.ratio.value);
    var size = Number(els.size.value);

    compose.lastModulePx = null;
    var out = compose(wx, ali, ratio, size);
    compose.lastModulePx = out.modulePx;

    var ctx = out.canvas.getContext('2d', { willReadFrequently: true });
    els.canvas.width = out.canvas.width;
    els.canvas.height = out.canvas.height;
    els.canvas.getContext('2d').drawImage(out.canvas, 0, 0);

    els.result.hidden = false;
    els.check.hidden = false;
    badge(els.checkWx, false, '微信自检中…');
    badge(els.checkAli, false, '支付宝自检中…');

    // 微信检查：先整图扫描（微信 App 场景）
    var whole = scan(ctx.getImageData(0, 0, out.canvas.width, out.canvas.height), { thorough: true });
    var wholeText = whole ? whole.text : null;
    var wxOk = wholeText === wx;
    if (wxOk) {
      badge(els.checkWx, true, '微信 ✓（整图直解）');
    } else {
      // 把融合区涂白再整图扫描：验证三个定位角完好、覆盖区在 H 级纠错范围内
      var blanked = document.createElement('canvas');
      blanked.width = out.canvas.width; blanked.height = out.canvas.height;
      var bctx = blanked.getContext('2d', { willReadFrequently: true });
      bctx.drawImage(out.canvas, 0, 0);
      bctx.fillStyle = '#ffffff';
      bctx.fillRect(out.fragRect.x, out.fragRect.y, out.fragRect.w, out.fragRect.h);
      var blankData = bctx.getImageData(0, 0, blanked.width, blanked.height);
      var blankText0 = scan(blankData, { thorough: true });
      var blankText = blankText0 ? blankText0.text : null;
      wxOk = blankText === wx;
      badge(els.checkWx, wxOk, wxOk ? '微信 ✓（覆盖区可纠错恢复）' : '微信 ✗ 覆盖超限，调低比例重试');
      if (wholeText === ali && wxOk) {
        els.note.textContent = '本地解码器整图先解出了支付宝码——真实微信会优先识别左上/右上/左下三个定位角，通常无碍，但仍请以真机验收为准。';
      }
    }

    // 支付宝检查：右下融合区单独解
    var aliText = await scanRegion(out.canvas, out.fragRect.x, out.fragRect.y, out.fragRect.w, out.fragRect.h, 8);
    badge(els.checkAli, aliText === ali, aliText === ali ? '支付宝 ✓' : '支付宝 ✗ 没解出，调高比例重试');

    if (els.note.textContent.indexOf('本地解码器') < 0) {
      els.note.textContent = '生成尺寸 ' + out.canvas.width + '×' + out.canvas.height +
        '。自检只代表本地识别器，上线前务必用微信、支付宝真机各扫一遍。';
    }
  }

  els.gen.addEventListener('click', generate);
  els.ratio.addEventListener('input', function () { els.ratioOut.textContent = this.value + '%'; });

  els.dl.addEventListener('click', function () {
    var a = document.createElement('a');
    a.download = '收款码二合一-' + els.size.value + 'px.png';
    a.href = els.canvas.toDataURL('image/png');
    a.click();
  });

  /* ── 测试钩子（?test=1）────────────────────────────────── */
  if (location.search.indexOf('test=1') >= 0) runTests();

  function runTests() {
    window.P2 = { compose: compose, scan: scan, makeQr: makeQr };
    var out = [];
    var assert = function (c, m) { if (!c) throw new Error(m || 'assert'); };
    var WX = 'wxp://f2f0t8example-wxpay-link-for-test';
    var ALI = 'https://qr.alipay.com/test-alipay-link-123456';

    var tests = [
      ['H 级编码可用', function () {
        var sym = makeQr(WX, { level: 'H' });
        assert(sym.size >= 21 && sym.size <= 177, '版本尺寸应在范围内: ' + sym.size);
        var dark = 0;
        for (var i = 0; i < sym.modules.length; i++) dark += sym.modules[i];
        assert(dark > sym.size * sym.size * 0.2, '暗模块占比应合理: ' + dark);
      }],
      ['合并输出与融合区', function () {
        var r = compose(WX, ALI, 36, 600);
        assert(r.canvas.width >= 590 && r.canvas.width <= 700, '输出约 600px: ' + r.canvas.width);
        var f = r.fragRect;
        assert(f.w > 100, '融合区应可观: ' + f.w);
        assert(f.x + f.w <= r.canvas.width - 8, '融合区不应越过静区');
        window.__frag = f; window.__canvas = r.canvas;
      }],
      ['整图能解出一个码', function () {
        var c = window.__canvas;
        var ctx = c.getContext('2d', { willReadFrequently: true });
        var data = ctx.getImageData(0, 0, c.width, c.height);
        var found = scan(data, { thorough: true });
        assert(found, '整图应至少解出一个码');
        window.__wholeText = found.text;
        assert(found.text === WX || found.text === ALI, '解出内容应为其一: ' + found.text);
      }],
      ['融合区能解出支付宝码', async function () {
        var f = window.__frag;
        var text = await scanRegion(window.__canvas, f.x, f.y, f.w, f.h, 8);
        assert(text === ALI, '融合区应解出支付宝码: ' + text);
      }],
      ['主码覆盖区可纠错恢复（涂白后整图解出微信码）', async function () {
        var f = window.__frag;
        var c = window.__canvas;
        var blanked = document.createElement('canvas');
        blanked.width = c.width; blanked.height = c.height;
        var bctx = blanked.getContext('2d', { willReadFrequently: true });
        bctx.drawImage(c, 0, 0);
        bctx.fillStyle = '#fff';
        bctx.fillRect(f.x, f.y, f.w, f.h);
        var found = scan(bctx.getImageData(0, 0, blanked.width, blanked.height), { thorough: true });
        assert(found && found.text === WX, '涂白融合区后应解出微信码: ' + (found ? found.text : 'null'));
      }],
      ['比例影响融合区大小', function () {
        var small = compose(WX, ALI, 30, 600);
        var big = compose(WX, ALI, 44, 600);
        assert(big.fragRect.w > small.fragRect.w, '44% 融合区应大于 30%');
      }]
    ];

    (async function () {
      for (var i = 0; i < tests.length; i++) {
        try { await tests[i][1](); out.push(tests[i][0] + ': PASS'); }
        catch (e) { out.push(tests[i][0] + ': FAIL ' + e.message); }
      }
      var pass = out.filter(function (s) { return s.indexOf('PASS') >= 0; }).length;
      var pre = document.createElement('pre');
      pre.id = 'r';
      pre.textContent = out.join('\n') + '\nRESULTS: ' + pass + '/' + out.length + ' PASS';
      document.body.appendChild(pre);
    })();
  }
})();
