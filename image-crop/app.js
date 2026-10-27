(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var sel = null, dragging = false, sx = 0, sy = 0;
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
    draw();
    document.getElementById('stats').textContent = img.naturalWidth + ' × ' + img.naturalHeight;
  }
  function ratio() { return parseFloat(document.getElementById('ratio').value) || 0; }
  function pos(e) {
    var r = cv.getBoundingClientRect();
    var p = e.touches ? e.touches[0] : e;
    return { x: (p.clientX - r.left) * cv.width / r.width, y: (p.clientY - r.top) * cv.height / r.height };
  }
  function draw() {
    ctx.drawImage(img, 0, 0);
    if (sel) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.clearRect(sel.x, sel.y, sel.w, sel.h);
      ctx.drawImage(img, sel.x, sel.y, sel.w, sel.h, sel.x, sel.y, sel.w, sel.h);
      ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 2;
      ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
    }
  }
  function start(e) { if (!img) return; dragging = true; var p = pos(e); sx = p.x; sy = p.y; sel = { x: sx, y: sy, w: 0, h: 0 }; e.preventDefault(); }
  function move(e) {
    if (!dragging || !img) return;
    var p = pos(e), R = ratio();
    var w = p.x - sx, h = p.y - sy;
    if (R) { if (Math.abs(w) > Math.abs(h) * R) h = Math.sign(h || 1) * Math.abs(w) / R; else w = Math.sign(w || 1) * Math.abs(h) * R; }
    sel = { x: Math.min(sx, sx + w), y: Math.min(sy, sy + h), w: Math.abs(w), h: Math.abs(h) };
    draw(); e.preventDefault();
  }
  function end() {
    if (!dragging) return;
    dragging = false;
    if (sel && sel.w > 4 && sel.h > 4) {
      var out = document.createElement('canvas');
      out.width = Math.round(sel.w); out.height = Math.round(sel.h);
      out.getContext('2d').drawImage(img, sel.x, sel.y, sel.w, sel.h, 0, 0, out.width, out.height);
      var dl = document.getElementById('dl');
      dl.href = out.toDataURL('image/png'); dl.hidden = false;
      document.getElementById('stats').textContent = out.width + ' × ' + out.height + ' 已生成';
    }
  }
  cv.addEventListener('mousedown', start); cv.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  cv.addEventListener('touchstart', start, { passive: false }); cv.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', end);
})();
