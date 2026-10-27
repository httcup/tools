(function () {
  'use strict';
  var CALC = function (v) {
    var ms = v.ts > 1e12 ? v.ts : (v.ts > 1e10 ? v.ts : v.ts * 1000);
    var d = new Date(ms);
    if (isNaN(d.getTime())) return [['无法识别的时间戳', '—', 'str']];
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var bj = new Date(ms + 8 * 3600000);
    var bjs = bj.getUTCFullYear() + '-' + pad(bj.getUTCMonth() + 1) + '-' + pad(bj.getUTCDate()) + ' ' + pad(bj.getUTCHours()) + ':' + pad(bj.getUTCMinutes()) + ':' + pad(bj.getUTCSeconds());
    var diff = (Date.now() - ms) / 1000;
    var rel = Math.abs(diff) < 60 ? '刚刚' :
      Math.abs(diff) < 3600 ? Math.round(Math.abs(diff) / 60) + ' 分钟' :
      Math.abs(diff) < 86400 ? Math.round(Math.abs(diff) / 3600) + ' 小时' :
      Math.round(Math.abs(diff) / 86400) + ' 天';
    rel = (diff >= 0 ? '过去 ' : '未来 ') + rel;
    return [['北京时间', bjs, 'str'], ['UTC', d.toISOString().replace('T', ' ').slice(0, 19), 'str'],
            ['毫秒时间戳', ms, 'int'], ['相对现在', rel, 'str'],
            ['星期', '日一二三四五六'[bj.getUTCDay()], 'str']];
  };
  var ids = ["ts"];
  function val(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    var s = String(el.value).replace(/[,\s，]/g, '');
    var n = parseFloat(s);
    return isFinite(n) ? n : s;
  }
  function kindOf(x, kind) {
    if (kind === 'money') return '¥' + TK.fmt(x, 2);
    if (kind === 'pct') return TK.fmt(x, 2) + '%';
    if (kind === 'int') return TK.fmt(x, 0);
    if (kind === 'num') return TK.fmt(x, 2);
    if (kind === 'num4') return TK.fmt(x, 4);
    return TK.esc(String(x == null ? '' : x));
  }
  function render() {
    var v = {};
    ids.forEach(function (id) { v[id] = val(id); });
    var out = document.getElementById('out');
    out.innerHTML = '';
    var dl = document.createElement('dl');
    dl.className = 'kv';
    out.appendChild(dl);
    CALC(v).forEach(function (r) {
      var kind = r[2];
      if (kind === 'head') {
        if (dl.childNodes.length) { dl = document.createElement('dl'); dl.className = 'kv'; out.appendChild(dl); }
        var h = document.createElement('h3');
        h.className = 'res-h';
        h.textContent = r[1];
        out.appendChild(h);
      } else if (kind === 'table') {
        if (dl.childNodes.length) { dl = document.createElement('dl'); dl.className = 'kv'; out.appendChild(dl); }
        var wrap = document.createElement('div');
        wrap.className = 'scroll-x';
        var table = document.createElement('table');
        table.className = 'tbl';
        var trh = document.createElement('tr');
        r[1].head.forEach(function (c) { var th = document.createElement('th'); th.textContent = c; trh.appendChild(th); });
        table.appendChild(trh);
        r[1].rows.forEach(function (row) {
          var tr = document.createElement('tr');
          row.forEach(function (c) { var td = document.createElement('td'); td.textContent = c; tr.appendChild(td); });
          table.appendChild(tr);
        });
        wrap.appendChild(table);
        out.appendChild(wrap);
      } else {
        var dt = document.createElement('dt');
        dt.textContent = r[0];
        var dd = document.createElement('dd');
        dd.innerHTML = kindOf(r[1], kind);
        if (typeof r[1] === 'number' && r[1] < 0 && (kind === 'money' || kind === 'num' || kind === 'int')) dd.className = 'neg';
        dl.appendChild(dt);
        dl.appendChild(dd);
      }
    });
  }
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', render);
  });
  render();
})();

