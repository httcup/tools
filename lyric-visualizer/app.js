(function () {
  'use strict';
  var lines = [], cur = -1, actx = null, analyser = null, raf = null;
  var player = document.getElementById('player');
  var box = document.getElementById('lyrics');
  function parseLrc(text) {
    lines = [];
    text.split(/\r?\n/).forEach(function (l) {
      var m = l.match(/^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)$/);
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
})();
