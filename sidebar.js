/* 全站导航脚本。
 * 首页：右下角悬浮「分类」按钮，点击弹出彩色宫格分类面板（与首页 chips 筛选联动）。
 * 工具页：不显示分类侧栏与悬浮按钮，注入 ToolKnit 式页首——左「返回工具箱」、
 *         右「收藏 / 语言 / 手机扫码」与居中 hero 特性标签。
 * 依赖：window.SIDEBAR_CATS（js/sidebar-data.js）；容器 <div id="site-sidebar">
 * 首页容器带 data-home="1"。
 */
(function () {
  'use strict';
  var root = document.getElementById('site-sidebar');
  if (!root || !window.SIDEBAR_CATS) return;
  var BASE = root.dataset.base || '';
  var IS_HOME = root.dataset.home === '1';

  /* 当前页 slug：/bmi/ -> bmi；/quick/#hash 例外 */
  var seg = location.pathname.split('/').filter(Boolean);
  var CUR = seg.length > 0 && seg[seg.length - 1] !== '' ? seg[seg.length - 1] : '';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function currentFilter() {
    var chip = document.querySelector('.chip[aria-pressed="true"]');
    return chip ? chip.dataset.cat : 'all';
  }

  /* ---------- 手机扫码：弹出当前页二维码，手机扫码直接打开 ---------- */

  function loadQrLib() {
    if (window.qrcode) return Promise.resolve();
    return new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = BASE + 'js/qrcode.min.js';
      s.onload = ok;
      s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  function closeQr() {
    var back = document.querySelector('.sb-qr-backdrop');
    if (back) back.remove();
  }

  function openQr() {
    closeQr();
    var back = document.createElement('div');
    back.className = 'sb-qr-backdrop';
    back.innerHTML =
      '<div class="sb-qr-modal" role="dialog" aria-modal="true" aria-label="手机扫码打开本页">' +
      '<button type="button" class="sb-qr-close" aria-label="关闭">&times;</button>' +
      '<h3>用手机打开本页</h3>' +
      '<div class="sb-qr-box">生成中…</div>' +
      '<p>用手机扫码，随时随地打开这个页面</p>' +
      '<code class="sb-qr-url"></code>' +
      '</div>';
    back.addEventListener('click', function (e) { if (e.target === back) closeQr(); });
    back.querySelector('.sb-qr-close').addEventListener('click', closeQr);
    back.querySelector('.sb-qr-url').textContent = location.href;
    document.body.appendChild(back);
    loadQrLib().then(function () {
      var q = window.qrcode(0, 'M');
      q.addData(location.href);
      q.make();
      back.querySelector('.sb-qr-box').innerHTML =
        q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    }).catch(function () {
      back.querySelector('.sb-qr-box').textContent = '二维码生成失败';
    });
  }

  /* 任何带 data-sb-scan 的按钮都能唤起扫码弹层（顶栏/页首共用） */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-sb-scan]')) { e.preventDefault(); openQr(); }
  });

  var QR_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/><path d="M14 14h2.5v2.5h-2.5zM17.5 17.5H20V20h-2.5zM14 17.5h2.5V20H14zM17.5 14H20v2.5h-2.5z"/></svg>';
  var BACK_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>';

  /* ---------- 工具页：ToolKnit 式页首 ---------- */

  function injectToolChrome() {
    document.body.classList.add('tk-tool');

    /* 分类相关元素全部移除 */
    root.remove();
    ['sidebar-toggle', 'sidebar-backdrop'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });

    var bar = document.createElement('div');
    bar.className = 'tk-topbar';
    bar.innerHTML =
      '<a class="tk-back" href="' + (BASE || '../') + '">' + BACK_SVG + '<span>返回工具箱</span></a>' +
      '<div class="tk-actions"></div>';
    document.body.insertBefore(bar, document.body.firstChild);

    /* 收藏按钮原样搬进页首（appendChild 移动节点，保留已绑定事件） */
    var actions = bar.querySelector('.tk-actions');
    var fav = document.querySelector('.favorite-toggle');
    if (fav) actions.appendChild(fav);

    var scan = document.createElement('button');
    scan.type = 'button';
    scan.className = 'tk-scan';
    scan.setAttribute('data-sb-scan', '');
    scan.setAttribute('aria-label', '用手机扫码打开本页');
    scan.innerHTML = QR_SVG + '<span>手机扫码</span>';
    actions.appendChild(scan);

    /* 特性标签：跟在简介后面 */
    var host = document.querySelector('.hub-head .lede') ||
               document.querySelector('.topbar .tagline') ||
               document.querySelector('.topbar .brand p');
    if (host) {
      var pills = document.createElement('p');
      pills.className = 'tk-pills';
      pills.innerHTML = ['免费', '无需注册', '打开即用', '不限次数'].map(function (t) {
        return '<span>' + t + '</span>';
      }).join('');
      host.insertAdjacentElement('afterend', pills);
    }
  }

  if (!IS_HOME) {
    /* quick 聚合页保持原有布局，不做注入 */
    if (CUR !== 'quick') injectToolChrome();
    return;
  }

  /* ---------- 首页：悬浮「分类」按钮 + 彩色宫格弹层 ---------- */

  var TILE_ICONS = {
    'all': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    'pdf-docs-text': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>',
    'media': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>',
    'design-create': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>',
    'calc-convert': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg>',
    'time-focus': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
    'test-train': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>',
    'quick': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
    'dtc-ecommerce': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2.5 3.5h2l2.3 11.4a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L20.5 7H5.1"/></svg>'
  };
  var TILE_NAMES = {
    'all': '全部工具',
    'pdf-docs-text': 'PDF 文档',
    'media': '图片视频',
    'design-create': '设计创作',
    'calc-convert': '计算换算',
    'time-focus': '时间专注',
    'test-train': '测试训练',
    'quick': '本地快用',
    'dtc-ecommerce': 'DTC 电商'
  };

  function build() {
    var html = '<div class="sb-pop" role="dialog" aria-label="工具分类">';
    html += '<button type="button" class="sb-tile sb-active" data-cat="all" aria-pressed="true">' +
      '<span class="sb-tile-ico tile-all">' + TILE_ICONS.all + '</span><span class="sb-tile-name">全部工具</span></button>';
    window.SIDEBAR_CATS.forEach(function (cat) {
      var ico = TILE_ICONS[cat.cat] || TILE_ICONS.all;
      var name = TILE_NAMES[cat.cat] || cat.name;
      html += '<button type="button" class="sb-tile" data-cat="' + esc(cat.cat) + '" aria-pressed="false">' +
        '<span class="sb-tile-ico tile-' + esc(cat.cat) + '">' + ico + '</span><span class="sb-tile-name">' + esc(name) + '</span></button>';
    });
    html += '</div>';
    root.innerHTML = html;
  }

  function syncHome() {
    var active = currentFilter();
    root.querySelectorAll('.sb-tile').forEach(function (btn) {
      var on = btn.dataset.cat === active;
      btn.classList.toggle('sb-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function setOpen(open) {
    root.classList.toggle('sb-open', open);
    var toggle = document.getElementById('sidebar-toggle');
    if (toggle) {
      toggle.classList.toggle('sb-tgl-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  function bind() {
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('.sb-tile');
      if (!btn) return;
      var chip = document.querySelector('.chip[data-cat="' + btn.dataset.cat + '"]');
      if (chip && chip.getAttribute('aria-pressed') !== 'true') chip.click();
      setOpen(false);
    });

    var toggle = document.getElementById('sidebar-toggle');
    if (toggle) toggle.addEventListener('click', function () {
      setOpen(!root.classList.contains('sb-open'));
    });
    /* 点按钮和面板以外的地方收起 */
    document.addEventListener('click', function (e) {
      if (!root.classList.contains('sb-open')) return;
      if (e.target.closest('#site-sidebar') || e.target.closest('#sidebar-toggle')) return;
      setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (document.querySelector('.sb-qr-backdrop')) { closeQr(); return; }
      setOpen(false);
    });
  }

  build();
  bind();
  document.body.classList.add('sb-body');

  /* 首页：外部筛选变化时同步侧栏高亮（chips 点击 / 搜索重置） */
  var chipsBox = document.querySelector('.chips');
  if (chipsBox) {
    var observer = new MutationObserver(syncHome);
    observer.observe(chipsBox, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });
  }
})();
