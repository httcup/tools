#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ToolKnit 批次定义（四）：音频工具（mp3→wav、白噪音、BPM、节拍器、歌词播放器、虚拟键盘）。"""

TOOLS = []


def t(slug, name, desc, long, keys, cat, icon, body, js, note=""):
    TOOLS.append(dict(slug=slug, name=name, desc=desc, long=long, keys=keys,
                      cat=cat, icon=icon, note=note, body=body, js=js))


t("mp3-to-wav", "MP3 转 WAV",
  "解码为 WAV，本地转换不依赖服务。",
  "把 MP3 / M4A / OGG 等音频解码为无损 WAV 并下载，可选采样率与声道，全程用浏览器自带解码器完成。",
  "mp3 wav 转换 音频 无损",
  "documents-and-audio", "music",
  """
<section class="tool-card">
  <div class="drop" id="drop">
    <p><b>拖入音频文件</b> 或</p>
    <label class="btn btn-primary">选择音频<input type="file" id="file" accept="audio/*" hidden></label>
  </div>
</section>
<section class="tool-card" id="optsCard" hidden>
  <h2>转换设置</h2>
  <div class="row">
    <label class="field"><span>采样率</span><select id="rate"><option value="0">保持原采样率</option><option value="44100">44100 Hz</option><option value="48000">48000 Hz</option></select></label>
    <label class="field"><span>声道</span><select id="ch"><option value="0">保持原声道</option><option value="1">单声道</option><option value="2">立体声</option></select></label>
    <button class="btn btn-primary" type="button" id="go">转换并下载 WAV</button>
    <span class="stats" id="stats"></span>
  </div>
  <audio id="player" controls style="margin-top:0.8rem"></audio>
</section>
""",
  """(function () {
  'use strict';
  var drop = document.getElementById('drop'), fileBuf = null, fname = 'audio', decoded = null;
  function load(f) {
    if (!f) return;
    fname = f.name.replace(/\\.[^.]+$/, '');
    var fr = new FileReader();
    fr.onload = function () {
      fileBuf = fr.result;
      document.getElementById('player').src = URL.createObjectURL(f);
      document.getElementById('optsCard').hidden = false;
      document.getElementById('stats').textContent = '已载入 ' + f.name;
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
  function encodeWav(chans, rate) {
    var n = chans[0].length, numCh = chans.length;
    var buf = new ArrayBuffer(44 + n * numCh * 2), v = new DataView(buf);
    function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n * numCh * 2, true); str(8, 'WAVE');
    str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, numCh, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * numCh * 2, true);
    v.setUint16(32, numCh * 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * numCh * 2, true);
    var off = 44;
    for (var i = 0; i < n; i++) for (var c = 0; c < numCh; c++) {
      var s = Math.max(-1, Math.min(1, chans[c][i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2;
    }
    return new Blob([buf], { type: 'audio/wav' });
  }
  document.getElementById('go').addEventListener('click', function () {
    if (!fileBuf) return;
    var ac = new (window.AudioContext || window.webkitAudioContext)();
    document.getElementById('stats').textContent = '解码中…';
    ac.decodeAudioData(fileBuf.slice(0)).then(function (a) {
      var rate = parseInt(document.getElementById('rate').value) || a.sampleRate;
      var targetCh = parseInt(document.getElementById('ch').value) || a.numberOfChannels;
      var ratio = rate / a.sampleRate;
      var n = Math.round(a.length * ratio);
      var chans = [];
      for (var c = 0; c < targetCh; c++) {
        var src = a.getChannelData(Math.min(c, a.numberOfChannels - 1));
        var out = new Float32Array(n);
        for (var i = 0; i < n; i++) out[i] = src[Math.min(src.length - 1, Math.round(i / ratio))];
        chans.push(out);
      }
      var blob = encodeWav(chans, rate);
      TK.downloadBlob(fname + '.wav', blob);
      document.getElementById('stats').textContent = '完成：' + rate + ' Hz · ' + targetCh + ' 声道 · ' + (blob.size / 1048576).toFixed(1) + ' MB';
      ac.close();
    }).catch(function (e) {
      document.getElementById('stats').textContent = '解码失败：' + e;
    });
  });
})();""",
  "WAV 是无损格式，文件会比 MP3 大得多，属正常现象。")

