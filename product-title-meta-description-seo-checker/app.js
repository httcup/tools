(function () {
  'use strict';
  function units(s) {
    var u = 0;
    for (var i = 0; i < s.length; i++) u += s.charCodeAt(i) > 255 ? 1 : 0.5;
    return u;
  }
  function truncByUnits(s, max) {
    var u = 0, out = '';
    for (var i = 0; i < s.length; i++) {
      u += s.charCodeAt(i) > 255 ? 1 : 0.5;
      if (u > max) return out + '…';
      out += s[i];
    }
    return out;
  }
  function tag(ok, okText, badText) { return ok ? okText : badText; }
  function esc(s) { return TK.esc(s); }
  function render() {
    var t = document.getElementById('tIn').value;
    var d = document.getElementById('dIn').value;
    var kw = document.getElementById('kwIn').value.trim();
    var tu = units(t), du = units(d);
    var rows = [
      ['标题全角字数', tu.toFixed(1) + ' / 建议 20–30 ' + tag(tu >= 15 && tu <= 30, '✓', '⚠️'), 'str'],
      ['描述全角字数', du.toFixed(1) + ' / 建议 60–85 ' + tag(du >= 50 && du <= 85, '✓', '⚠️'), 'str']
    ];
    if (kw) {
      rows.push(['关键词在标题中', t.indexOf(kw) >= 0 ? '出现（第 ' + (t.indexOf(kw) + 1) + ' 个字符）' : '未出现 ⚠️', 'str']);
      rows.push(['关键词在描述中', d.indexOf(kw) >= 0 ? '出现' : '未出现 ⚠️', 'str']);
      rows.push(['关键词靠近标题开头', t.indexOf(kw) >= 0 && t.indexOf(kw) <= 20 ? '是 ✓' : '建议前移', 'str']);
    }
    rows.push(['标题是否含分隔符', /[|\-–—·]/.test(t) ? '有 ✓' : '建议加 | 或 -', 'str']);
    rows.push(['描述是否含行动引导', /(选购|了解|查看|立即|购买| shop |buy|order)/i.test(d) ? '有 ✓' : '可补充', 'str']);
    var res = document.getElementById('res');
    res.innerHTML = rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('');
    document.getElementById('serpUrl').textContent = 'https://your-store.com › products';
    document.getElementById('serpTitle').textContent = truncByUnits(t, 30);
    document.getElementById('serpDesc').textContent = truncByUnits(d, 80);
  }
  ['tIn', 'dIn', 'kwIn'].forEach(function (id) { document.getElementById(id).addEventListener('input', render); });
  render();
})();
