(function () {
  'use strict';
  var REQUIRED = ['id', 'title', 'description', 'link', 'image_link', 'price', 'availability'];
  var RECOMMEND = ['brand', 'gtin', 'mpn', 'condition', 'product_type'];
  function parseDelim(text) {
    var first = text.split('\n')[0] || '';
    return (first.indexOf('\t') >= 0) ? '\t' : ',';
  }
  function parseCsv(text, delim) {
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cur); cur = ''; }
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
    var text = document.getElementById('feedIn').value;
    var res = document.getElementById('res');
    document.getElementById('stats').textContent = text ? text.length + ' 字符' : '';
    if (!text.trim()) { res.innerHTML = '<p class="note">先粘贴 Feed 内容。</p>'; return; }
    var rows = parseCsv(text, parseDelim(text));
    var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    var idx = {};
    head.forEach(function (h, i) { if (idx[h] === undefined) idx[h] = i; });
    var findings = [];
    REQUIRED.forEach(function (c) { if (idx[c] === undefined) findings.push(['bad', '缺少必需字段：' + c]); });
    var hasId = idx.brand !== undefined || idx.gtin !== undefined || idx.mpn !== undefined;
    if (!hasId) findings.push(['warn', 'brand / gtin / mpn 至少要有一个（商品标识要求）']);
    if (idx.condition === undefined) findings.push(['warn', '缺少 condition 列（可默认 new，但建议显式给出）']);
    var badPrice = 0, badAvail = 0, shortDesc = 0, badLink = 0, empty = {}, checked = 0;
    for (var r = 1; r < rows.length; r++) {
      var cells = rows[r]; checked++;
      function get(c) { return idx[c] !== undefined ? (cells[idx[c]] || '').trim() : undefined; }
      var price = get('price');
      if (price && !/^[0-9.]+\s*[A-Za-z]{3}$/.test(price)) { badPrice++; if (badPrice <= 4) findings.push(['bad', '价格格式应为「数字+货币」，如 199.00 CNY：第 ' + (r + 1) + ' 行「' + esc(price) + '」']); }
      var avail = get('availability');
      if (avail && ['in stock', 'out of stock', 'preorder', 'backorder'].indexOf(avail.toLowerCase()) < 0) { badAvail++; if (badAvail <= 4) findings.push(['bad', 'availability 需为 in stock / out of stock / preorder / backorder：第 ' + (r + 1) + ' 行「' + esc(avail) + '」']); }
      var desc = get('description');
      if (desc !== undefined) { if (!desc) { empty['description'] = (empty['description'] || 0) + 1; } else if (desc.length < 50) shortDesc++; }
      var link = get('link');
      if (link && !/^https?:\/\//i.test(link)) { badLink++; if (badLink <= 4) findings.push(['bad', 'link 需以 http(s):// 开头：第 ' + (r + 1) + ' 行']); }
      var img = get('image_link');
      if (img && !/^https?:\/\//i.test(img)) { badLink++; if (badLink <= 4) findings.push(['bad', 'image_link 需以 http(s):// 开头：第 ' + (r + 1) + ' 行']); }
    }
    if (shortDesc) findings.unshift(['warn', shortDesc + ' 行的 description 短于 50 字符，建议补充卖点']);
    if (empty['description']) findings.unshift(['bad', empty['description'] + ' 行缺少 description']);
    var html = '<dl class="kv"><dt>数据行数</dt><dd>' + (rows.length - 1) + '</dd>' +
      '<dt>列数</dt><dd>' + head.length + '</dd>' +
      '<dt>必需字段</dt><dd>' + REQUIRED.filter(function (c) { return idx[c] !== undefined; }).length + ' / ' + REQUIRED.length + '</dd></dl>';
    if (findings.length) {
      html += '<ul class="result-list" style="margin-top:0.8rem">' + findings.slice(0, 30).map(function (f) {
        return '<li>' + (f[0] === 'bad' ? '⛔' : '⚠️') + ' ' + f[1] + '</li>';
      }).join('') + (findings.length > 30 ? '<li>… 还有 ' + (findings.length - 30) + ' 条</li>' : '') + '</ul>';
    } else {
      html += '<p class="pos">✓ 未发现明显问题，可上传后在 Merchant Center 复核诊断</p>';
    }
    res.innerHTML = html;
  }
  document.getElementById('runBtn').addEventListener('click', run);
})();