t("noise-generator", "白噪音发生器",
  "白粉棕噪音与雨声助眠音。",
  "用 Web Audio 实时合成白噪音、粉噪音、棕噪音与雨声，可定时淡出，适合专注与助眠，无任何网络请求。",
  "白噪音 助眠 专注 雨声 noise",
  "documents-and-audio", "wave",
  """
<section class="tool-card">
  <h2>选择音色</h2>
  <div class="checks">
    <label class="check"><input type="radio" name="nt" value="white" checked> 白噪音（嘶嘶）</label>
    <label class="check"><input type="radio" name="nt" value="pink"> 粉噪音（柔和）</label>
    <label class="check"><input type="radio" name="nt" value="brown"> 棕噪音（低沉）</label>
    <label class="check"><input type="radio" name="nt" value="rain"> 雨声（带滴答）</label>
  </div>
  <div class="row">
    <label class="field"><span>音量</span><input type="range" id="vol" min="0" max="100" value="40"></label>
    <label class="field"><span>定时停止（分钟，0 不停）</span><input type="number" id="timer" value="0" min="0" max="180"></label>
    <button class="btn btn-primary" type="button" id="start">▶ 播放</button>
    <button class="btn" type="button" id="stop">■ 停止</button>
    <span class="stats" id="stats"></span>
  </div>
</section>
""",
  """(function () {
  'use strict';
  var ctx = null, node = null, gain = null, stopAt = 0, tick = null;
  function makeNoise(kind) {
    var len = ctx.sampleRate * 2;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w * 0.5;
      else if (kind === 'pink') { b0 = 0.997 * b0 + 0.029 * w; b1 = 0.985 * b1 + 0.032 * w; b2 = 0.95 * b2 + 0.048 * w; d[i] = (b0 + b1 + b2 + w * 0.05) * 0.6; }
      else if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    return buf;
  }
  function start() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    if (node) node.stop();
    var kind = document.querySelector('input[name="nt"]:checked').value;
    gain = ctx.createGain();
    gain.gain.value = parseInt(document.getElementById('vol').value) / 100 * 0.6;
    var src = ctx.createBufferSource();
    src.buffer = makeNoise(kind);
    src.loop = true;
    if (kind === 'rain') {
      var hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 900; hp.Q.value = 0.5;
      src.connect(hp); hp.connect(gain);
    } else {
      var lp = ctx.createBiquadFilter(); lp.type = kind === 'brown' ? 'lowpass' : 'highpass';
      lp.frequency.value = kind === 'brown' ? 500 : 40;
      src.connect(lp); lp.connect(gain);
    }
    gain.connect(ctx.destination);
    src.start();
    node = src;
    var mins = parseInt(document.getElementById('timer').value) || 0;
    if (mins > 0) {
      stopAt = Date.now() + mins * 60000;
      clearInterval(tick);
      tick = setInterval(function () {
        var left = stopAt - Date.now();
        if (left <= 0) { stop(); return; }
        document.getElementById('stats').textContent = Math.ceil(left / 60000) + ' 分钟后淡出';
        if (left < 10000) gain.gain.linearRampToValueAtTime(0, ctx.currentTime + left / 1000);
      }, 1000);
    } else document.getElementById('stats').textContent = '播放中';
  }
  function stop() {
    clearInterval(tick);
    if (node) { try { node.stop(); } catch (e) {} node = null; }
    document.getElementById('stats').textContent = '';
  }
  document.getElementById('start').addEventListener('click', start);
  document.getElementById('stop').addEventListener('click', stop);
  document.getElementById('vol').addEventListener('input', function () {
    if (gain) gain.gain.value = parseInt(this.value) / 100 * 0.6;
  });
  document.querySelectorAll('input[name="nt"]').forEach(function (r) {
    r.addEventListener('change', function () { if (node) start(); });
  });
})();""",
  "粉噪音比白噪音更柔和，多数人助眠首选；定时到点会自动淡出再停。")

