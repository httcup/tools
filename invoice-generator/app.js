(function () {
  'use strict';
  function render() {
    var items = document.getElementById('items').value.split('\n').map(function (l) {
      var m = l.split(/[,，]/);
      return { k: (m[0] || '').trim(), q: parseFloat(m[1]) || 1, p: parseFloat(m[2]) || 0 };
    }).filter(function (x) { return x.k; });
    var sub = items.reduce(function (s, x) { return s + x.q * x.p; }, 0);
    var tax = sub * (parseFloat(document.getElementById('tax').value) || 0) / 100;
    var money = function (n) { return '¥ ' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    var d = document.getElementById('date').value || new Date().toISOString().slice(0, 10);
    document.getElementById('paper').innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #111;padding-bottom:0.6rem">' +
      '<h2 style="margin:0;font-size:1.5rem">' + TK.esc(document.getElementById('from').value) + '</h2>' +
      '<div style="text-align:right"><b style="font-size:1.2rem">收据</b><br><span style="font-size:0.8rem">' + TK.esc(document.getElementById('no').value) + ' · ' + d + '</span></div></div>' +
      '<p style="margin:0.8rem 0 0.3rem;font-size:0.9rem">致：<b>' + TK.esc(document.getElementById('to').value) + '</b></p>' +
      '<table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin-top:0.5rem">' +
      '<tr style="border-bottom:1px solid #ccc;text-align:left"><th style="padding:0.35rem 0">项目</th><th>数量</th><th style="text-align:right">单价</th><th style="text-align:right">小计</th></tr>' +
      items.map(function (x) {
        return '<tr style="border-bottom:1px dashed #ddd"><td style="padding:0.4rem 0">' + TK.esc(x.k) + '</td><td style="text-align:center">' + x.q + '</td><td style="text-align:right">' + money(x.p) + '</td><td style="text-align:right">' + money(x.q * x.p) + '</td></tr>';
      }).join('') +
      '<tr><td colspan="3" style="text-align:right;padding-top:0.5rem">小计</td><td style="text-align:right"><b>' + money(sub) + '</b></td></tr>' +
      (tax > 0 ? '<tr><td colspan="3" style="text-align:right">税</td><td style="text-align:right">' + money(tax) + '</td></tr>' : '') +
      '<tr><td colspan="3" style="text-align:right;font-size:1.05rem;padding-top:0.3rem">合计</td><td style="text-align:right;font-size:1.15rem"><b>' + money(sub + tax) + '</b></td></tr></table>' +
      '<p style="font-size:0.8rem;color:#555;margin-top:0.8rem">' + TK.esc(document.getElementById('memo').value) + '</p>';
  }
  document.getElementById('printBtn').addEventListener('click', function () { window.print(); });
  ['from', 'to', 'no', 'date', 'items', 'tax', 'memo'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
  });
  document.getElementById('date').valueAsDate = new Date();
  render();
})();
