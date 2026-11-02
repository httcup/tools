/* 在线音频剪辑 — 解码、波形、选区、剪辑与 WAV 导出。零依赖。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var els = {
    drop: $('ac-drop'), file: $('ac-file'), pick: $('ac-pick'), err: $('ac-err'),
    editor: $('ac-editor'), meta: $('ac-meta'),
    canvas: $('ac-wave'), hint: $('ac-wave-hint'),
    play: $('ac-play'), stop: $('ac-stop'),
    cur: $('ac-cur'), dur: $('ac-dur'), selinfo: $('ac-selinfo'),
    selAll: $('ac-selectall'), selNone: $('ac-selectnone'),
    crop: $('ac-crop'), del: $('ac-delete'), silence: $('ac-silence'),
    fadein: $('ac-fadein'), fadeinV: $('ac-fi-v'),
    fadeout: $('ac-fadeout'), fadeoutV: $('ac-fo-v'),
    doFadeIn: $('ac-dofadein'), doFadeOut: $('ac-dofadeout'),
    volup: $('ac-volup'), voldown: $('ac-voldown'), normalize: $('ac-normalize'),
    undo: $('ac-undo'),
    depth: $('ac-depth'), exportAll: $('ac-export'), exportSel: $('ac-export-sel'),
    reset: $('ac-reset'), status: $('ac-status')
  };

  var ctx = null;
  var buf = null;              // { sampleRate, channels: [Float32Array, ...], name }
  var sel = null;              // { start, end }（秒）
  var undoStack = [];
  var playing = null;          // { source, startedAt, offset, duration }
  var rafId = 0;
  var playhead = 0;            // 秒

  function audioCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = sec - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }

  function setStatus(msg) { els.status.textContent = msg || ''; }

  function showErr(msg) {
    els.err.hidden = false;
    els.err.textContent = msg;
  }

  function duration() {
    return buf ? buf.channels[0].length / buf.sampleRate : 0;
  }

  /* ---------- 载入 ---------- */

  function loadFile(file) {
    if (!file) return;
    els.err.hidden = true;
    setStatus('正在解码…');
    var reader = new FileReader();
    reader.onload = function () {
      audioCtx().decodeAudioData(reader.result).then(function (decoded) {
        var channels = [];
        for (var c = 0; c < decoded.numberOfChannels; c++) {
          channels.push(new Float32Array(decoded.getChannelData(c)));
        }
        buf = { sampleRate: decoded.sampleRate, channels: channels, name: file.name || 'audio' };
        sel = null;
        undoStack = [];
        playhead = 0;
        els.drop.hidden = true;
        els.editor.hidden = false;
        renderMeta(file);
        els.dur.textContent = fmt(duration());
        els.cur.textContent = fmt(0);
        resizeCanvas();
        draw();
        updateSelInfo();
        setStatus('');
      }).catch(function () {
        setStatus('');
        showErr('这个文件解不开：可能是浏览器不支持的编码，或者文件本身损坏。换个 mp3 / wav / m4a 再试。');
      });
    };
    reader.onerror = function () {
      setStatus('');
      showErr('读取文件失败，请重新选择。');
    };
    reader.readAsArrayBuffer(file);
  }

  function renderMeta(file) {
    var ch = buf.channels.length;
    var bits = file && file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : '';
    els.meta.innerHTML = '';
    [
      ['文件', buf.name],
      ['时长', fmt(duration())],
      ['采样率', (buf.sampleRate / 1000) + ' kHz'],
      ['声道', ch === 1 ? '单声道' : (ch === 2 ? '立体声' : ch + ' 声道')],
      ['大小', bits]
    ].forEach(function (row) {
      if (!row[1]) return;
      var s = document.createElement('span');
      var b = document.createElement('b');
      b.textContent = row[1];
      s.append(row[0] + '：', b);
      els.meta.appendChild(s);
    });
  }

  /* ---------- 波形 ---------- */

  function resizeCanvas() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var rect = els.canvas.getBoundingClientRect();
    els.canvas.width = Math.max(320, Math.round(rect.width * dpr));
    els.canvas.height = Math.max(120, Math.round(rect.height * dpr));
  }

  function draw() {
    if (!buf) return;
    var cv = els.canvas;
    var g = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    var mid = H / 2;
    var chs = buf.channels;
    var len = chs[0].length;
    var per = Math.max(1, Math.floor(len / W));

    g.clearRect(0, 0, W, H);

    // 选区底色
    if (sel) {
      var x1 = Math.round(sel.start / duration() * W);
      var x2 = Math.round(sel.end / duration() * W);
      g.fillStyle = 'rgba(43,108,176,0.16)';
      g.fillRect(x1, 0, Math.max(1, x2 - x1), H);
    }

    // 中线
    g.strokeStyle = 'rgba(120,132,148,0.35)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, mid);
    g.lineTo(W, mid);
    g.stroke();

    // 波形（多声道叠画，取绝对值最大）
    g.fillStyle = getComputedStyle(document.body).color || '#16191d';
    for (var x = 0; x < W; x++) {
      var from = x * per;
      var to = Math.min(len, from + per);
      var peak = 0;
      for (var c = 0; c < chs.length; c++) {
        var arr = chs[c];
        for (var i = from; i < to; i += 1) {
          var v = arr[i] < 0 ? -arr[i] : arr[i];
          if (v > peak) peak = v;
        }
      }
      var h = Math.max(1, peak * (H / 2 - 4));
      g.fillRect(x, mid - h, 1, h * 2);
    }

    // 播放头
    if (playhead > 0) {
      var px = Math.round(playhead / duration() * W);
      g.strokeStyle = '#d94a4a';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(px, 0);
      g.lineTo(px, H);
      g.stroke();
    }
  }

  /* ---------- 选区 ---------- */

  function canvasTime(e) {
    var rect = els.canvas.getBoundingClientRect();
    var ratio = (e.clientX - rect.left) / rect.width;
    ratio = Math.min(1, Math.max(0, ratio));
    return ratio * duration();
  }

  var dragging = false;
  var dragAnchor = 0;

  els.canvas.addEventListener('pointerdown', function (e) {
    if (!buf) return;
    dragging = true;
    dragAnchor = canvasTime(e);
    sel = { start: dragAnchor, end: dragAnchor };
    try { els.canvas.setPointerCapture(e.pointerId); } catch (err) { /* 测试环境或旧触屏 */ }
    els.canvas.style.cursor = 'ew-resize';
    updateSelInfo();
    draw();
  });

  els.canvas.addEventListener('pointermove', function (e) {
    if (!dragging || !buf) return;
    var t = canvasTime(e);
    sel = { start: Math.min(dragAnchor, t), end: Math.max(dragAnchor, t) };
    updateSelInfo();
    draw();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    els.canvas.style.cursor = 'crosshair';
    if (sel && (sel.end - sel.start) < 0.02) sel = null;
    updateSelInfo();
    draw();
  }

  els.canvas.addEventListener('pointerup', endDrag);
  els.canvas.addEventListener('pointercancel', endDrag);

  els.canvas.addEventListener('dblclick', function () {
    sel = null;
    updateSelInfo();
    draw();
  });

  function updateSelInfo() {
    els.selinfo.textContent = sel
      ? '选区 ' + fmt(sel.start) + ' → ' + fmt(sel.end) + '（' + fmt(sel.end - sel.start) + '）'
      : '未选择片段';
  }

  function editRange() {
    return sel || { start: 0, end: duration() };
  }

  /* ---------- 播放 ---------- */

  function stopPlayback() {
    if (playing) {
      try { playing.source.stop(); } catch (e) { /* 已经停了 */ }
      playing = null;
    }
    cancelAnimationFrame(rafId);
    els.play.textContent = '播放';
    playhead = 0;
    draw();
  }

  function makeBuffer(range) {
    var sr = buf.sampleRate;
    var from = Math.max(0, Math.round(range.start * sr));
    var to = Math.min(buf.channels[0].length, Math.round(range.end * sr));
    var len = Math.max(1, to - from);
    var out = ctx.createBuffer(buf.channels.length, len, sr);
    for (var c = 0; c < buf.channels.length; c++) {
      out.copyToChannel(buf.channels[c].subarray(from, from + len), c);
    }
    return out;
  }

  function playRange(range) {
    stopPlayback();
    var c = audioCtx();
    var buffer = makeBuffer(range);
    var source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(c.destination);
    var startedAt = c.currentTime;
    playing = { source: source, startedAt: startedAt, offset: range.start, span: range.end - range.start };
    els.play.textContent = '暂停';
    source.onended = function () {
      if (playing && playing.source === source) stopPlayback();
    };
    source.start();
    var tick = function () {
      if (!playing) return;
      var t = playing.span ? Math.min(playing.span, c.currentTime - playing.startedAt) : 0;
      playhead = playing.offset + t;
      els.cur.textContent = fmt(playhead);
      draw();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  els.play.addEventListener('click', function () {
    if (!buf) return;
    if (playing) { stopPlayback(); return; }
    playRange(editRange());
  });

  els.stop.addEventListener('click', function () {
    stopPlayback();
    els.cur.textContent = fmt(0);
  });

  els.selAll.addEventListener('click', function () {
    if (!buf) return;
    sel = { start: 0, end: duration() };
    updateSelInfo(); draw();
  });

  els.selNone.addEventListener('click', function () {
    sel = null;
    updateSelInfo(); draw();
  });

  /* ---------- 编辑 ---------- */

  function snapshot() {
    undoStack.push({
      channels: buf.channels.map(function (a) { return a.slice(); }),
      sel: sel ? { start: sel.start, end: sel.end } : null
    });
    if (undoStack.length > 12) undoStack.shift();
  }

  function afterEdit(msg, keepSel) {
    if (!keepSel) sel = null;
    playhead = 0;
    els.dur.textContent = fmt(duration());
    els.cur.textContent = fmt(0);
    updateSelInfo();
    draw();
    setStatus(msg || '已修改，可导出 WAV 或继续剪。');
  }

  function requireSel() {
    if (!sel) {
      setStatus('先在波形上拖一段出来，再点这个操作。');
      return false;
    }
    return true;
  }

  els.crop.addEventListener('click', function () {
    if (!buf || !requireSel()) return;
    var sr = buf.sampleRate;
    var from = Math.round(sel.start * sr);
    var to = Math.round(sel.end * sr);
    snapshot();
    buf.channels = buf.channels.map(function (a) { return a.slice(from, to); });
    afterEdit('已裁剪，只剩你选的那一段。');
  });

  els.del.addEventListener('click', function () {
    if (!buf || !requireSel()) return;
    var sr = buf.sampleRate;
    var from = Math.round(sel.start * sr);
    var to = Math.round(sel.end * sr);
    snapshot();
    buf.channels = buf.channels.map(function (a) {
      var out = new Float32Array(a.length - (to - from));
      out.set(a.subarray(0, from), 0);
      out.set(a.subarray(to), from);
      return out;
    });
    afterEdit('已删除选中的那一段。');
  });

  els.silence.addEventListener('click', function () {
    if (!buf || !requireSel()) return;
    var sr = buf.sampleRate;
    var from = Math.round(sel.start * sr);
    var to = Math.round(sel.end * sr);
    snapshot();
    buf.channels.forEach(function (a) { a.fill(0, from, to); });
    afterEdit('选区已静音。', true);
  });

  function applyFade(kind) {
    if (!buf) return;
    var seconds = Number(kind === 'in' ? els.fadein.value : els.fadeout.value);
    if (seconds <= 0) { setStatus('淡入淡出时长要大于 0。'); return; }
    var sr = buf.sampleRate;
    var range = editRange();
    var from = Math.round(range.start * sr);
    var to = Math.round(range.end * sr);
    var n = Math.min(Math.round(seconds * sr), to - from);
    if (n <= 1) { setStatus('选区太短，放不下这段淡入淡出。'); return; }
    snapshot();
    for (var c = 0; c < buf.channels.length; c++) {
      var a = buf.channels[c];
      if (kind === 'in') {
        for (var i = 0; i < n; i++) a[from + i] *= i / n;
      } else {
        var startIdx = to - n;
        for (var j = 0; j < n; j++) a[startIdx + j] *= j / n;
      }
    }
    afterEdit(kind === 'in' ? '淡入已应用。' : '淡出已应用。', !!sel);
  }

  els.doFadeIn.addEventListener('click', function () { applyFade('in'); });
  els.doFadeOut.addEventListener('click', function () { applyFade('out'); });

  function applyGain(db) {
    if (!buf) return;
    var factor = Math.pow(10, db / 20);
    snapshot();
    buf.channels.forEach(function (a) {
      for (var i = 0; i < a.length; i++) {
        var v = a[i] * factor;
        a[i] = v > 1 ? 1 : (v < -1 ? -1 : v);
      }
    });
    afterEdit('音量已' + (db > 0 ? '提高' : '降低') + ' ' + Math.abs(db) + ' dB（超出 ±1 的部分会削波）。', !!sel);
  }

  els.volup.addEventListener('click', function () { applyGain(3); });
  els.voldown.addEventListener('click', function () { applyGain(-3); });

  els.normalize.addEventListener('click', function () {
    if (!buf) return;
    var peak = 0;
    buf.channels.forEach(function (a) {
      for (var i = 0; i < a.length; i++) {
        var v = a[i] < 0 ? -a[i] : a[i];
        if (v > peak) peak = v;
      }
    });
    if (peak <= 0.0001) { setStatus('这段音频几乎是静音，没法标准化。'); return; }
    snapshot();
    var factor = 0.98 / peak;
    buf.channels.forEach(function (a) {
      for (var i = 0; i < a.length; i++) a[i] *= factor;
    });
    afterEdit('已按峰值标准化（' + (20 * Math.log10(factor)).toFixed(1) + ' dB）。', !!sel);
  });

  els.undo.addEventListener('click', function () {
    if (!undoStack.length) { setStatus('没有可撤销的操作了。'); return; }
    var last = undoStack.pop();
    buf.channels = last.channels;
    sel = last.sel;
    afterEdit('已撤销上一步。');
  });

  els.fadein.addEventListener('input', function () { els.fadeinV.textContent = Number(els.fadein.value).toFixed(1) + ' 秒'; });
  els.fadeout.addEventListener('input', function () { els.fadeoutV.textContent = Number(els.fadeout.value).toFixed(1) + ' 秒'; });

  /* ---------- 导出 WAV ---------- */

  function writeString(view, offset, str) {
    for (var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  function encodeWav(channels, sampleRate, depth) {
    var ch = channels.length;
    var len = channels[0].length;
    var bytesPerSample = depth === 16 ? 2 : (depth === 24 ? 3 : 4);
    var isFloat = depth === 32;
    var dataSize = len * ch * bytesPerSample;
    var buffer = new ArrayBuffer(44 + dataSize);
    var view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, isFloat ? 3 : 1, true);
    view.setUint16(22, ch, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * ch * bytesPerSample, true);
    view.setUint16(32, ch * bytesPerSample, true);
    view.setUint16(34, depth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    var offset = 44;
    for (var i = 0; i < len; i++) {
      for (var c = 0; c < ch; c++) {
        var v = channels[c][i];
        if (v > 1) v = 1;
        if (v < -1) v = -1;
        if (isFloat) {
          view.setFloat32(offset, v, true);
          offset += 4;
        } else if (depth === 24) {
          var s24 = Math.round(v < 0 ? v * 0x800000 : v * 0x7fffff);
          view.setUint8(offset, s24 & 0xff);
          view.setUint8(offset + 1, (s24 >> 8) & 0xff);
          view.setUint8(offset + 2, (s24 >> 16) & 0xff);
          offset += 3;
        } else {
          var s16 = Math.round(v < 0 ? v * 0x8000 : v * 0x7fff);
          view.setInt16(offset, s16, true);
          offset += 2;
        }
      }
    }
    return buffer;
  }

  function download(channels, suffix) {
    var depth = Number(els.depth.value) || 16;
    var blob = new Blob([encodeWav(channels, buf.sampleRate, depth)], { type: 'audio/wav' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var base = (buf.name || 'audio').replace(/\.[^.]+$/, '');
    a.href = url;
    a.download = base + (suffix || '-edited') + '.wav';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    setStatus('已导出 ' + a.download + '（' + (blob.size / 1024 / 1024).toFixed(2) + ' MB）。');
  }

  els.exportAll.addEventListener('click', function () {
    if (!buf) return;
    download(buf.channels, '-edited');
  });

  els.exportSel.addEventListener('click', function () {
    if (!buf || !requireSel()) return;
    var sr = buf.sampleRate;
    var from = Math.round(sel.start * sr);
    var to = Math.round(sel.end * sr);
    download(buf.channels.map(function (a) { return a.slice(from, to); }), '-clip');
  });

  els.reset.addEventListener('click', function () {
    stopPlayback();
    buf = null;
    sel = null;
    undoStack = [];
    els.editor.hidden = true;
    els.drop.hidden = false;
    els.file.value = '';
    els.err.hidden = true;
    setStatus('');
  });

  /* ---------- 文件选择 / 拖放 ---------- */

  els.pick.addEventListener('click', function () { els.file.click(); });
  els.file.addEventListener('change', function () {
    if (els.file.files && els.file.files[0]) loadFile(els.file.files[0]);
  });

  ['dragenter', 'dragover'].forEach(function (type) {
    els.drop.addEventListener(type, function (e) {
      e.preventDefault();
      els.drop.classList.add('is-over');
    });
  });

  ['dragleave', 'drop'].forEach(function (type) {
    els.drop.addEventListener(type, function (e) {
      e.preventDefault();
      els.drop.classList.remove('is-over');
    });
  });

  els.drop.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  // 编辑区也能接住拖进来的新文件
  els.editor.addEventListener('dragover', function (e) { e.preventDefault(); });
  els.editor.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) { e.preventDefault(); loadFile(f); }
  });

  window.addEventListener('resize', function () {
    if (!buf) return;
    resizeCanvas();
    draw();
  });

  document.addEventListener('keydown', function (e) {
    if (e.code !== 'Space') return;
    var tag = (e.target.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
    if (!buf) return;
    e.preventDefault();
    els.play.click();
  });

  // iOS 需要用户手势后才能出声，顺便把上下文预热
  els.play.addEventListener('pointerdown', function () { audioCtx(); }, { once: true });
})();