t("bpm-detector", "BPM 节拍检测",
  "测一段音乐每分钟节拍数。",
  "载入本地音乐文件，用能量峰值间隔法估算 BPM（每分钟节拍数），在 60–180 范围内给出最可能值与候选列表。",
  "bpm 节拍 速度 音乐 检测",
  "documents-and-audio", "bpm",
  """
<section class="tool-card">
  <div class="drop" id="drop">
    <p><b>拖入音乐文件</b> 或</p>
    <label class="btn btn-primary">选择音频<input type="file" id="file" accept="audio/*" hidden></label>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>检测结果</h2><span class="stats" id="stats"></span></div>
  <dl class="kv" id="res"></dl>
  <audio id="player" controls style="width:100%;margin-top:0.8rem" hidden></audio>
</section>
""",
  """(function () {
  'use strict';
  var drop = document.getElementById('drop');
  function load(f) {
    if (!f) return;
    document.getElementById('stats').textContent = '分析中…';
    var fr = new FileReader();
    fr.onload = function () {
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      ac.decodeAudioData(fr.result).then(function (a) {
        var data = a.getChannelData(0), sr = a.sampleRate;
        var win = Math.round(sr * 0.02), energies = [];
        for (var i = 0; i + win < data.length; i += win) {
          var s = 0;
          for (var j = 0; j < win; j += 8) s += data[i + j] * data[i + j];
          energies.push(s);
        }
        var peaks = [], avg = 0;
        for (var k = 0; k < energies.length; k++) avg += energies[k];
        avg /= energies.length;
        for (var p = 2; p < energies.length - 2; p++) {
          if (energies[p] > avg * 1.6 && energies[p] >= energies[p - 1] && energies[p] >= energies[p + 1]) peaks.push(p * 0.02);
        }
        var counts = {};
        for (var x = 0; x < peaks.length - 1; x++) {
          for (var y = x + 1; y < Math.min(peaks.length, x + 8); y++) {
            var iv = peaks[y] - peaks[x];
            if (iv <= 0) continue;
            var bpm = 60 / iv;
            while (bpm < 60) bpm *= 2;
            while (bpm > 180) bpm /= 2;
            if (bpm < 60 || bpm > 180) continue;
            var key = Math.round(bpm * 4) / 4;
            counts[key] = (counts[key] || 0) + 1;
          }
        }
        var list = Object.keys(counts).map(function (k) { return [counts[k], parseFloat(k)]; })
          .sort(function (m, n) { return n[0] - m[0]; }).slice(0, 5);
        var rows = [['音频长度', (a.duration / 60).toFixed(1) + ' 分钟', 'str']];
        if (list.length) {
          rows.push(['最可能 BPM', list[0][1], 'num']);
          rows.push(['候选', list.slice(1).map(function (l) { return l[1]; }).join(' / ') || '—', 'str']);
        } else rows.push(['未检测到明显节拍', '—', 'str']);
        document.getElementById('res').innerHTML = rows.map(function (r) { return '<dt>' + TK.esc(r[0]) + '</dt><dd>' + TK.esc(r[1]) + '</dd>'; }).join('');
        document.getElementById('stats').textContent = f.name;
        var pl = document.getElementById('player');
        pl.src = URL.createObjectURL(f); pl.hidden = false;
        ac.close();
      });
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
  "算法基于峰值间隔统计，电子乐与鼓点清晰的曲子最准；倍频混淆时看候选列表。")

t("metronome", "节拍器",
  "可调速度与拍号的练习节拍器。",
  "40–240 BPM 可调的网页节拍器，支持 2/4、3/4、4/4 拍号与重音，可视化闪烁帮助你跟上节奏。",
  "节拍器 metronome 练琴 节奏",
  "documents-and-audio", "metronome",
  """
<section class="tool-card">
  <h2>设置</h2>
  <div class="row">
    <label class="field"><span>速度（BPM）</span><input type="number" id="bpm" value="90" min="40" max="240"></label>
    <input type="range" id="bpmR" min="40" max="240" value="90" style="flex:1;align-self:flex-end">
    <label class="field"><span>拍号</span><select id="sig"><option value="4">4/4</option><option value="3">3/4</option><option value="2">2/4</option><option value="6">6/8</option></select></label>
    <button class="btn btn-primary" type="button" id="go">▶ 开始</button>
    <span class="stats" id="stats"></span>
  </div>
  <div style="display:flex;gap:0.6rem;justify-content:center;margin-top:1rem" id="dots"></div>
</section>
""",
  """(function () {
  'use strict';
  var ctx = null, next = 0, beat = 0, timer = null, running = false;
  var dots = document.getElementById('dots');
  function buildDots() {
    var n = parseInt(document.getElementById('sig').value);
    dots.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var d = document.createElement('span');
      d.style.cssText = 'width:1.1rem;height:1.1rem;border-radius:99px;background:var(--border);transition:background 0.05s';
      dots.appendChild(d);
    }
  }
  function beep(t, strong) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = strong ? 1200 : 800;
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.09);
    var idx = beat % parseInt(document.getElementById('sig').value);
    setTimeout(function () {
      var kids = dots.children;
      for (var i = 0; i < kids.length; i++) kids[i].style.background = i === idx ? '#2b6cb0' : 'var(--border)';
    }, Math.max(0, (t - ctx.currentTime) * 1000));
  }
  function schedule() {
    var bpm = parseInt(document.getElementById('bpm').value) || 90;
    var spb = 60 / bpm;
    while (next < ctx.currentTime + 0.25) {
      beep(next, beat % parseInt(document.getElementById('sig').value) === 0);
      next += spb;
      beat++;
    }
  }
  document.getElementById('go').addEventListener('click', function () {
    running = !running;
    this.textContent = running ? '■ 停止' : '▶ 开始';
    if (running) {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      next = ctx.currentTime + 0.1; beat = 0;
      timer = setInterval(schedule, 50);
      document.getElementById('stats').textContent = '播放中';
    } else {
      clearInterval(timer);
      document.getElementById('stats').textContent = '';
      Array.prototype.forEach.call(dots.children, function (d) { d.style.background = 'var(--border)'; });
    }
  });
  ['bpm', 'sig'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () {
      document.getElementById(id === 'bpm' ? 'bpmR' : 'bpm').value = this.value;
      buildDots();
    });
  });
  buildDots();
})();""",
  "重拍（每小节第一拍）音调更高，圆点同步高亮。")

t("lyric-visualizer", "LRC 歌词播放器",
  "本地音频配 LRC 歌词同步播放。",
  "载入本地音频与 LRC 歌词文件，卡拉 OK 式高亮当前句，附实时波形，全部在浏览器本地播放。",
  "lrc 歌词 播放器 可视化 卡拉ok",
  "documents-and-audio", "music",
  """
