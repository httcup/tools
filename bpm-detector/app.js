(function () {
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
})();
