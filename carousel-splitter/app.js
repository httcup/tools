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
  function slices() {
    var mode = document.getElementById('mode').value;
    var n = parseInt(document.getElementById('n').value) || 4;
    var H = img.naturalHeight, W = img.naturalWidth;
    var count = mode === 'count' ? n : Math.max(1, Math.ceil(H / n));
    count = Math.min(count, 30);
    var h = Math.ceil(H / count);
    var list = [];
    for (var i = 0; i < count; i++) {
      var y = i * (H - h) / Math.max(1, count - 1);
      list.push({ y: Math.round(y), h: h });
    }
    return list;
  }
  function onImage() {
    cv.width = Math.min(img.naturalWidth, 420);
    cv.height = Math.min(img.naturalHeight, 900);
    document.getElementById('stats').textContent = img.naturalWidth + ' × ' + img.naturalHeight;
    draw();
  }
  function draw() {
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#2b6cb0'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
    slices().forEach(function (s, i) {
      if (i === 0) return;
      var y = s.y / img.naturalHeight * cv.height;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y); ctx.stroke();
    });
    ctx.setLineDash([]);
  }
  function files() {
    return slices().map(function (s, i) {
      var c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = s.h;
      c.getContext('2d').drawImage(img, 0, s.y, img.naturalWidth, s.h, 0, 0, c.width, c.height);
      return { name: 'slide-' + (i + 1) + '.png', blob: c.toDataURL('image/png') };
    });
  }
  document.getElementById('n').addEventListener('input', function () { if (img) draw(); });
  document.getElementById('mode').addEventListener('change', function () { if (img) draw(); });
  document.getElementById('zipBtn').addEventListener('click', function () {
    if (!img) return;
    var parts = files().map(function (f) {
      var b = f.blob.split(',')[1], bin = atob(b), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return { name: f.name, data: arr };
    });
    if (window.TkZip) TkZip.build(parts, 'carousel.zip');
    else parts.forEach(function (p, i) {
      var a = document.createElement('a');
      a.href = 'data:image/png;base64,' + btoa(String.fromCharCode.apply(null, p.data));
      a.download = p.name;
      setTimeout(function () { a.click(); }, i * 250);
    });
  });
})();
