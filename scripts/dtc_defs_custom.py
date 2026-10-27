#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""DTC 电商工具定义（三）：需要自定义界面的 6 个工具。"""

TOOLS = []


def t(slug, name, desc, long, keys, icon, body, js, note=""):
    TOOLS.append(dict(slug=slug, name=name, desc=desc, long=long, keys=keys,
                      icon=icon, note=note, body=body, js=js))


t("shopify-product-schema-generator", "商品结构化数据生成器",
  "生成 Product 与 Offer 的 JSON-LD 脚本。",
  "根据商品名称、描述、品牌、价格、库存状态等信息，在本地生成可直接放进商品页的 Product JSON-LD 结构化数据脚本。",
  "json-ld 结构化数据 schema seo 商品",
  "code",
  """
<section class="tool-card">
  <h2>商品信息</h2>
  <div class="row">
    <label class="field"><span>商品名称 *</span><input type="text" id="pName" value="羊毛混纺针织开衫" style="min-width:15rem"></label>
    <label class="field"><span>品牌</span><input type="text" id="pBrand" value="Example Brand"></label>
    <label class="field"><span>SKU</span><input type="text" id="pSku" value="KNIT-001"></label>
  </div>
  <div class="row">
    <label class="field"><span>售价 *</span><input type="number" id="pPrice" value="299" step="any"></label>
    <label class="field"><span>货币</span><select id="pCur"><option value="CNY">CNY ¥</option><option value="USD">USD $</option><option value="EUR">EUR €</option></select></label>
    <label class="field"><span>库存状态</span><select id="pAvail"><option value="InStock">有货</option><option value="OutOfStock">缺货</option><option value="PreOrder">预售</option></select></label>
  </div>
  <div class="row">
    <label class="field"><span>商品页链接 *</span><input type="text" id="pUrl" value="https://example.com/products/knit-cardigan" style="min-width:18rem"></label>
    <label class="field"><span>主图链接</span><input type="text" id="pImg" value="https://example.com/cdn/knit.jpg" style="min-width:18rem"></label>
  </div>
  <div class="row">
    <label class="field"><span>商品描述</span><textarea id="pDesc" rows="2" style="min-width:24rem">秋冬保暖，羊毛混纺，多色可选。</textarea></label>
  </div>
  <div class="row">
    <label class="field"><span>评分（4–5，选填）</span><input type="number" id="pRating" value="4.7" step="0.1" min="0" max="5"></label>
    <label class="field"><span>评价数（选填）</span><input type="number" id="pReviews" value="128"></label>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>JSON-LD 脚本</h2><button class="btn btn-ghost" type="button" data-copy-target="#ldOut">复制脚本</button></div>
  <textarea id="ldOut" class="out" rows="12" readonly></textarea>
  <p class="note">把整段脚本（含 &lt;script&gt; 标签）粘贴到商品页模板的 &lt;head&gt; 或正文末尾即可；发布后可用 Google 富媒体测试工具复查。商品信息不会离开本页。</p>
</section>
""",
  """(function () {
  'use strict';
  var ids = ['pName', 'pBrand', 'pSku', 'pPrice', 'pCur', 'pAvail', 'pUrl', 'pImg', 'pDesc', 'pRating', 'pReviews'];
  function val(id) { var el = document.getElementById(id); return el ? String(el.value).trim() : ''; }
  function build() {
    var out = document.getElementById('ldOut');
    var name = val('pName'), price = parseFloat(val('pPrice')), url = val('pUrl');
    var problems = [];
    if (!name) problems.push('商品名称');
    if (!isFinite(price) || price <= 0) problems.push('售价');
    if (!/^https?:\\/\\//i.test(url)) problems.push('商品页链接（需以 http(s):// 开头）');
    var data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: name
    };
    if (val('pDesc')) data.description = val('pDesc');
    if (val('pBrand')) data.brand = { '@type': 'Brand', name: val('pBrand') };
    if (val('pSku')) data.sku = val('pSku');
    if (val('pImg') && /^https?:\\/\\//i.test(val('pImg'))) data.image = [val('pImg')];
    data.offers = {
      '@type': 'Offer',
      url: url,
      price: price,
      priceCurrency: val('pCur') || 'CNY',
      availability: 'https://schema.org/' + ({ InStock: 'InStock', OutOfStock: 'OutOfStock', PreOrder: 'PreOrder' }[val('pAvail')] || 'InStock')
    };
    var r = parseFloat(val('pRating')), n = parseInt(val('pReviews'), 10);
    if (r > 0 && n > 0) {
      data.aggregateRating = { '@type': 'AggregateRating', ratingValue: r, reviewCount: n };
    }
    var script = '<script type="application/ld+json">\\n' + JSON.stringify(data, null, 2) + '\\n<\\/script>';
    if (problems.length) {
      script = '⚠️ 还缺：' + problems.join('、') + '\\n\\n' + script;
    }
    out.value = script;
  }
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', build);
  });
  build();
})();""",
  "评分与评价数必须真实来自店铺评论，虚构评分违反 Google 政策。")


