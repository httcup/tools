/* 全站导航脚本。
 * 右下角悬浮按钮组（#sb-fab）：分类（仅首页，弹出彩色宫格面板）、
 * 回首页、打赏、反馈更新、返回顶部；工具页同样注入（无分类按钮）。
 * 工具页另外注入 ToolKnit 式页首——左「返回工具箱」、右「收藏 / 语言 / 手机扫码」。
 * 依赖：js/sidebar-data.js（window.SIDEBAR_CATS，仅首页宫格需要）。
 */
(function () {
  'use strict';
  var root = document.getElementById('site-sidebar');
  if (!root) { root = document.createElement('div'); root.id = 'site-sidebar'; }
  var BASE = root.dataset.base || '';
  var IS_HOME = !!document.querySelector('.chips-wrap');

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

  /* ---------- 弹层：手机扫码 + 图片二维码（打赏/反馈）共用外壳 ---------- */

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

  function openShell(title, bodyHTML) {
    closeQr();
    var back = document.createElement('div');
    back.className = 'sb-qr-backdrop';
    back.innerHTML =
      '<div class="sb-qr-modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
      '<button type="button" class="sb-qr-close" aria-label="关闭">&times;</button>' +
      '<h3>' + esc(title) + '</h3>' +
      bodyHTML +
      '</div>';
    back.addEventListener('click', function (e) { if (e.target === back) closeQr(); });
    back.querySelector('.sb-qr-close').addEventListener('click', closeQr);
    document.body.appendChild(back);
    return back;
  }

  function openQr() {
    var back = openShell('用手机打开本页',
      '<div class="sb-qr-box">生成中…</div>' +
      '<p>用手机扫码，随时随地打开这个页面</p>' +
      '<code class="sb-qr-url"></code>');
    back.querySelector('.sb-qr-url').textContent = location.href;
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

  var IMG_SIZE = { 'reward-qr.jpg': [432, 480], 'feedback-qr.jpg': [480, 444] };

  function openImageModal(title, src, caption) {
    var dim = IMG_SIZE[src.split('/').pop()] || [480, 480];
    openShell(title,
      '<div class="sb-qr-img"><img src="' + src + '" alt="' + esc(title) + '"' +
      ' width="' + dim[0] + '" height="' + dim[1] + '" decoding="async"></div>' +
      '<p>' + caption + '</p>'); /* caption 为内部固定文案，支持 <br> 换行 */
  }

  /* 空闲时预加载两张二维码，点开打赏/反馈即为秒出 */
  function preloadImages() {
    ['img/reward-qr.jpg', 'img/feedback-qr.jpg'].forEach(function (p) {
      var im = new Image();
      im.src = BASE + p;
    });
  }

  /* 任何带 data-sb-scan 的按钮都能唤起扫码弹层（顶栏/页首共用） */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-sb-scan]')) { e.preventDefault(); openQr(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.sb-qr-backdrop')) { closeQr(); return; }
    setOpen(false);
  });
  /* 点悬浮组以外的地方收起分类面板 */
  document.addEventListener('click', function (e) {
    if (!root.classList.contains('sb-open')) return;
    if (e.target.closest('#sb-fab')) return;
    setOpen(false);
  });

  /* ---------- 右下角悬浮按钮组 ---------- */

  var ICO = {
    cat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10.5 9-7.5 9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>',
    reward: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M3.5 9H17v6a4 4 0 0 1-4 4H7.5a4 4 0 0 1-4-4z"/><path d="M7 2.5v3M10.5 2.5v3M14 2.5v3"/></svg>',
    feedback: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.2 0-2.4-.25-3.4-.7L3 21l1.7-5.1A8.5 8.5 0 1 1 21 11.5z"/><path d="M8.5 10.5h7M8.5 13.5h4.5"/></svg>',
    top: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 7-7 7 7"/><path d="m5 19.5 7-7 7 7"/></svg>'
  };

  function fabBtn(cls, label, icon) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sb-fab-btn ' + cls;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.innerHTML = icon;
    return b;
  }

  function buildFab(showCat) {
    var fab = document.getElementById('sb-fab');
    if (!fab) { fab = document.createElement('div'); fab.id = 'sb-fab'; }
    fab.appendChild(root); /* 分类宫格弹层挂在按钮组上方 */

    if (showCat) {
      var cat = fabBtn('sb-fab-cat', '分类', ICO.cat);
      cat.id = 'sidebar-toggle';
      cat.setAttribute('aria-expanded', 'false');
      fab.appendChild(cat);
    }

    var home = document.createElement('a');
    home.className = 'sb-fab-btn sb-fab-home';
    home.title = '回首页';
    home.setAttribute('aria-label', '回首页');
    home.href = BASE || './';
    home.innerHTML = ICO.home;
    fab.appendChild(home);

    var reward = fabBtn('sb-fab-reward', '打赏一杯咖啡', ICO.reward);
    reward.addEventListener('click', function () {
      openImageModal('打赏一杯咖啡 ☕', BASE + 'img/reward-qr.jpg', '更新不易，赞助打赏支持一下！<br>谢谢你的支持！！');
    });
    fab.appendChild(reward);

    var feed = fabBtn('sb-fab-feedback', '反馈与更新', ICO.feedback);
    feed.addEventListener('click', function () {
      openImageModal('反馈与更新', BASE + 'img/feedback-qr.jpg', '扫码关注更新或者发送反馈');
    });
    fab.appendChild(feed);

    var top = fabBtn('sb-fab-top', '返回顶部', ICO.top);
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    fab.appendChild(top);

    /* 滚过第一屏才显示「返回顶部」 */
    function syncTop() {
      top.classList.toggle('sb-show', window.scrollY > window.innerHeight);
    }
    window.addEventListener('scroll', syncTop, { passive: true });
    syncTop();

    document.body.appendChild(fab);
  }

  function setOpen(open) {
    root.classList.toggle('sb-open', open);
    var toggle = document.getElementById('sidebar-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* ---------- 工具页：ToolKnit 式页首 ---------- */

  function injectToolChrome() {
    document.body.classList.add('tk-tool');

    /* 老版遗留元素清理 */
    ['sidebar-toggle', 'sidebar-backdrop'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el !== root && el.parentElement && el.parentElement.id !== 'sb-fab') el.remove();
    });
    var backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.remove();

    var bar = document.createElement('div');
    bar.className = 'tk-topbar';
    bar.innerHTML = '<div class="tk-actions"></div>';
    document.body.insertBefore(bar, document.body.firstChild);

    /* 收藏按钮原样搬进页首（appendChild 移动节点，保留已绑定事件） */
    var actions = bar.querySelector('.tk-actions');

    /* 主页图标：点击返回工具箱首页 */
    var homeLink = document.createElement('a');
    homeLink.className = 'tk-home';
    homeLink.title = '返回主页';
    homeLink.setAttribute('aria-label', '返回主页');
    homeLink.href = BASE || '../';
    homeLink.innerHTML = ICO.home;
    actions.appendChild(homeLink);

    var fav = document.querySelector('.favorite-toggle');
    if (fav) actions.appendChild(fav);

    var scan = document.createElement('button');
    scan.type = 'button';
    scan.className = 'tk-scan';
    scan.setAttribute('data-sb-scan', '');
    scan.setAttribute('aria-label', '用手机扫码打开本页');
    scan.innerHTML = ICO.cat.replace('viewBox', 'width="13" height="13" viewBox') +
      '<span>手机扫码</span>';
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

    buildFab(false);
  }

  if (!IS_HOME) {
    /* quick 聚合页保持原有布局，不做注入 */
    if (CUR !== 'quick') injectToolChrome();
    return;
  }

  /* ---------- 首页：分类彩色宫格弹层 ---------- */

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
  }

  build();
  buildFab(true);
  bind();
  if ('requestIdleCallback' in window) {
    requestIdleCallback(preloadImages, { timeout: 2500 });
  } else {
    setTimeout(preloadImages, 1800);
  }

  /* 首页：外部筛选变化时同步宫格高亮（chips 点击 / 搜索重置） */
  var chipsBox = document.querySelector('.chips');
  if (chipsBox) {
    var observer = new MutationObserver(syncHome);
    observer.observe(chipsBox, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });
  }
})();
