(function () {
  'use strict';
  var ids = ['uBase', 'uSource', 'uMedium', 'uCampaign', 'uTerm', 'uContent'];
  function val(id) { return document.getElementById(id).value.trim(); }
  function build() {
    var base = val('uBase');
    var out = document.getElementById('uOut');
    var warns = document.getElementById('warns');
    var items = [];
    if (!/^https?:\/\//i.test(base)) items.push(['bad', '落地页需以 http(s):// 开头']);
    var url;
    try { url = new URL(base || 'https://example.com'); } catch (e) { url = new URL('https://example.com'); }
    var utm = { utm_source: val('uSource'), utm_medium: val('uMedium'), utm_campaign: val('uCampaign'), utm_term: val('uTerm'), utm_content: val('uContent') };
    Object.keys(utm).forEach(function (k) {
      var v = utm[k];
      if (!v) return;
      if (/\s/.test(v)) { items.push(['bad', k + ' 含空格，已转为连字符']); v = v.replace(/\s+/g, '-'); }
      if (v !== v.toLowerCase()) { items.push(['warn', k + ' 含大写，建议统一小写']); v = v.toLowerCase(); }
      if (url.searchParams.has(k)) items.push(['warn', '落地页已有 ' + k + '，将被覆盖']);
      url.searchParams.set(k, v);
    });
    if (!utm.utm_source) items.push(['bad', '缺少 utm_source（报表将无法区分渠道）']);
    if (!utm.utm_medium) items.push(['bad', '缺少 utm_medium（报表将无法区分流量类型）']);
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(base + utm.utm_campaign + utm.utm_term + utm.utm_content)) items.push(['bad', '参数里疑似包含邮箱等个人信息，请移除']);
    var s = url.toString();
    if (items.some(function (i) { return i[0] === 'bad'; }) && !/^https?:\/\//i.test(base)) s = '';
    out.value = s;
    warns.innerHTML = items.length
      ? items.map(function (i) { return '<li>' + (i[0] === 'bad' ? '⛔' : '⚠️') + ' ' + TK.esc(i[1]) + '</li>'; }).join('')
      : '<li class="pos">✓ 检查通过</li>';
  }
  ids.forEach(function (id) { document.getElementById(id).addEventListener('input', build); });
  build();
})();