t("product-title-meta-description-seo-checker", "标题与描述 SEO 检查器",
  "检查商品标题与描述的字数与预览。",
  "检查商品页标题与 Meta Description 的字数（全角半角）、目标关键词位置，并预览搜索结果摘要样式。",
  "seo 标题 meta description 搜索预览",
  "search",
  """
<section class="tool-card">
  <h2>待检查内容</h2>
  <div class="row">
    <label class="field"><span>页面标题（Title）</span><input type="text" id="tIn" value="羊毛混纺针织开衫 | 秋冬保暖女款 - Example Brand" style="min-width:26rem"></label>
  </div>
  <div class="row">
    <label class="field"><span>目标关键词（选填）</span><input type="text" id="kwIn" value="针织开衫"></label>
  </div>
  <div class="row" style="width:100%">
    <label class="field" style="width:100%"><span>Meta Description</span><textarea id="dIn" rows="3">羊毛混纺针织开衫，秋冬保暖不臃肿，多色可选。全场包邮，30 天无理由退换，立即选购。</textarea></label>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>检查结果</h2></div>
  <dl class="kv" id="res"></dl>
  <p class="note">字数按「全角 = 1、半角 = 0.5」折算成全角当量：标题建议 20–30，描述建议 60–85。超长会在搜索结果里被截断。</p>
</section>
<section class="tool-card">
  <h2>搜索结果预览</h2>
  <div id="serp" style="background:#fff;color:#202124;border:1px solid var(--border);border-radius:8px;padding:0.9rem 1rem;font-family:Arial,sans-serif;line-height:1.5">
    <div style="font-size:0.78rem;color:#4d5156" id="serpUrl"></div>
    <div style="font-size:1.2rem;color:#1a0dab;margin:0.15rem 0" id="serpTitle"></div>
    <div style="font-size:0.86rem;color:#4d5156" id="serpDesc"></div>
  </div>
</section>
""",
  """(function () {
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
    rows.push(['标题是否含分隔符', /[|\\-–—·]/.test(t) ? '有 ✓' : '建议加 | 或 -', 'str']);
    rows.push(['描述是否含行动引导', /(选购|了解|查看|立即|购买| shop |buy|order)/i.test(d) ? '有 ✓' : '可补充', 'str']);
    var res = document.getElementById('res');
    res.innerHTML = rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('');
    document.getElementById('serpUrl').textContent = 'https://your-store.com › products';
    document.getElementById('serpTitle').textContent = truncByUnits(t, 30);
    document.getElementById('serpDesc').textContent = truncByUnits(d, 80);
  }
  ['tIn', 'dIn', 'kwIn'].forEach(function (id) { document.getElementById(id).addEventListener('input', render); });
  render();
})();""",
  "中文搜索结果约展示 30 个全角字的标题、80 个全角字的描述；以实际 SERP 为准。")


