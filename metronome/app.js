(function () {
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
})();
