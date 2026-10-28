(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var img = null, baseName = 'image', exportW = 0, exportH = 0;
  var MAX_DIM = 4096;
  var $ = function (id) { return document.getElementById(id); };

  function loadFile(f) {
    if (!f || f.type.indexOf('image/') !== 0) return;
    baseName = (f.name || 'image').replace(/\.[^.]+$/, '') || 'image';
    var url = URL.createObjectURL(f);
    var im = new Image();
    im.onload = function () { img = im; URL.revokeObjectURL(url); onImage(); };
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
  document.getElementById('replace').addEventListener('click', function () { document.getElementById('file').click(); });
  document.addEventListener('paste', function (e) {
    var files = (e.clipboardData || {}).files;
    if (files && files.length) loadFile(files[0]);
  });

  function onImage() {
    var w = img.naturalWidth, h = img.naturalHeight;
    var scale = Math.min(1, MAX_DIM / Math.max(w, h));
    exportW = Math.round(w * scale);
    exportH = Math.round(h * scale);
    cv.width = exportW; cv.height = exportH;
    /* 首次加载时按图宽给一个合适的默认字号 */
    if (!onImage.done) {
      $('fsize').value = Math.max(12, Math.min(72, Math.round(exportW / 42)));
      onImage.done = true;
    }
    document.getElementById('editor').hidden = false;
    document.getElementById('ctrls').hidden = false;
    $('stats').textContent = w + ' \u00d7 ' + h + (scale < 1 ? ' \u2192 导出 ' + exportW + ' \u00d7 ' + exportH : '');
    render();
  }

  function render() {
    if (!img) return;
    $('op-v').textContent = $('opacity').value + '%';
    $('fs-v').textContent = $('fsize').value;
    $('rot-v').innerHTML = $('rot').value + '&deg;';
    $('gx-v').textContent = $('gapx').value;
    $('gy-v').textContent = $('gapy').value;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, exportW, exportH);
    var text = $('text').value;
    if (!text.trim()) return;
    var ls = text.split('\n');
    var fs = +$('fsize').value;
    var lh = fs * 1.45;
    ctx.save();
    ctx.globalAlpha = +$('opacity').value / 100;
    ctx.font = ($('bold').checked ? 'bold ' : '') + fs + 'px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = $('color').value;
    var stroke = $('stroke').checked;
    if (stroke) { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(2, fs / 12); ctx.lineJoin = 'round'; }
    var tw = 0;
    ls.forEach(function (l) { tw = Math.max(tw, ctx.measureText(l).width); });
    var gx = tw + +$('gapx').value, gy = lh * ls.length + +$('gapy').value;
    var rad = +$('rot').value * Math.PI / 180;
    var diag = Math.sqrt(cv.width * cv.width + cv.height * cv.height) / 2 + gx + gy;
    for (var y = cv.height / 2 - diag; y <= cv.height / 2 + diag; y += gy) {
      for (var x = cv.width / 2 - diag; x <= cv.width / 2 + diag; x += gx) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rad);
        for (var i = 0; i < ls.length; i++) {
          var yy = (i - (ls.length - 1) / 2) * lh;
          if (stroke) ctx.strokeText(ls[i], 0, yy);
          ctx.fillText(ls[i], 0, yy);
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  ['text', 'color', 'opacity', 'fsize', 'rot', 'gapx', 'gapy', 'bold', 'stroke'].forEach(function (id) {
    $(id).addEventListener('input', render);
    $(id).addEventListener('change', render);
  });

  document.getElementById('presets').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-t]');
    if (!b) return;
    $('text').value = b.dataset.t;
    render();
  });

  document.getElementById('dl').addEventListener('click', function () {
    if (!img) return;
    var fmt = $('fmt').value;
    cv.toBlob(function (b) {
      if (!b) return;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = baseName + '-watermark.' + (fmt === 'jpeg' ? 'jpg' : 'png');
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }, 'image/' + fmt, 0.92);
  });
})();
