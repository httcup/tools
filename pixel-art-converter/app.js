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
  function onImage() { cv.width = img.naturalWidth; cv.height = img.naturalHeight; render(); }
  function quant(v, levels) {
    var step = 255 / (levels - 1);
    return Math.round(Math.round(v / step) * step);
  }
  function render() {
    if (!img) return;
    var px = parseInt(document.getElementById('px').value);
    var levels = parseInt(document.getElementById('pal').value);
    var w = Math.max(1, Math.round(cv.width / px)), h = Math.max(1, Math.round(cv.height / px));
    var tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    var tc = tmp.getContext('2d');
    tc.drawImage(img, 0, 0, w, h);
    var d = tc.getImageData(0, 0, w, h);
    for (var i = 0; i < d.data.length; i += 4) {
      d.data[i] = quant(d.data[i], levels);
      d.data[i + 1] = quant(d.data[i + 1], levels);
      d.data[i + 2] = quant(d.data[i + 2], levels);
    }
    tc.putImageData(d, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(tmp, 0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = true;
    var dl = document.getElementById('dl');
    dl.href = cv.toDataURL('image/png'); dl.hidden = false;
    document.getElementById('stats').textContent = '块 ' + px + 'px · ' + levels + ' 级色';
  }
  ['px', 'pal'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
  });
})();
