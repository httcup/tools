(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var undoStack = [], drawing = false, start = null, snapshot = null;
  function resize() {
    var w = cv.clientWidth;
    var data = cv.toDataURL();
    cv.width = w;
    if (data.length > 200) { var im = new Image(); im.onload = function () { ctx.drawImage(im, 0, 0); }; im.src = data; }
  }
  function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function styles() {
    ctx.strokeStyle = ctx.fillStyle = document.getElementById('col').value;
    ctx.lineWidth = parseFloat(document.getElementById('w').value);
    ctx.lineCap = ctx.lineJoin = 'round';
  }
  function save() { undoStack.push(cv.toDataURL()); if (undoStack.length > 30) undoStack.shift(); }
  cv.addEventListener('pointerdown', function (e) {
    drawing = true; start = pos(e);
    save();
    styles();
    if (document.getElementById('tool').value === 'text') {
      drawing = false;
      var txt = prompt('输入文字：');
      if (txt) {
        ctx.font = (parseFloat(document.getElementById('w').value) * 6 + 14) + 'px system-ui, sans-serif';
        ctx.fillText(txt, start.x, start.y);
      }
      return;
    }
    snapshot = ctx.getImageData(0, 0, cv.width, cv.height);
    if (document.getElementById('tool').value === 'pen') { ctx.beginPath(); ctx.moveTo(start.x, start.y); }
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drawing) return;
    var p = pos(e), tool = document.getElementById('tool').value;
    if (tool === 'pen') { ctx.lineTo(p.x, p.y); ctx.stroke(); return; }
    ctx.putImageData(snapshot, 0, 0);
    styles();
    ctx.beginPath();
    if (tool === 'line') { ctx.moveTo(start.x, start.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    if (tool === 'rect') ctx.strokeRect(Math.min(start.x, p.x), Math.min(start.y, p.y), Math.abs(p.x - start.x), Math.abs(p.y - start.y));
    if (tool === 'ellipse') {
      ctx.ellipse((start.x + p.x) / 2, (start.y + p.y) / 2, Math.abs(p.x - start.x) / 2, Math.abs(p.y - start.y) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  window.addEventListener('pointerup', function () { drawing = false; });
  document.getElementById('undo').addEventListener('click', function () {
    var d = undoStack.pop();
    if (!d) return;
    var im = new Image();
    im.onload = function () { ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(im, 0, 0); };
    im.src = d;
  });
  document.getElementById('clear').addEventListener('click', function () { save(); ctx.clearRect(0, 0, cv.width, cv.height); });
  document.getElementById('dl').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = 'whiteboard.png';
    a.click();
  });
  window.addEventListener('resize', resize);
  resize();
})();
