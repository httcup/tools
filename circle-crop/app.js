(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var scale = 1, ox = 0, oy = 0, base = 1;
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
    cv.width = cv.height = 420;
    base = 420 / side;
    scale = 1; ox = oy = 0;
    document.getElementById('stats').textContent = img.naturalWidth + ' × ' + img.naturalHeight;
    draw();
  }
  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    var s = base * scale;
    var w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cv.width - w) / 2 + ox, (cv.height - h) / 2 + oy, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(cv.width / 2, cv.height / 2, cv.width / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cv.width / 2, cv.height / 2, cv.width / 2 - 1, 0, Math.PI * 2); ctx.stroke();
  }
  function out() {
    var n = parseInt(document.getElementById('size').value);
    var o = document.createElement('canvas'); o.width = o.height = n;
    o.getContext('2d').drawImage(cv, 0, 0, n, n);
    return o;
  }
  function refresh() { draw(); var dl = document.getElementById('dl'); dl.href = out().toDataURL('image/png'); dl.hidden = false; }
  cv.addEventListener('wheel', function (e) {
    if (!img) return;
    e.preventDefault();
    scale = Math.min(6, Math.max(0.3, scale * (e.deltaY < 0 ? 1.1 : 0.9)));
    refresh();
  }, { passive: false });
  var drag = null;
  cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, ox: ox, oy: oy }; });
  window.addEventListener('pointermove', function (e) {
    if (!drag || !img) return;
    ox = drag.ox + (e.clientX - drag.x); oy = drag.oy + (e.clientY - drag.y); draw();
  });
  window.addEventListener('pointerup', function () { if (drag) { drag = null; refresh(); } });
  document.getElementById('size').addEventListener('change', refresh);
  document.getElementById('reset').addEventListener('click', function () { scale = 1; ox = oy = 0; refresh(); });
})();
