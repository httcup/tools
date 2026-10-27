(function () {
  'use strict';
  var drop = document.getElementById('drop'), fileBuf = null, fname = 'audio', decoded = null;
  function load(f) {
    if (!f) return;
    fname = f.name.replace(/\.[^.]+$/, '');
    var fr = new FileReader();
    fr.onload = function () {
      fileBuf = fr.result;
      document.getElementById('player').src = URL.createObjectURL(f);
      document.getElementById('optsCard').hidden = false;
      document.getElementById('stats').textContent = '已载入 ' + f.name;
    };
    fr.readAsArrayBuffer(f);
  }
  ['dragover', 'dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      drop.classList.toggle('over', ev === 'dragover');
      if (ev === 'drop') load(e.dataTransfer.files[0]);
    });
  });
  document.getElementById('file').addEventListener('change', function (e) { load(e.target.files[0]); });
  function encodeWav(chans, rate) {
    var n = chans[0].length, numCh = chans.length;
    var buf = new ArrayBuffer(44 + n * numCh * 2), v = new DataView(buf);
    function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n * numCh * 2, true); str(8, 'WAVE');
    str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, numCh, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * numCh * 2, true);
    v.setUint16(32, numCh * 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * numCh * 2, true);
    var off = 44;
    for (var i = 0; i < n; i++) for (var c = 0; c < numCh; c++) {
      var s = Math.max(-1, Math.min(1, chans[c][i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2;
    }
    return new Blob([buf], { type: 'audio/wav' });
  }
  document.getElementById('go').addEventListener('click', function () {
    if (!fileBuf) return;
    var ac = new (window.AudioContext || window.webkitAudioContext)();
    document.getElementById('stats').textContent = '解码中…';
    ac.decodeAudioData(fileBuf.slice(0)).then(function (a) {
      var rate = parseInt(document.getElementById('rate').value) || a.sampleRate;
      var targetCh = parseInt(document.getElementById('ch').value) || a.numberOfChannels;
      var ratio = rate / a.sampleRate;
      var n = Math.round(a.length * ratio);
      var chans = [];
      for (var c = 0; c < targetCh; c++) {
        var src = a.getChannelData(Math.min(c, a.numberOfChannels - 1));
        var out = new Float32Array(n);
        for (var i = 0; i < n; i++) out[i] = src[Math.min(src.length - 1, Math.round(i / ratio))];
        chans.push(out);
      }
      var blob = encodeWav(chans, rate);
      TK.downloadBlob(fname + '.wav', blob);
      document.getElementById('stats').textContent = '完成：' + rate + ' Hz · ' + targetCh + ' 声道 · ' + (blob.size / 1048576).toFixed(1) + ' MB';
      ac.close();
    }).catch(function (e) {
      document.getElementById('stats').textContent = '解码失败：' + e;
    });
  });
})();
