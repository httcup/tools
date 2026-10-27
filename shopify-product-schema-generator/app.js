(function () {
  'use strict';
  var ids = ['pName', 'pBrand', 'pSku', 'pPrice', 'pCur', 'pAvail', 'pUrl', 'pImg', 'pDesc', 'pRating', 'pReviews'];
  function val(id) { var el = document.getElementById(id); return el ? String(el.value).trim() : ''; }
  function build() {
    var out = document.getElementById('ldOut');
    var name = val('pName'), price = parseFloat(val('pPrice')), url = val('pUrl');
    var problems = [];
    if (!name) problems.push('商品名称');
    if (!isFinite(price) || price <= 0) problems.push('售价');
    if (!/^https?:\/\//i.test(url)) problems.push('商品页链接（需以 http(s):// 开头）');
    var data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: name
    };
    if (val('pDesc')) data.description = val('pDesc');
    if (val('pBrand')) data.brand = { '@type': 'Brand', name: val('pBrand') };
    if (val('pSku')) data.sku = val('pSku');
    if (val('pImg') && /^https?:\/\//i.test(val('pImg'))) data.image = [val('pImg')];
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
    var script = '<script type="application/ld+json">\n' + JSON.stringify(data, null, 2) + '\n<\/script>';
    if (problems.length) {
      script = '⚠️ 还缺：' + problems.join('、') + '\n\n' + script;
    }
    out.value = script;
  }
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', build);
  });
  build();
})();
