(function () {
  'use strict';
  function parseCsv(text) {
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  function esc(s) { return TK.esc(String(s)); }
  function run() {
    var text = document.getElementById('csvIn').value;
    var res = document.getElementById('res');
    document.getElementById('stats').textContent = text ? text.length + ' 字符' : '';
    if (!text.trim()) { res.innerHTML = '<p class="note">先粘贴 CSV 内容。</p>'; return; }
    var rows = parseCsv(text);
    if (!rows.length) { res.innerHTML = '<p class="note">没有解析到内容。</p>'; return; }
    var head = rows[0].map(function (h) { return h.trim(); });
    var idx = {};
    head.forEach(function (h, i) { idx[h] = i; });
    var findings = [];
    ['Handle', 'Title'].forEach(function (c) { if (idx[c] === undefined) findings.push(['缺失必需列', c, 'bad']); });
    ['Variant Price', 'Variant Inventory Qty', 'Variant SKU'].forEach(function (c) {
      if (idx[c] === undefined) findings.push(['缺少常见列', c + '（无变体商品可忽略）', 'warn']);
    });
    if (idx['Body (HTML)'] === undefined) findings.push(['缺少常见列', 'Body (HTML)（商品描述）', 'warn']);
    var products = {}, skuSeen = {}, badPrice = 0, badInv = 0, noHandle = 0, dupSku = [], emptyTitle = 0;
    for (var r = 1; r < rows.length; r++) {
      var cells = rows[r];
      var handle = idx['Handle'] !== undefined ? (cells[idx['Handle']] || '').trim() : '';
      if (!handle) { noHandle++; if (findings.filter(function (f) { return f[0] === '缺 Handle'; }).length < 5) findings.push(['缺 Handle', '第 ' + (r + 1) + ' 行', 'bad']); continue; }
      products[handle] = (products[handle] || 0) + 1;
      var title = idx['Title'] !== undefined ? (cells[idx['Title']] || '').trim() : '';
      if (!title) emptyTitle++;
      var price = idx['Variant Price'] !== undefined ? (cells[idx['Variant Price']] || '').trim() : '';
      if (price && (!isFinite(parseFloat(price)) || parseFloat(price) < 0)) { badPrice++; if (badPrice <= 5) findings.push(['价格异常', '第 ' + (r + 1) + ' 行：' + esc(price), 'bad']); }
      var inv = idx['Variant Inventory Qty'] !== undefined ? (cells[idx['Variant Inventory Qty']] || '').trim() : '';
      if (inv && !/^-?\d+$/.test(inv)) { badInv++; if (badInv <= 5) findings.push(['库存数量异常', '第 ' + (r + 1) + ' 行：' + esc(inv), 'bad']); }
      var sku = idx['Variant SKU'] !== undefined ? (cells[idx['Variant SKU']] || '').trim() : '';
      if (sku) { if (skuSeen[sku]) dupSku.push(sku); else skuSeen[sku] = r; }
    }
    if (dupSku.length) findings.unshift(['重复 Variant SKU', dupSku.slice(0, 5).join(', ') + (dupSku.length > 5 ? ' 等 ' + dupSku.length + ' 个' : ''), 'bad']);
    if (emptyTitle) findings.unshift(['Title 为空的行', emptyTitle + ' 行（变体行属正常）', 'warn']);
    var summary = [['数据行数', rows.length - 1], ['商品数（唯一 Handle）', Object.keys(products).length],
                   ['变体总数', rows.length - 1 - noHandle]];
    var html = '<dl class="kv">' + summary.map(function (s) { return '<dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd>'; }).join('') + '</dl>';
    if (findings.length) {
      html += '<ul class="result-list" style="margin-top:0.8rem">' + findings.map(function (f) {
        return '<li><b>' + esc(f[0]) + '</b>：' + esc(f[1]) + '</li>';
      }).join('') + '</ul>';
    } else {
      html += '<p class="pos">✓ 未发现明显问题</p>';
    }
    res.innerHTML = html;
  }
  document.getElementById('runBtn').addEventListener('click', run);
})();
