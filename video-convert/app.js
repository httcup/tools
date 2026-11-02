/* 全能视频格式转换 — canvas + MediaRecorder 实时转码、WAV 提取。零依赖。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var els = {
    drop: $('vc-drop'), file: $('vc-file'), pick: $('vc-pick'), err: $('vc-err'),
    editor: $('vc-editor'), video: $('vc-video'), meta: $('vc-meta'),
    play: $('vc-play'), cur: $('vc-cur'), dur: $('vc-dur'),
    markStart: $('vc-mark-start'), markEnd: $('vc-mark-end'),
    format: $('vc-format'), res: $('vc-res'), fps: $('vc-fps'), bitrate: $('vc-bitrate'),
    speed: $('vc-speed'), rotate: $('vc-rotate'), flip: $('vc-flip'), audio: $('vc-audio'),
    start: $('vc-start'), end: $('vc-end'), volume: $('vc-volume'), volV: $('vc-vol-v'),
    run: $('vc-run'), cancel: $('vc-cancel'), reset: $('vc-reset'),
    progressWrap: $('vc-progress-wrap'), bar: $('vc-bar'), progressText: $('vc-progress-text'),
    result: $('vc-result'), resultName: $('vc-result-name'), download: $('vc-download'),
    resultSize: $('vc-result-size'), status: $('vc-status')
  };

  var src = { file: null, url: null, duration: 0, w: 0, h: 0 };
  var audioCtx = null;
  var running = null;          // { recorder, raf, audioNode, stream }
  var cancelFlag = false;
  var resultUrl = null;
  var mp4Type = '';

  function audioCtxGet() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function setStatus(msg) { els.status.textContent = msg || ''; }

  function showErr(msg) {
    els.err.hidden = false;
    els.err.textContent = msg;
  }

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function fmtSize(bytes) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  /* ---------- 载入 ---------- */

  function detectMp4() {
    var list = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1.4d002a,mp4a.40.2',
      'video/mp4'
    ];
    for (var i = 0; i < list.length; i++) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(list[i])) return list[i];
    }
    return '';
  }

  function loadFile(file) {
    if (!file) return;
    els.err.hidden = true;
    setStatus('正在读取视频信息…');
    if (src.url) URL.revokeObjectURL(src.url);
    src.file = file;
    src.url = URL.createObjectURL(file);
    var v = els.video;
    v.src = src.url;
    v.onloadedmetadata = function () {
      src.duration = v.duration || 0;
      src.w = v.videoWidth || 0;
      src.h = v.videoHeight || 0;
      els.dur.textContent = fmtTime(src.duration);
      els.start.value = '0';
      els.start.max = src.duration.toFixed(2);
      els.end.value = src.duration.toFixed(2);
      els.end.max = src.duration.toFixed(2);
      renderMeta(file);
      els.drop.hidden = true;
      els.editor.hidden = false;
      setStatus('');
    };
    v.onerror = function () {
      setStatus('');
      showErr('这个视频浏览器打不开：可能是编码不支持（比如 H.265 / HEVC、部分 AVI、MKV 里的特殊编码）。先转成 MP4（H.264）再试。');
      els.drop.hidden = false;
      els.editor.hidden = true;
    };
  }

  function renderMeta(file) {
    els.meta.innerHTML = '';
    [
      ['文件', file.name],
      ['时长', fmtTime(src.duration)],
      ['画面', src.w + ' × ' + src.h],
      ['大小', fmtSize(file.size)],
      ['MP4 输出', mp4Type ? '可用' : '当前浏览器不支持']
    ].forEach(function (row) {
      var s = document.createElement('span');
      s.append(row[0] + '：');
      var b = document.createElement('b');
      b.textContent = row[1];
      s.appendChild(b);
      els.meta.appendChild(s);
    });
  }

  els.video.addEventListener('timeupdate', function () {
    els.cur.textContent = fmtTime(els.video.currentTime);
  });

  els.play.addEventListener('click', function () {
    if (els.video.paused) {
      els.video.play().catch(function () {});
      els.play.textContent = '暂停预览';
    } else {
      els.video.pause();
      els.play.textContent = '播放预览';
    }
  });

  els.video.addEventListener('pause', function () { els.play.textContent = '播放预览'; });
  els.video.addEventListener('play', function () { els.play.textContent = '暂停预览'; });

  els.markStart.addEventListener('click', function () {
    els.start.value = els.video.currentTime.toFixed(1);
  });

  els.markEnd.addEventListener('click', function () {
    els.end.value = els.video.currentTime.toFixed(1);
  });

  els.volume.addEventListener('input', function () {
    els.volV.textContent = els.volume.value + '%';
  });

  /* ---------- 参数 ---------- */

  function readRange() {
    var start = Number(els.start.value);
    var end = Number(els.end.value);
    if (!isFinite(start) || start < 0) start = 0;
    if (!isFinite(end) || end <= 0) end = src.duration;
    end = Math.min(end, src.duration);
    start = Math.min(start, Math.max(0, end - 0.2));
    return { start: start, end: end };
  }

  function targetSize() {
    var choice = els.res.value;
    var maxSide = choice === 'source' ? 1920 : Number(choice);
    var scale = Math.min(1, maxSide / Math.max(src.w, src.h));
    var w = Math.max(2, Math.round(src.w * scale / 2) * 2);
    var h = Math.max(2, Math.round(src.h * scale / 2) * 2);
    var rot = Number(els.rotate.value);
    if (rot === 90 || rot === 270) { var t = w; w = h; h = t; }
    return { w: w, h: h, rot: rot };
  }

  /* ---------- 主流程 ---------- */

  els.run.addEventListener('click', function () {
    if (running) return;
    els.err.hidden = true;
    els.result.hidden = true;
    var range = readRange();
    if (range.end - range.start < 0.2) {
      setStatus('选的片段太短了，至少留 0.2 秒。');
      return;
    }
    if (els.format.value === 'wav') extractWav(range);
    else recordVideo(range);
  });

  els.cancel.addEventListener('click', function () {
    if (!running) return;
    cancelFlag = true;
    cleanupRecording();
    els.progressWrap.hidden = true;
    setStatus('已取消，可以改参数重来。');
  });

  els.reset.addEventListener('click', function () {
    if (running) cleanupRecording();
    els.video.pause();
    els.video.removeAttribute('src');
    els.video.load();
    if (src.url) URL.revokeObjectURL(src.url);
    src = { file: null, url: null, duration: 0, w: 0, h: 0 };
    els.file.value = '';
    els.editor.hidden = true;
    els.drop.hidden = false;
    els.progressWrap.hidden = true;
    els.result.hidden = true;
    els.err.hidden = true;
    if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }
    setStatus('');
  });

  function lockUI(locked) {
    [els.run, els.format, els.res, els.fps, els.bitrate, els.speed,
      els.rotate, els.flip, els.audio, els.start, els.end, els.reset].forEach(function (el) {
      el.disabled = locked;
    });
    els.cancel.hidden = !locked;
  }

  function cleanupRecording() {
    if (!running) return;
    cancelAnimationFrame(running.raf);
    try { if (running.recorder && running.recorder.state !== 'inactive') running.recorder.stop(); } catch (e) {}
    try { els.video.pause(); } catch (e) {}
    running = null;
    lockUI(false);
    els.video.playbackRate = 1;
  }

  function recordVideo(range) {
    if (!src.w || !src.h) { setStatus('还没读到画面尺寸，稍等一下再试。'); return; }

    var size = targetSize();
    var fps = Number(els.fps.value);
    var bitrate = Number(els.bitrate.value);
    var speed = Number(els.speed.value);
    var flip = els.flip.value;
    var keepAudio = els.audio.value === 'keep';
    var volume = Number(els.volume.value) / 100;

    var canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    var g = canvas.getContext('2d');

    var v = els.video;
    v.pause();
    v.playbackRate = speed;

    var stream;
    try {
      stream = canvas.captureStream(fps);
    } catch (e) {
      setStatus('这个浏览器不支持从画布录制视频，换个新版 Chrome / Edge / Safari 试试。');
      return;
    }

    var audioNode = null;
    if (keepAudio) {
      try {
        var ac = audioCtxGet();
        var source = ac.createMediaElementSource(v);
        var gain = ac.createGain();
        gain.gain.value = volume;
        var dest = ac.createMediaStreamDestination();
        source.connect(gain);
        gain.connect(dest);
        dest.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
        audioNode = { source: source, gain: gain };
      } catch (e) {
        // 没有音轨或已被占用时，纯视频也能继续
      }
    }

    var mime;
    if (els.format.value === 'mp4') {
      if (!mp4Type) { setStatus('当前浏览器不支持录制 MP4，先选 WebM 吧。'); return; }
      mime = mp4Type;
    } else {
      mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm');
    }

    var chunks = [];
    var recorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: bitrate,
        audioBitsPerSecond: keepAudio ? 128000 : undefined
      });
    } catch (e) {
      setStatus('录制器初始化失败：' + (e && e.message ? e.message : '未知原因'));
      return;
    }

    cancelFlag = false;
    running = { recorder: recorder, raf: 0, audioNode: audioNode, stream: stream };
    lockUI(true);
    els.progressWrap.hidden = false;
    els.bar.style.width = '0%';
    els.progressText.textContent = '正在起转…';
    setStatus('转码中，请留在这个页面；切到后台可能会掉帧。');

    function paint() {
      g.save();
      g.translate(canvas.width / 2, canvas.height / 2);
      g.rotate(size.rot * Math.PI / 180);
      if (flip === 'h') g.scale(-1, 1);
      if (flip === 'v') g.scale(1, -1);
      var swap = size.rot === 90 || size.rot === 270;
      var dw = swap ? canvas.height : canvas.width;
      var dh = swap ? canvas.width : canvas.height;
      g.drawImage(v, -dw / 2, -dh / 2, dw, dh);
      g.restore();
    }

    function tick() {
      if (!running || cancelFlag) return;
      paint();
      var span = range.end - range.start;
      var done = Math.max(0, Math.min(1, (v.currentTime - range.start) / span));
      els.bar.style.width = (done * 100).toFixed(1) + '%';
      els.progressText.textContent = '已处理 ' + Math.round(done * 100) + '% · ' +
        fmtTime(Math.max(0, v.currentTime)) + ' / ' + fmtTime(range.end);
      if (v.currentTime >= range.end - 0.03 || v.ended) {
        finish();
        return;
      }
      running.raf = requestAnimationFrame(tick);
    }

    function finish() {
      if (!running) return;
      cancelAnimationFrame(running.raf);
      try { if (recorder.state !== 'inactive') recorder.stop(); } catch (e) { running = null; lockUI(false); }
    }

    recorder.ondataavailable = function (e) {
      if (e.data && e.data.size) chunks.push(e.data);
    };

    recorder.onstop = function () {
      var cancelled = cancelFlag;
      var audioNodeRef = running && running.audioNode;
      if (running && running.stream) running.stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
      running = null;
      lockUI(false);
      els.cancel.hidden = true;
      v.pause();
      v.playbackRate = 1;
      if (audioNodeRef) { try { audioNodeRef.source.disconnect(); } catch (e) {} }
      if (cancelled) { cancelFlag = false; els.progressWrap.hidden = true; return; }
      if (!chunks.length) {
        els.progressText.textContent = '';
        setStatus('没录到数据，可能是片段太短或浏览器限制了编码。试一段长一点的。');
        return;
      }
      var type = mime.indexOf('mp4') >= 0 ? 'video/mp4' : 'video/webm';
      var blob = new Blob(chunks, { type: type });
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = URL.createObjectURL(blob);
      var ext = type === 'video/mp4' ? '.mp4' : '.webm';
      var base = (src.file.name || 'video').replace(/\.[^.]+$/, '');
      els.resultName.textContent = base + '-converted' + ext;
      els.download.href = resultUrl;
      els.download.download = base + '-converted' + ext;
      els.resultSize.textContent = fmtSize(blob.size) + ' · ' + fmtTime(spanOf(range, speed));
      els.result.hidden = false;
      els.bar.style.width = '100%';
      els.progressText.textContent = '完成';
      setStatus('转好了，点「下载文件」保存。');
    };

    var started = false;
    var begin = function () {
      if (started || cancelFlag) return;
      started = true;
      paint();
      recorder.start(200);
      v.play().catch(function () {
        setStatus('自动播放被浏览器拦住了，请再点一次「开始转换」。');
        cleanupRecording();
      });
      running.raf = requestAnimationFrame(tick);
    };

    if (Math.abs(v.currentTime - range.start) > 0.08) {
      v.addEventListener('seeked', begin, { once: true });
      v.currentTime = range.start;
      setTimeout(begin, 900);           // seeked 偶尔不触发，兜底
    } else {
      begin();
    }
  }

  function spanOf(range, speed) {
    return (range.end - range.start) / (speed || 1);
  }

  /* ---------- 提取音频为 WAV ---------- */

  function extractWav(range) {
    lockUI(true);
    els.progressWrap.hidden = false;
    els.bar.style.width = '0%';
    els.progressText.textContent = '正在解码音轨…';
    setStatus('正在解码音轨并重采样…');

    var reader = new FileReader();
    reader.onload = function () {
      audioCtxGet().decodeAudioData(reader.result).then(function (decoded) {
        var speed = Number(els.speed.value) || 1;
        var sr = decoded.sampleRate;
        var from = Math.max(0, Math.round(range.start * sr));
        var to = Math.min(decoded.length, Math.round(range.end * sr));
        var len = Math.max(1, to - from);
        var outLen = Math.max(1, Math.round(len / speed));

        var channels = [];
        for (var c = 0; c < decoded.numberOfChannels; c++) {
          var input = decoded.getChannelData(c);
          var out = new Float32Array(outLen);
          for (var i = 0; i < outLen; i++) {
            var pos = from + i * speed;
            var i0 = Math.floor(pos);
            var i1 = Math.min(to - 1, i0 + 1);
            var frac = pos - i0;
            out[i] = input[i0] * (1 - frac) + input[i1] * frac;
          }
          channels.push(out);
        }

        var wav = encodeWav(channels, sr);
        var blob = new Blob([wav], { type: 'audio/wav' });
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        resultUrl = URL.createObjectURL(blob);
        var base = (src.file.name || 'video').replace(/\.[^.]+$/, '');
        els.resultName.textContent = base + '-audio.wav';
        els.download.href = resultUrl;
        els.download.download = base + '-audio.wav';
        els.resultSize.textContent = fmtSize(blob.size) + ' · ' + fmtTime(outLen / sr);
        els.result.hidden = false;
        els.bar.style.width = '100%';
        els.progressText.textContent = '完成';
        setStatus('音轨已提取成 WAV（无损 PCM）。');
        lockUI(false);
      }).catch(function () {
        els.progressWrap.hidden = true;
        setStatus('');
        showErr('这个文件里没能解出音轨：可能本身就没有声音，或者音频编码浏览器不支持。');
        lockUI(false);
      });
    };
    reader.onerror = function () {
      els.progressWrap.hidden = true;
      setStatus('读取文件失败。');
      lockUI(false);
    };
    reader.readAsArrayBuffer(src.file);
  }

  function writeString(view, offset, str) {
    for (var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  function encodeWav(channels, sampleRate) {
    var ch = channels.length;
    var len = channels[0].length;
    var dataSize = len * ch * 2;
    var buffer = new ArrayBuffer(44 + dataSize);
    var view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, ch, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * ch * 2, true);
    view.setUint16(32, ch * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    var offset = 44;
    for (var i = 0; i < len; i++) {
      for (var c = 0; c < ch; c++) {
        var v = channels[c][i];
        if (v > 1) v = 1;
        if (v < -1) v = -1;
        view.setInt16(offset, Math.round(v < 0 ? v * 0x8000 : v * 0x7fff), true);
        offset += 2;
      }
    }
    return buffer;
  }

  /* ---------- 拖放与初始化 ---------- */

  els.pick.addEventListener('click', function () { els.file.click(); });
  els.file.addEventListener('change', function () {
    if (els.file.files[0]) loadFile(els.file.files[0]);
  });

  ['dragenter', 'dragover'].forEach(function (t) {
    els.drop.addEventListener(t, function (e) { e.preventDefault(); els.drop.classList.add('is-over'); });
  });
  ['dragleave', 'drop'].forEach(function (t) {
    els.drop.addEventListener(t, function (e) { e.preventDefault(); els.drop.classList.remove('is-over'); });
  });
  els.drop.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  els.format.addEventListener('change', function () {
    var audioOnly = els.format.value === 'wav';
    [els.res, els.fps, els.bitrate, els.rotate, els.flip, els.volume].forEach(function (el) {
      el.disabled = audioOnly;
    });
    els.audio.disabled = audioOnly;
  });

  mp4Type = detectMp4();
  if (!mp4Type) {
    var opt = els.format.querySelector('option[value="mp4"]');
    if (opt) {
      opt.disabled = true;
      opt.textContent = 'MP4（当前浏览器不支持录制）';
    }
  }
})();
