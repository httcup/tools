(function () {
  'use strict';
  var CALC = function (v) {
    var shop = v.price * v.shopPayRate / 100 + v.shopFixed;
    var etsy = v.price * v.etsyRate / 100 + 0.2;
    var tt = v.price * v.ttRate / 100;
    var amz = v.price * v.amzRate / 100 + v.amzFulfill;
    var rows = [['平台', '扣费', '净收入', '单件利润']];
    [['Shopify', shop], ['Etsy', etsy], ['TikTok Shop', tt], ['Amazon', amz]].forEach(function (d) {
      rows.push([d[0], d[1].toFixed(2), (v.price - d[1]).toFixed(2), (v.price - d[1] - v.cost).toFixed(2)]);
    });
    return [['head', '对比明细（费率均为可调假设）', 'head'],
            ['table', { head: rows[0], rows: rows.slice(1) }, 'table']];
  };
  var ids = ["price", "cost", "shopPayRate", "shopFixed", "etsyRate", "ttRate", "amzRate", "amzFulfill"];
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

