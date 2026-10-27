(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var drawing = false, last = null;
  function resize() {
    var w = cv.clientWidth;
    var data = cv.toDataURL();
    cv.width = w;
    ctx.lineCap = ctx.lineJoin = 'round';
    if (data.length > 200) { var im = new Image(); im.onload = function () { ctx.drawImage(im, 0, 0); }; im.src = data; }
  }
  function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  cv.addEventListener('pointerdown', function (e) {
    drawing = true; last = pos(e);
    ctx.beginPath(); ctx.arc(last.x, last.y, document.getElementById('w').value / 2, 0, Math.PI * 2);
    ctx.fillStyle = document.getElementById('col').value; ctx.fill();
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drawing) return;
    var p = pos(e);
    ctx.strokeStyle = document.getElementById('col').value;
    ctx.lineWidth = parseFloat(document.getElementById('w').value);
    ctx.beginPath();
    if (document.getElementById('smooth').checked) {
      ctx.moveTo(last.x, last.y);
      ctx.quadraticCurveTo(last.x, last.y, (last.x + p.x) / 2, (last.y + p.y) / 2);
      ctx.lineTo(p.x, p.y);
    } else { ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); }
    ctx.stroke();
    last = p;
  });
  window.addEventListener('pointerup', function () { drawing = false; });
  document.getElementById('clear').addEventListener('click', function () { ctx.clearRect(0, 0, cv.width, cv.height); });
  document.getElementById('dl').addEventListener('click', function () {
    var out = document.createElement('canvas');
    out.width = cv.width; out.height = cv.height;
    out.getContext('2d').drawImage(cv, 0, 0);
    var a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = 'signature.png';
    a.click();
  });
  window.addEventListener('resize', resize);
  resize();
})();
