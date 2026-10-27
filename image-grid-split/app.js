(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
var img = null;
  function loadFile(f) {
    if (!f || f.type.indexOf('image/') !== 0) return;
    var url = URL.createObjectURL(f);
    var im = new Image();
    im.onload = function () { img = im; onImage(); };
    im.src = url;
  }
  var drop = document.getElementById('drop');
  ['dragover', 'dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      drop.classList.toggle('over', ev === 'dragover');
      if (ev === 'drop') loadFile(e.dataTransfer.files[0]);
    });
  });
  document.getElementById('file').addEventListener('change', function (e) { loadFile(e.target.files[0]); });
  function onImage() {
    var side = Math.min(img.naturalWidth, img.naturalHeight);
    cv.width = cv.height = Math.min(side, 500);
    draw();
  }
  function draw() {
    var side = Math.min(img.naturalWidth, img.naturalHeight);
    var sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, cv.width, cv.height);
    var n = parseInt(document.getElementById('g').value);
    ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 1.5;
    for (var i = 1; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(i * cv.width / n, 0); ctx.lineTo(i * cv.width / n, cv.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cv.height / n); ctx.lineTo(cv.width, i * cv.height / n); ctx.stroke();
    }
  }
  document.getElementById('g').addEventListener('change', function () { if (img) draw(); });
  document.getElementById('goBtn').addEventListener('click', function () {
    if (!img) return;
    var n = parseInt(document.getElementById('g').value);
    var cell = cv.width / n;
    for (var i = 0; i < n * n; i++) {
      (function (idx) {
        setTimeout(function () {
          var c = document.createElement('canvas');
          c.width = c.height = cell;
          c.getContext('2d').drawImage(cv, (idx % n) * cell, Math.floor(idx / n) * cell, cell, cell, 0, 0, cell, cell);
          var a = document.createElement('a');
          a.href = c.toDataURL('image/png');
          a.download = 'grid-' + (idx + 1) + '.png';
          a.click();
        }, idx * 220);
      })(i);
    }
  });
})();
