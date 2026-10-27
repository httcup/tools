(function () {
  'use strict';
  var M = { A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....', I:'..', J:'.---',
    K:'-.-', L:'.-..', M:'--', N:'-.', O:'---', P:'.--.', Q:'--.-', R:'.-.', S:'...', T:'-',
    U:'..-', V:'...-', W:'.--', X:'-..-', Y:'-.--', Z:'--..',
    '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',
    '.':'.-.-.-', ',':'--..--', '?':'..--..', '!':'-.-.--', '/':'-..-.', '@':'.--.-.', '-':'-....-' };
  var R = {};
  Object.keys(M).forEach(function (k) { R[M[k]] = k; });
  var ctx = null, stopFlag = false;
  function toMorse(s) {
    return s.toUpperCase().split(/\s+/).map(function (w) {
      return w.split('').map(function (c) { return M[c] || c; }).join(' ');
    }).join(' / ');
  }
  function fromMorse(s) {
    return s.split(/\s*\/\s*/).map(function (w) {
      return w.trim().split(/\s+/).map(function (c) { return R[c] !== undefined ? R[c] : c; }).join('');
    }).join(' ');
  }
  function render() {
    var v = document.getElementById('txtIn').value;
    var out = document.getElementById('txtOut');
    if (!v.trim()) { out.value = ''; document.getElementById('stats').textContent = ''; return; }
    var isMorse = /^[.\-/\s]+$/.test(v);
    out.value = isMorse ? fromMorse(v) : toMorse(v);
    document.getElementById('stats').textContent = isMorse ? '识别为摩斯电码 → 文本' : '识别为文本 → 摩斯电码';
  }
  function play() {
    var code = toMorse(document.getElementById('txtIn').value).replace(/\//g, '');
    var unit = 1.2 / (parseFloat(document.getElementById('wpm').value) || 15);
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    var t0 = ctx.currentTime + 0.1, gain = ctx.createGain();
    gain.gain.value = 0; gain.connect(ctx.destination);
    var osc = ctx.createOscillator();
    osc.frequency.value = 600; osc.connect(gain);
    stopFlag = false;
    code.split('').forEach(function (ch) {
      if (stopFlag) return;
      if (ch === '.') { beep(gain, t0, unit); t0 += unit * 2; }
      else if (ch === '-') { beep(gain, t0, unit * 3); t0 += unit * 4; }
      else if (ch === ' ') t0 += unit * 3;
    });
    osc.start(t0 - 0.5); osc.stop(t0 + 0.2);
  }
  function beep(gain, t, dur) {
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.setValueAtTime(0, t + dur);
  }
  document.getElementById('txtIn').addEventListener('input', render);
  document.getElementById('playBtn').addEventListener('click', play);
  document.getElementById('stopBtn').addEventListener('click', function () { stopFlag = true; });
})();
