(function () {
  'use strict';
  var left = 0, endAt = 0, timer = null, running = false;
  var clock = document.getElementById('clock');
  function show() {
    var h = Math.floor(left / 3600), m = Math.floor(left / 60) % 60, s = left % 60;
    clock.textContent = (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.3, 0.6].forEach(function (t) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 990;
        g.gain.setValueAtTime(0.3, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.26);
      });
    } catch (e) {}
  }
  function set() { left = (parseInt(document.getElementById('m').value) || 0) * 60 + (parseInt(document.getElementById('s').value) || 0); show(); }
  document.getElementById('go').addEventListener('click', function () {
    if (running) { running = false; clearInterval(timer); left = Math.round((endAt - Date.now()) / 1000); this.textContent = '▶ 继续'; return; }
    if (left <= 0) set();
    if (left <= 0) return;
    running = true;
    endAt = Date.now() + left * 1000;
    this.textContent = '⏸ 暂停';
    timer = setInterval(function () {
      left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      show();
      if (left <= 0) {
        running = false;
        clearInterval(timer);
        document.getElementById('go').textContent = '▶ 开始';
        beep();
      }
    }, 250);
  });
  document.getElementById('resetBtn').addEventListener('click', function () {
    running = false; clearInterval(timer);
    document.getElementById('go').textContent = '▶ 开始';
    set();
  });
  ['m', 's'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () { if (!running) set(); });
  });
  set();
})();
