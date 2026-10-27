(function () {
  'use strict';
  var phase = 'work', left = 0, timer = null, running = false, rounds = 0;
  var clock = document.getElementById('clock'), tag = document.getElementById('phase');
  function show() {
    var m = Math.floor(left / 60), s = left % 60;
    clock.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    document.title = running ? clock.textContent + ' ' + (phase === 'work' ? '专注中' : '休息中') : document.title;
  }
  function setPhase(p) {
    phase = p;
    var mins = parseInt(document.getElementById(p === 'work' ? 'work' : 'rest').value) || (p === 'work' ? 25 : 5);
    left = mins * 60;
    tag.textContent = p === 'work' ? '专注' : '休息';
    tag.className = 'tag ' + (p === 'work' ? 'c-low' : 'c-ok');
    show();
  }
  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  }
  document.getElementById('go').addEventListener('click', function () {
    running = !running;
    this.textContent = running ? '⏸ 暂停' : '▶ 开始';
    if (running && left === 0) setPhase('work');
    if (running) {
      timer = setInterval(function () {
        left--;
        if (left <= 0) {
          beep();
          if (phase === 'work') { rounds++; document.getElementById('stats').textContent = '已完成 ' + rounds + ' 轮'; setPhase('rest'); }
          else setPhase('work');
        }
        show();
      }, 1000);
    } else clearInterval(timer);
  });
  document.getElementById('reset').addEventListener('click', function () {
    clearInterval(timer); running = false; rounds = 0;
    document.getElementById('go').textContent = '▶ 开始';
    document.getElementById('stats').textContent = '已完成 0 轮';
    setPhase('work');
  });
  ['work', 'rest'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () { if (!running) setPhase(phase); });
  });
  setPhase('work');
})();
