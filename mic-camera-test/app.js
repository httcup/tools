(function () {
  'use strict';
  var micStream = null, camStream = null, actx = null, raf = null;
  document.getElementById('micBtn').addEventListener('click', function () {
    if (micStream) {
      micStream.getTracks().forEach(function (t) { t.stop(); });
      micStream = null;
      this.textContent = '开启麦克风测试';
      cancelAnimationFrame(raf);
      document.getElementById('meter').style.width = '0%';
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
      micStream = s;
      document.getElementById('micBtn').textContent = '停止测试';
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      var src = actx.createMediaStreamSource(s);
      var an = actx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      var d = new Uint8Array(an.fftSize);
      (function frame() {
        raf = requestAnimationFrame(frame);
        an.getByteTimeDomainData(d);
        var peak = 0;
        for (var i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i] - 128));
        var pct = Math.min(100, peak / 64 * 100);
        document.getElementById('meter').style.width = pct + '%';
        document.getElementById('meter').style.background = pct > 85 ? '#c2554d' : pct > 4 ? 'var(--ok)' : 'var(--border)';
        document.getElementById('micStats').textContent = pct > 4 ? '检测到声音 ✓（音量 ' + Math.round(pct) + '%）' : '没有检测到声音';
      })();
    }).catch(function (e) {
      document.getElementById('micStats').textContent = '无法访问麦克风：' + e.name;
    });
  });
  document.getElementById('camBtn').addEventListener('click', function () {
    var v = document.getElementById('video');
    if (camStream) {
      camStream.getTracks().forEach(function (t) { t.stop(); });
      camStream = null; v.hidden = true;
      this.textContent = '开启摄像头测试';
      document.getElementById('camStats').textContent = '';
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { width: 640 } }).then(function (s) {
      camStream = s;
      v.srcObject = s; v.hidden = false;
      document.getElementById('camBtn').textContent = '停止测试';
      document.getElementById('camStats').textContent = '摄像头工作正常 ✓（' + s.getVideoTracks()[0].label + '）';
    }).catch(function (e) {
      document.getElementById('camStats').textContent = '无法访问摄像头：' + e.name;
    });
  });
})();
