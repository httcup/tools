(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  function data() {
    return document.getElementById('data').value.split('\n').map(function (l) {
      var m = l.split(/[,，]/);
      return { k: (m[0] || '').trim(), v: parseFloat((m[1] || '').trim()) };
    }).filter(function (d) { return d.k && isFinite(d.v); }).slice(0, 16);
  }
  function shade(hex, f) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    var m = function (v) { return Math.round(Math.max(0, Math.min(255, v * f))); };
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  function draw() {
    var d = data(), type = document.getElementById('ct').value;
    var W = 860, H = 480;
    cv.width = W; cv.height = H;
    var color = document.getElementById('color').value;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1a202c';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(document.getElementById('title').value || '', W / 2, 40);
    if (!d.length) { ctx.fillStyle = '#999'; ctx.font = '16px sans-serif'; ctx.fillText('请输入数据', W / 2, H / 2); return; }
    var mx = Math.max.apply(null, d.map(function (x) { return x.v; }));
    if (type === 'pie') {
      var total = d.reduce(function (s, x) { return s + x.v; }, 0);
      var cx = W / 2, cy = H / 2 + 20, r = 170, ang = -Math.PI / 2;
      d.forEach(function (x, i) {
        var a = x.v / total * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, ang, ang + a);
        ctx.closePath();
        ctx.fillStyle = shade(color, 0.55 + 0.45 * i / Math.max(1, d.length - 1));
        ctx.fill();
        var mid = ang + a / 2;
        ctx.fillStyle = '#fff'; ctx.font = '600 14px sans-serif';
        if (a > 0.25) ctx.fillText(Math.round(x.v / total * 100) + '%', cx + Math.cos(mid) * r * 0.65, cy + Math.sin(mid) * r * 0.65);
        ctx.fillStyle = '#1a202c'; ctx.textAlign = 'left';
        ctx.fillText(x.k + ' ' + x.v, 24, 84 + i * 26);
        ctx.fillStyle = shade(color, 0.55 + 0.45 * i / Math.max(1, d.length - 1));
        ctx.fillRect(8, 74 + i * 26, 12, 12);
        ctx.fillStyle = '#1a202c'; ctx.textAlign = 'center';
        ang += a;
      });
    } else {
      var pad = { l: 60, r: 30, t: 80, b: 50 };
      var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
      ctx.strokeStyle = '#e2e6eb';
      ctx.fillStyle = '#8a94a1';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      for (var g = 0; g <= 5; g++) {
        var y = pad.t + ih - ih * g / 5;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.fillText(Math.round(mx * g / 5), pad.l - 8, y + 4);
      }
      var bw = iw / d.length;
      d.forEach(function (x, i) {
        var cx = pad.l + bw * i + bw / 2;
        ctx.fillStyle = '#5a6472';
        ctx.textAlign = 'center';
        ctx.fillText(x.k, cx, H - pad.b + 20);
        var vh = x.v / mx * ih;
        ctx.fillStyle = shade(color, 0.6 + 0.4 * i / Math.max(1, d.length - 1));
        if (type === 'bar') {
          ctx.fillRect(cx - bw * 0.3, pad.t + ih - vh, bw * 0.6, vh);
          ctx.fillText(x.v, cx, pad.t + ih - vh - 6);
        } else {
          var px = pad.l + bw * i + bw / 2;
          var py = pad.t + ih - vh;
          if (i > 0) {
            var prev = d[i - 1].v / mx * ih;
            ctx.strokeStyle = color; ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(pad.l + bw * (i - 1) + bw / 2, pad.t + ih - prev);
            ctx.lineTo(px, py);
            ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillText(x.v, px, py - 8);
        }
      });
    }
    document.getElementById('dlPng').onclick = function () {
      var a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = 'chart.png';
      a.click();
    };
  }
  ['ct', 'title', 'color', 'data'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', draw);
  });
  draw();
})();