<section class="tool-card">
  <div class="row">
    <label class="btn btn-primary">选择音频<input type="file" id="audio" accept="audio/*" hidden></label>
    <label class="btn">选择 LRC 歌词<input type="file" id="lrc" accept=".lrc,text/plain" hidden></label>
    <span class="stats" id="stats"></span>
  </div>
  <audio id="player" controls style="width:100%;margin-top:0.7rem" hidden></audio>
</section>
<section class="tool-card">
  <canvas id="wave" height="70" style="width:100%;background:var(--surface-2);border-radius:8px"></canvas>
  <div id="lyrics" style="max-height:14rem;overflow:auto;margin-top:0.8rem;text-align:center;font-size:1rem;line-height:2.1"></div>
</section>
""",
  """(function () {
  'use strict';
  var lines = [], cur = -1, actx = null, analyser = null, raf = null;
  var player = document.getElementById('player');
  var box = document.getElementById('lyrics');
  function parseLrc(text) {
    lines = [];
    text.split(/\\r?\\n/).forEach(function (l) {
      var m = l.match(/^\\[(\\d{1,2}):(\\d{2})(?:[.:](\\d{1,3}))?\\](.*)$/);
      if (m) lines.push({ t: (+m[1]) * 60 + (+m[2]) + (m[3] ? +(('0.' + m[3])) : 0), s: m[4].trim() });
    });
    lines.sort(function (a, b) { return a.t - b.t; });
    box.innerHTML = lines.map(function (l, i) {
      return '<div data-i="' + i + '" style="color:var(--text-dim);transition:color 0.2s">' + TK.esc(l.s || '♪') + '</div>';
    }).join('') || '<p class="note">没有解析到歌词行</p>';
  }
  document.getElementById('lrc').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (f) { var r = new FileReader(); r.onload = function () { parseLrc(r.result); }; r.readAsText(f, 'utf-8'); }
  });
  document.getElementById('audio').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    player.src = URL.createObjectURL(f);
    player.hidden = false;
    document.getElementById('stats').textContent = f.name;
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      var src = actx.createMediaElementSource(player);
      analyser = actx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser); analyser.connect(actx.destination);
    }
    if (actx.state === 'suspended') actx.resume();
    drawWave();
  });
  function drawWave() {
    var cv = document.getElementById('wave');
    cv.width = cv.clientWidth;
    var ctx = cv.getContext('2d');
    function frame() {
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#7db4e8';
      if (analyser) {
        var d = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(d);
        var bars = 48, bw = cv.width / bars;
        for (var i = 0; i < bars; i++) {
          var v = d[Math.floor(i * d.length / bars)] / 255;
          var h = Math.max(2, v * cv.height * 0.9);
          ctx.fillRect(i * bw + 1, cv.height - h, bw - 2, h);
        }
      }
    }
    if (!raf) frame();
  }
  player.addEventListener('timeupdate', function () {
    if (!lines.length) return;
    var t = player.currentTime, idx = -1;
    for (var i = 0; i < lines.length; i++) if (lines[i].t <= t + 0.2) idx = i;
    if (idx !== cur) {
      cur = idx;
      var kids = box.children;
      for (var j = 0; j < kids.length; j++) {
        kids[j].style.color = j === idx ? 'var(--text)' : 'var(--text-dim)';
        kids[j].style.fontWeight = j === idx ? '700' : '400';
        if (j === idx) kids[j].scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  });
})();""",
  "LRC 时间标签支持 [mm:ss.xx] 与 [mm:ss.xxx] 两种写法。")

t("midi-keyboard", "虚拟键盘钢琴",
  "用电脑键盘弹钢琴。",
  "把电脑键盘当作钢琴键盘（A 行对应白键、W 行对应黑键），支持鼠标点击演奏，可切换八度与音色，可录音回放。",
  "钢琴 键盘 虚拟 midi 演奏",
  "documents-and-audio", "piano",
  """
