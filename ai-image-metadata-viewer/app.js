(function () {
  'use strict';
  var drop = document.getElementById('drop');
  function show(rows, stat) {
    document.getElementById('res').innerHTML = rows.map(function (r) {
      return '<dt>' + TK.esc(r[0]) + '</dt><dd style="white-space:pre-wrap;max-width:60ch">' + TK.esc(r[1]) + '</dd>';
    }).join('') || '<dt>没有找到</dt><dd>这个文件没有可读的文本元数据。</dd>';
    document.getElementById('stats').textContent = stat;
  }
  function parsePng(buf) {
    var v = new DataView(buf), rows = [];
    if (v.getUint32(0) !== 0x89504E47) return null;
    var off = 8;
    while (off + 12 <= buf.byteLength) {
      var len = v.getUint32(off), type = String.fromCharCode(v.getUint8(off + 4), v.getUint8(off + 5), v.getUint8(off + 6), v.getUint8(off + 7));
      if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
        var bytes = new Uint8Array(buf, off + 8, len);
        var s = new TextDecoder('latin1').decode(bytes);
        var nul = s.indexOf('\u0000');
        var key = s.slice(0, nul), val = s.slice(nul + 1).replace(/^\u0000.\u0000/, '');
        if (type === 'zTXt') val = '(压缩数据，未解压)';
        if (key === 'iTXt' || type === 'iTXt') { var parts = s.split('\u0000'); key = parts[0]; val = parts.slice(5).join('\u0000'); }
        rows.push([key, val]);
      }
      if (type === 'IEND') break;
      off += 12 + len;
    }
    return rows;
  }
  function parseJpeg(buf) {
    var v = new DataView(buf), off = 2, rows = [];
    while (off + 4 < buf.byteLength) {
      if (v.getUint8(off) !== 0xFF) { off++; continue; }
      var marker = v.getUint8(off + 1), len = v.getUint16(off + 2);
      if (marker === 0xE1 && off + 4 + 6 < buf.byteLength) {
        var head = new TextDecoder('latin1').decode(new Uint8Array(buf, off + 4, 6));
        if (head === 'Exif\u0000\u0000') {
          try {
            var dv = new DataView(buf, off + 10);
            var le = dv.getUint16(0) === 0x4949;
            var ifd = dv.getUint32(4, le);
            var names = { 271: '厂商', 272: '型号', 306: '拍摄时间', 305: '软件', 8298: '版权', 270: '描述' };
            for (var i = 0; i < 60; i++) {
              var e = ifd + 12 * i;
              if (e + 12 > dv.byteLength) break;
              var tag = dv.getUint16(e, le);
              if (names[tag]) {
                var cnt = dv.getUint32(e + 4, le);
                var vo = dv.getUint32(e + 8, le);
                if (vo + cnt <= dv.byteLength) rows.push([names[tag], new TextDecoder().decode(new Uint8Array(dv.buffer, dv.byteOffset + vo, cnt)).replace(/\u0000+$/, '')]);
              }
            }
          } catch (err) { rows.push(['EXIF', '解析失败']); }
        }
      }
      if (marker === 0xDA) break;
      off += 2 + len;
    }
    return rows;
  }
  function load(f) {
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      var buf = fr.result;
      var rows = parsePng(buf) || parseJpeg(buf) || [];
      show(rows, f.name + ' · ' + (buf.byteLength / 1024).toFixed(0) + ' KB');
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
})();
