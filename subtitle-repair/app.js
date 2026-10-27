(function () {
  'use strict';
  function parseTs(s) {
    var m = s.trim().match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    return m ? (+m[1]) * 3600000 + (+m[2]) * 60000 + (+m[3]) * 1000 + (+m[4]) : null;
  }
  function fmtTs(ms) {
    ms = Math.max(0, Math.round(ms));
    var h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, f = ms % 1000;
    var p = function (n, w) { return String(n).padStart(w, '0'); };
    return p(h, 2) + ':' + p(m, 2) + ':' + p(s, 2) + ',' + p(f, 3);
  }
  function run() {
    var src = document.getElementById('sIn').value;
    var shift = parseFloat(document.getElementById('sShift').value) * 1000 || 0;
    var scale = parseFloat(document.getElementById('sScale').value) || 1;
    var lines = src.split(/\r?\n/), out = [], n = 0;
    lines.forEach(function (line) {
      var m = line.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
      if (m) {
        var a = parseTs(m[1]), b = parseTs(m[2]);
        out.push(fmtTs(a * scale + shift) + ' --> ' + fmtTs(b * scale + shift));
        n++;
      } else out.push(line);
    });
    var text = out.join('\n');
    document.getElementById('sOut').value = text;
    document.getElementById('sStats').textContent = n + ' 条字幕';
  }
  document.getElementById('sRun').addEventListener('click', run);
  document.getElementById('sIn').addEventListener('input', function () {
    document.getElementById('sStats').textContent = '';
  });
  document.getElementById('sDl').addEventListener('click', function () {
    TK.download('fixed.srt', document.getElementById('sOut').value);
  });
})();
