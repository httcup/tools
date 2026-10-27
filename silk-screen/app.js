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
    var maxW = 720;
    var s = Math.min(1, maxW / img.naturalWidth);
    cv.width = Math.round(img.naturalWidth * s);
    cv.height = Math.round(img.naturalHeight * s);
    render();
  }
  function render() {
    if (!img) return;
    var gap = parseInt(document.getElementById('dot').value);
    var cols = [document.getElementById('cC').value, document.getElementById('cM').value, document.getElementById('cY').value];
    var angles = [15, 75, 0];
    var tmp = document.createElement('canvas');
    tmp.width = cv.width; tmp.height = cv.height;
    var tc = tmp.getContext('2d');
    tc.drawImage(img, 0, 0, cv.width, cv.height);
    var d = tc.getImageData(0, 0, cv.width, cv.height).data;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'multiply';
    [0, 1, 2].forEach(function (ch) {
      ctx.fillStyle = cols[ch];
      var a = angles[ch] * Math.PI / 180;
      ctx.save();
      ctx.translate(cv.width / 2, cv.height / 2);
      ctx.rotate(a);
      ctx.translate(-cv.width / 2, -cv.height / 2);
      for (var y = -gap; y < cv.height + gap * 2; y += gap) {
        for (var x = -gap; x < cv.width + gap * 2; x += gap) {
          var sx = Math.round(x + cv.width / 2 * 0), sy = Math.round(y);
          if (sx >= 0 && sx < cv.width && sy >= 0 && sy < cv.height) {
            var v = d[(sy * cv.width + Math.min(cv.width - 1, sx)) * 4 + ch] / 255;
            var r = gap * 0.62 * Math.sqrt(1 - v);
            if (r > 0.3) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
          }
        }
      }
      ctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over';
    var dl = document.getElementById('dl');
    dl.href = cv.toDataURL('image/png'); dl.hidden = false;
    document.getElementById('stats').textContent = '网点 ' + gap + 'px';
  }
  ['dot', 'cC', 'cM', 'cY'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
  });
})();