t("shopify-description-html-cleaner", "商品描述 HTML 清洗器",
  "去掉粘贴内容里的样式与不安全标签。",
  "把从 Word、网页或 AI 工具复制来的商品描述 HTML 清洗干净：移除内联样式、脚本与多余属性，只保留商品描述需要的结构标签。",
  "html 清洗 商品描述 富文本 sanitize",
  "doc",
  """
<section class="tool-card">
  <div class="card-head"><h2>粘贴原始 HTML</h2><span class="stats" id="inStats"></span></div>
  <textarea id="htmlIn" class="in" rows="8" placeholder="粘贴从 Word / 网页复制的 HTML…"></textarea>
  <div class="row">
    <label class="check"><input type="checkbox" id="optKeepImg" checked> 保留图片</label>
    <label class="check"><input type="checkbox" id="optKeepLinks" checked> 保留链接</label>
    <label class="check"><input type="checkbox" id="optKeepTable" checked> 保留表格结构</label>
    <button class="btn btn-primary" type="button" id="runBtn">清洗</button>
    <button class="btn" type="button" data-copy-target="#htmlOut">复制结果</button>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>清洗结果</h2><span class="stats" id="outStats"></span></div>
  <textarea id="htmlOut" class="out" rows="8" readonly></textarea>
  <p class="note">保留：p / h1–h6 / strong / em / ul / ol / li / blockquote / hr / br（按勾选保留 a、img、table）。移除：style、class、script、iframe、span/font 包装与所有事件属性。全程在本页完成。</p>
</section>
""",
  """(function () {
  'use strict';
  var KEEP = { p: [], h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], strong: [], b: [], em: [], i: [], u: [], s: [],
    ul: [], ol: [], li: [], blockquote: [], hr: [], br: [], div: [] };
  var ATTRS = {};
  function cleanNode(node, doc, opts) {
    if (node.nodeType === 3) return doc.createTextNode(node.nodeValue);
    if (node.nodeType !== 1) return null;
    var tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object' || tag === 'embed') return null;
    if (tag === 'span' || tag === 'font' || tag === 'section' || tag === 'article') {
      var frag = doc.createDocumentFragment();
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        var out = cleanNode(c, doc, opts);
        if (out) frag.appendChild(out);
      });
      return frag;
    }
    var allow = KEEP[tag] !== undefined;
    if (!allow && tag === 'a' && opts.links) allow = true;
    if (!allow && tag === 'img' && opts.imgs) allow = true;
    if (!allow && /^t[drh]$/.test(tag) && opts.table) allow = true;
    if (!allow && (tag === 'table' || tag === 'thead' || tag === 'tbody') && opts.table) allow = true;
    if (!allow) {
      var frag2 = doc.createDocumentFragment();
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        var out = cleanNode(c, doc, opts);
        if (out) frag2.appendChild(out);
      });
      return frag2;
    }
    var el = doc.createElement(tag);
    var ok = ATTRS[tag] || [];
    Array.prototype.slice.call(node.attributes).forEach(function (a) {
      if (ok.indexOf(a.name) >= 0 && String(a.value).indexOf('javascript:') !== 0) el.setAttribute(a.name, a.value);
    });
    if (tag === 'a' && el.getAttribute('href') && opts.nofollow !== false) el.setAttribute('rel', 'noopener');
    Array.prototype.slice.call(node.childNodes).forEach(function (c) {
      var out = cleanNode(c, doc, opts);
      if (out) el.appendChild(out);
    });
    return el;
  }
  function run() {
    var src = document.getElementById('htmlIn').value;
    var out = document.getElementById('htmlOut');
    if (!src.trim()) { out.value = ''; document.getElementById('outStats').textContent = ''; return; }
    document.getElementById('inStats').textContent = src.length + ' 字符';
    var doc = new DOMParser().parseFromString('<div id="root">' + src + '</div>', 'text/html');
    var root = doc.getElementById('root');
    var opts = { imgs: document.getElementById('optKeepImg').checked,
      links: document.getElementById('optKeepLinks').checked,
      table: document.getElementById('optKeepTable').checked };
    var frag = doc.createDocumentFragment();
    Array.prototype.slice.call(root.childNodes).forEach(function (c) {
      var o = cleanNode(c, doc, opts);
      if (o) frag.appendChild(o);
    });
    var tmp = doc.createElement('div');
    tmp.appendChild(frag);
    var html = tmp.innerHTML.replace(/\\n\\s*\\n/g, '\\n');
    out.value = html;
    document.getElementById('outStats').textContent = html.length + ' 字符（原 ' + src.length + '）';
  }
  document.getElementById('runBtn').addEventListener('click', run);
  document.getElementById('htmlIn').addEventListener('input', run);
  run();
})();""",
  "结果可直接粘回 Shopify 商品描述的「显示 HTML」视图。")


