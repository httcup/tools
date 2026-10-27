(function () {
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
})();