<section class="tool-card">
  <div class="row">
    <label class="field"><span>八度</span><select id="oct"><option value="3">C3 起（低）</option><option value="4" selected>C4 起（中）</option><option value="5">C5 起（高）</option></select></label>
    <label class="field"><span>音色</span><select id="wave"><option value="triangle">钢琴感</option><option value="sine">正弦</option><option value="square">方波</option><option value="sawtooth">锯齿</option></select></label>
    <button class="btn" type="button" id="recBtn">● 录制</button>
    <button class="btn" type="button" id="playBtn" disabled>▶ 回放</button>
    <span class="stats" id="stats"></span>
  </div>
  <div id="keys" style="display:flex;position:relative;height:11rem;margin-top:0.9rem;user-select:none"></div>
  <p class="note">键盘映射：A S D F G H J K L 对应白键 C D E F G A B C D，W E T Y U O P 对应黑键。</p>
</section>
""",
  """(function () {
  'use strict';
  var KEYS = [
    { n: 'C', s: 0, k: 'a' }, { n: 'C#', s: 1, k: 'w' }, { n: 'D', s: 2, k: 's' }, { n: 'D#', s: 3, k: 'e' },
    { n: 'E', s: 4, k: 'd' }, { n: 'F', s: 5, k: 'f' }, { n: 'F#', s: 6, k: 't' }, { n: 'G', s: 7, k: 'g' },
    { n: 'G#', s: 8, k: 'y' }, { n: 'A', s: 9, k: 'h' }, { n: 'A#', s: 10, k: 'u' }, { n: 'B', s: 11, k: 'j' },
    { n: 'C+', s: 12, k: 'k' }, { n: 'D+', s: 14, k: 'l' }, { n: 'E+', s: 16, k: ';' }
  ];
  var ctx = null, pressed = {}, recording = [], recStart = 0, isRec = false;
  var box = document.getElementById('keys');
  function freq(semi) {
    var oct = parseInt(document.getElementById('oct').value);
    return 440 * Math.pow(2, (oct - 4) * 12 + semi - 9) / 1;
  }
  function build() {
    box.innerHTML = '';
    var whites = KEYS.filter(function (k) { return k.s % 12 in { 0: 1, 2: 1, 4: 1, 5: 1, 7: 1, 9: 1, 11: 1 }; });
    var w = 100 / whites.length;
    whites.forEach(function (k) {
      var d = document.createElement('div');
      d.dataset.k = k.k;
      d.style.cssText = 'flex:1;border:1px solid var(--border);border-radius:0 0 8px 8px;background:#fff;position:relative;display:flex;align-items:flex-end;justify-content:center;padding-bottom:0.4rem;font-size:0.7rem;color:#999';
      d.textContent = k.k.toUpperCase();
      box.appendChild(d);
    });
    var wi = 0;
    KEYS.filter(function (k) { return [1, 3, 6, 8, 10].indexOf(k.s % 12) >= 0 || k.s > 12 && [1, 3].indexOf(k.s % 12) >= 0; }).forEach(function (k) {
      var black = document.createElement('div');
      black.dataset.k = k.k;
      black.style.cssText = 'position:absolute;top:0;width:6.2%;height:60%;background:#222;border-radius:0 0 5px 5px;z-index:2';
      var wIdx = whites.findIndex(function (w2) { return w2.s > k.s; });
      black.style.left = (wIdx * w - 3.1) + '%';
      box.appendChild(black);
    });
  }
  function noteOn(semi, el) {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = document.getElementById('wave').value;
    o.frequency.value = freq(semi);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 1.5);
    if (el) { el.style.background = el.style.background === 'rgb(34, 34, 34)' ? '#2b6cb0' : 'color-mix(in srgb, #2b6cb0 30%, #fff)'; setTimeout(function () { el.style.background = el.dataset.k && el.offsetHeight < el.parentElement.offsetHeight * 0.7 ? '#222' : '#fff'; }, 200); }
    if (isRec) recording.push({ t: Date.now() - recStart, semi: semi });
  }
  box.addEventListener('pointerdown', function (e) {
    var el = e.target.closest('[data-k]');
    if (!el) return;
    var key = KEYS.find(function (k) { return k.k === el.dataset.k; });
    if (key) noteOn(key.s, el);
  });
  window.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (pressed[k] || !KEYS.find(function (x) { return x.k === k; })) return;
    pressed[k] = true;
    var key = KEYS.find(function (x) { return x.k === k; });
    var el = box.querySelector('[data-k="' + k + '"]');
    noteOn(key.s, el);
  });
  window.addEventListener('keyup', function (e) { pressed[e.key.toLowerCase()] = false; });
  document.getElementById('recBtn').addEventListener('click', function () {
    isRec = !isRec;
    this.textContent = isRec ? '■ 停止录制' : '● 录制';
    if (isRec) { recording = []; recStart = Date.now(); document.getElementById('playBtn').disabled = true; }
    else document.getElementById('playBtn').disabled = recording.length === 0;
    document.getElementById('stats').textContent = isRec ? '录制中…' : '已录 ' + recording.length + ' 个音符';
  });
  document.getElementById('playBtn').addEventListener('click', function () {
    recording.forEach(function (n) { setTimeout(function () { noteOn(n.semi, null); }, n.t); });
    document.getElementById('stats').textContent = '回放中…';
    setTimeout(function () { document.getElementById('stats').textContent = ''; }, recording.length ? recording[recording.length - 1].t + 1500 : 0);
  });
  document.getElementById('oct').addEventListener('change', build);
  build();
})();""",
  "先点一下页面激活声音；录制回放可以左手弹右手伴奏练配合。")