t("shopify-product-csv-checker", "商品 CSV 检查器",
  "导入前检查 Shopify 商品 CSV。",
  "在浏览器中检查 Shopify 商品 CSV：表头是否齐全、价格与库存是否为数字、SKU 是否重复、Handle 是否缺失，导入前先发现问题。",
  "csv 商品 检查 导入 shopify",
  "doc",
  """
<section class="tool-card">
  <div class="card-head"><h2>粘贴 CSV 内容</h2><span class="stats" id="stats"></span></div>
  <textarea id="csvIn" class="in" rows="9" placeholder="Handle,Title,Body (HTML),Vendor,...&#10;knit-cardigan,羊毛开衫,..."></textarea>
  <div class="row">
    <button class="btn btn-primary" type="button" id="runBtn">检查</button>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>检查结果</h2></div>
  <div id="res"></div>
</section>
""",
  """(function () {
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
      else if (ch === '\\n' || ch === '\\r') {
        if (ch === '\\r' && text[i + 1] === '\\n') i++;
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
      if (inv && !/^-?\\d+$/.test(inv)) { badInv++; if (badInv <= 5) findings.push(['库存数量异常', '第 ' + (r + 1) + ' 行：' + esc(inv), 'bad']); }
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
})();""",
  "只做格式体检，不会上传或保存 CSV；导入 Shopify 前建议再抽查几行。")


t("utm-builder", "电商 UTM 链接生成器",
  "生成规范的 UTM 追踪链接。",
  "输入落地页与 UTM 参数，在本地生成规范链接：保留已有查询参数，并检查大小写、空格、覆盖参数与个人信息。",
  "utm 链接 追踪 渠道 参数",
  "link",
  """
<section class="tool-card">
  <h2>参数</h2>
  <div class="row">
    <label class="field"><span>落地页 URL *</span><input type="text" id="uBase" value="https://example.com/products/knit" style="min-width:24rem"></label>
  </div>
  <div class="row">
    <label class="field"><span>utm_source *</span><input type="text" id="uSource" value="instagram"></label>
    <label class="field"><span>utm_medium *</span><input type="text" id="uMedium" value="cpc"></label>
    <label class="field"><span>utm_campaign</span><input type="text" id="uCampaign" value="autumn-sale"></label>
  </div>
  <div class="row">
    <label class="field"><span>utm_term</span><input type="text" id="uTerm" value=""></label>
    <label class="field"><span>utm_content</span><input type="text" id="uContent" value="story-a"></label>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>生成的链接</h2><button class="btn btn-ghost" type="button" data-copy-target="#uOut">复制</button></div>
  <textarea id="uOut" class="out" rows="2" readonly></textarea>
  <div class="card-head" style="margin-top:0.8rem"><h2>检查</h2></div>
  <ul class="result-list" id="warns"></ul>
</section>
""",
  """(function () {
  'use strict';
  var ids = ['uBase', 'uSource', 'uMedium', 'uCampaign', 'uTerm', 'uContent'];
  function val(id) { return document.getElementById(id).value.trim(); }
  function build() {
    var base = val('uBase');
    var out = document.getElementById('uOut');
    var warns = document.getElementById('warns');
    var items = [];
    if (!/^https?:\\/\\//i.test(base)) items.push(['bad', '落地页需以 http(s):// 开头']);
    var url;
    try { url = new URL(base || 'https://example.com'); } catch (e) { url = new URL('https://example.com'); }
    var utm = { utm_source: val('uSource'), utm_medium: val('uMedium'), utm_campaign: val('uCampaign'), utm_term: val('uTerm'), utm_content: val('uContent') };
    Object.keys(utm).forEach(function (k) {
      var v = utm[k];
      if (!v) return;
      if (/\\s/.test(v)) { items.push(['bad', k + ' 含空格，已转为连字符']); v = v.replace(/\\s+/g, '-'); }
      if (v !== v.toLowerCase()) { items.push(['warn', k + ' 含大写，建议统一小写']); v = v.toLowerCase(); }
      if (url.searchParams.has(k)) items.push(['warn', '落地页已有 ' + k + '，将被覆盖']);
      url.searchParams.set(k, v);
    });
    if (!utm.utm_source) items.push(['bad', '缺少 utm_source（报表将无法区分渠道）']);
    if (!utm.utm_medium) items.push(['bad', '缺少 utm_medium（报表将无法区分流量类型）']);
    if (/[^\\s@]+@[^\\s@]+\\.[^\\s@]+/.test(base + utm.utm_campaign + utm.utm_term + utm.utm_content)) items.push(['bad', '参数里疑似包含邮箱等个人信息，请移除']);
    var s = url.toString();
    if (items.some(function (i) { return i[0] === 'bad'; }) && !/^https?:\\/\\//i.test(base)) s = '';
    out.value = s;
    warns.innerHTML = items.length
      ? items.map(function (i) { return '<li>' + (i[0] === 'bad' ? '⛔' : '⚠️') + ' ' + TK.esc(i[1]) + '</li>'; }).join('')
      : '<li class="pos">✓ 检查通过</li>';
  }
  ids.forEach(function (id) { document.getElementById(id).addEventListener('input', build); });
  build();
})();""",
  "团队内先统一 source / medium 命名表，再开始投放，报表才不会碎成一片。")


