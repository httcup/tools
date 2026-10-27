(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var mode = 'none';
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
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    document.getElementById('stats').textContent = cv.width + ' × ' + cv.height;
    draw();
  }
  function draw() {
    ctx.save();
    if (mode === 'h') { ctx.translate(cv.width, 0); ctx.scale(-1, 1); }
    if (mode === 'v') { ctx.translate(0, cv.height); ctx.scale(1, -1); }
    if (mode === 'b') { ctx.translate(cv.width, cv.height); ctx.rotate(Math.PI); }
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    var dl = document.getElementById('dl');
    dl.href = cv.toDataURL('image/png'); dl.hidden = false;
  }
  [['hBtn', 'h'], ['vBtn', 'v'], ['bBtn', 'b']].forEach(function (p) {
    document.getElementById(p[0]).addEventListener('click', function () {
      mode = (mode === p[1] ? 'none' : p[1]); if (img) draw();
    });
  });
})();
