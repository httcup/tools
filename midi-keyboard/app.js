(function () {
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
})();