t("google-shopping-feed-readiness-checker", "Google Shopping Feed 检查器",
  "上传前检查 Google Shopping 数据源。",
  "粘贴 Google Shopping 的 CSV / TSV 数据源，检查必需字段是否齐全、价格与 availability 格式、链接与描述质量，先修再上传。",
  "google shopping feed merchant center 商品源",
  "search",
  """
<section class="tool-card">
  <div class="card-head"><h2>粘贴 Feed 内容（CSV 或 TSV）</h2><span class="stats" id="stats"></span></div>
  <textarea id="feedIn" class="in" rows="9" placeholder="id,title,description,link,image_link,price,availability,brand,..."></textarea>
  <div class="row"><button class="btn btn-primary" type="button" id="runBtn">检查</button></div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>检查结果</h2></div>
  <div id="res"></div>
</section>
""",
  """(function () {
  'use strict';
  var REQUIRED = ['id', 'title', 'description', 'link', 'image_link', 'price', 'availability'];
  var RECOMMEND = ['brand', 'gtin', 'mpn', 'condition', 'product_type'];
  function parseDelim(text) {
    var first = text.split('\\n')[0] || '';
    return (first.indexOf('\\t') >= 0) ? '\\t' : ',';
  }
  function parseCsv(text, delim) {
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cur); cur = ''; }
      else if (ch === '\\n' || ch === '\\r') {
        if (ch === '\\r' && text[i + 1] === '\\n') i++;
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
      if (price && !/^[0-9.]+\\s*[A-Za-z]{3}$/.test(price)) { badPrice++; if (badPrice <= 4) findings.push(['bad', '价格格式应为「数字+货币」，如 199.00 CNY：第 ' + (r + 1) + ' 行「' + esc(price) + '」']); }
      var avail = get('availability');
      if (avail && ['in stock', 'out of stock', 'preorder', 'backorder'].indexOf(avail.toLowerCase()) < 0) { badAvail++; if (badAvail <= 4) findings.push(['bad', 'availability 需为 in stock / out of stock / preorder / backorder：第 ' + (r + 1) + ' 行「' + esc(avail) + '」']); }
      var desc = get('description');
      if (desc !== undefined) { if (!desc) { empty['description'] = (empty['description'] || 0) + 1; } else if (desc.length < 50) shortDesc++; }
      var link = get('link');
      if (link && !/^https?:\\/\\//i.test(link)) { badLink++; if (badLink <= 4) findings.push(['bad', 'link 需以 http(s):// 开头：第 ' + (r + 1) + ' 行']); }
      var img = get('image_link');
      if (img && !/^https?:\\/\\//i.test(img)) { badLink++; if (badLink <= 4) findings.push(['bad', 'image_link 需以 http(s):// 开头：第 ' + (r + 1) + ' 行']); }
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
})();""",
  "这里只做格式层面的预检；政策与类目问题仍以 Merchant Center 诊断为準。")
