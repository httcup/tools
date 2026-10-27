(function () {
  'use strict';
  function map(alpha, digits) {
    return function (s) {
      return s.split('').map(function (c) {
        var i = c.charCodeAt(0);
        if (i >= 65 && i <= 90) return alpha[i - 65][0] ? String.fromCodePoint(alpha[i - 65][0] + (alpha[i - 65][1] || 0)) : c;
        if (i >= 97 && i <= 122) return alpha[i - 97][0] ? String.fromCodePoint(alpha[i - 97][0] + (alpha[i - 97][1] || 0)) : c;
        if (i >= 48 && i <= 57 && digits) return String.fromCodePoint(digits[0] + (i - 48) * (digits[1] || 1));
        return c;
      }).join('');
    };
  }
  var styles = [
    ['花体（衬线粗体）', map(Array.from({length: 26}, function (_, i) { return [0x1D4D0 + i]; }), [0x1D7CE])],
    ['斜体粗体', map(Array.from({length: 26}, function (_, i) { return [0x1D468 + i]; }), [0x1D7CE])],
    ['双线体', map(Array.from({length: 26}, function (_, i) { return [0x1D538 + i]; }), [0x1D7D8])],
    ['圆圈体', function (s) {
      var circ = '⓪①②③④⑤⑥⑦⑧⑨';
      var up = map(Array.from({length: 26}, function (_, i) { return [0x24B6 + i]; }), null);
      return up(s).split('').map(function (c) {
        return (c >= '0' && c <= '9') ? circ[+c] : c;
      }).join('');
    }],
    ['方框体', map(Array.from({length: 26}, function (_, i) { return [0x1F130 + i]; }), null)],
    ['小型大写', function (s) {
      var m = { a:'ᴀ', b:'ʙ', c:'ᴄ', d:'ᴅ', e:'ᴇ', f:'ꜰ', g:'ɢ', h:'ʜ', i:'ɪ', j:'ᴊ', k:'ᴋ', l:'ʟ', m:'ᴍ', n:'ɴ', o:'ᴏ', p:'ᴘ', q:'ǫ', r:'ʀ', s:'ѕ', t:'ᴛ', u:'ᴜ', v:'ᴠ', w:'ᴡ', x:'x', y:'ʏ', z:'ᴢ' };
      return s.toLowerCase().split('').map(function (c) { return m[c] || c; }).join('');
    }],
    ['波浪删除线', function (s) { return s.split('').join('̶'); }]
  ];
  function render() {
    var s = document.getElementById('fIn').value;
    var out = document.getElementById('fOut');
    out.innerHTML = styles.map(function (st) {
      var v = '';
      try { v = st[1](s); } catch (e) { v = '（转换失败）'; }
      return '<li style="cursor:pointer" data-copy="' + TK.esc(v) + '"><b style="min-width:6.5rem;display:inline-block;color:var(--text-dim);font-weight:400">' + st[0] + '</b> ' + TK.esc(v) + '</li>';
    }).join('');
  }
  document.getElementById('fIn').addEventListener('input', render);
  document.getElementById('fOut').addEventListener('click', function (e) {
    var li = e.target.closest('[data-copy]');
    if (li && navigator.clipboard) navigator.clipboard.writeText(li.dataset.copy);
  });
  render();
})();
