/* 全站左侧分类导航。
 * 依赖：window.SIDEBAR_CATS（js/sidebar-data.js）；
 * 容器：<div id="site-sidebar" data-base="../" hidden></div>
 * 首页特殊行为：容器带 data-home="1" 时，点分类标题会联动首页筛选。
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

  var EXP_KEY = 'sb-exp-cats';

  function loadExp() {
    try { return JSON.parse(sessionStorage.getItem(EXP_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveExp(m) {
    try { sessionStorage.setItem(EXP_KEY, JSON.stringify(m)); } catch (e) { /* 忽略 */ }
  }
  var expanded = loadExp();

  function toolHref(t) {
    if (t.href.indexOf('./quick/') === 0) {
      return BASE + 'quick/' + '#' + t.slug;
    }
    return BASE + t.slug + '/';
  }

  function build() {
    var html = '';
    html += '<div class="sb-head">' +
      '<a class="sb-home" href="' + BASE + '">' +
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>' +
      '全部工具</a>' +
      '<button type="button" class="sb-scan" aria-label="用手机扫码打开本页" title="用手机扫码打开本页">' +
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/><path d="M14 14h2.5v2.5h-2.5zM17.5 17.5H20V20h-2.5zM14 17.5h2.5V20H14zM17.5 14H20v2.5h-2.5z"/></svg>' +
      '<span>手机扫码</span></button>' +
      '<button type="button" class="sb-close" aria-label="关闭导航">&times;</button>' +
      '</div>';
    html += '<div class="sb-search"><input type="search" placeholder="搜索工具…" aria-label="搜索工具"></div>';
    html += '<nav class="sb-scroll" aria-label="工具分类">';

    window.SIDEBAR_CATS.forEach(function (cat) {
      var isCurCat = false;
      var items = cat.tools.map(function (t) {
        var cur = !IS_HOME && (CUR === t.slug || (CUR === 'quick' && t.href.indexOf('./quick/') === 0 && location.hash === '#' + t.slug));
        if (cur) isCurCat = true;
        return '<li' + (cur ? ' class="sb-cur"' : '') + '><a href="' + toolHref(t) + '">' + esc(t.name) + '</a></li>';
      }).join('');
      /* quick 聚合页本身也视为「本地快用」分类的当前页 */
      if (!IS_HOME && CUR === 'quick' && cat.cat === 'quick') isCurCat = true;
      var open = expanded[cat.cat] === true || (!IS_HOME && isCurCat) || (IS_HOME && cat.cat === currentFilter());
      html += '<div class="sb-group' + (open ? ' sb-exp' : '') + ' sb-cat-' + cat.cat + '">' +
        '<button type="button" class="sb-cat' + (isCurCat && !IS_HOME ? ' sb-active' : '') + '" data-cat="' + cat.cat + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        '<span class="sb-caret" aria-hidden="true">&#9654;</span>' +
        '<span class="sb-name">' + esc(cat.name) + '</span>' +
        '<span class="sb-count">' + cat.tools.length + '</span>' +
        '</button>' +
        '<ul class="sb-tools">' + items + '</ul>' +
        '</div>';
    });
    html += '</nav>';
    root.innerHTML = html;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function currentFilter() {
    var chip = document.querySelector('.chip[aria-pressed="true"]');
    return chip ? chip.dataset.cat : 'all';
  }

  function toggleGroup(group) {
    var cat = group.querySelector('.sb-cat').dataset.cat;
    var open = !group.classList.contains('sb-exp');
    group.classList.toggle('sb-exp', open);
    group.querySelector('.sb-cat').setAttribute('aria-expanded', String(open));
    expanded[cat] = open;
    saveExp(expanded);
  }

  function bind() {
    root.addEventListener('click', function (e) {
      var catBtn = e.target.closest('.sb-cat');
      if (catBtn) {
        var group = catBtn.parentElement;
        toggleGroup(group);
        /* 首页：点分类标题同时联动筛选 */
        if (IS_HOME) {
          var chip = document.querySelector('.chip[data-cat="' + catBtn.dataset.cat + '"]');
          if (chip && chip.getAttribute('aria-pressed') !== 'true') chip.click();
        }
        return;
      }
      if (e.target.closest('.sb-close')) { setOpen(false); }
      if (e.target.closest('.sb-scan')) { openQr(); }
    });

    /* 展开分类后若列表很长，让当前项滚进视野 */
    root.addEventListener('click', function (e) {
      var li = e.target.closest('.sb-tools li.sb-cur');
      if (li) li.scrollIntoView({ block: 'nearest' });
    });

    /* 搜索：过滤所有工具名 */
    var input = root.querySelector('.sb-search input');
    if (input) {
      input.addEventListener('input', function () {
        var q = input.value.trim().toLowerCase();
        root.querySelectorAll('.sb-group').forEach(function (group) {
          var hit = 0;
          group.querySelectorAll('.sb-tools li').forEach(function (li) {
            var show = !q || li.textContent.toLowerCase().indexOf(q) !== -1;
            li.style.display = show ? '' : 'none';
            if (show) hit++;
          });
          group.style.display = hit ? '' : 'none';
          if (q && hit) group.classList.add('sb-exp');
        });
      });
    }

    /* 工具链接点击后（窄屏抽屉）自动收起 */
    root.addEventListener('click', function (e) {
      if (e.target.closest('.sb-tools a') && window.innerWidth < 1200) setOpen(false);
    });

    var toggle = document.getElementById('sidebar-toggle');
    var backdrop = document.getElementById('sidebar-backdrop');
    if (toggle) toggle.addEventListener('click', function () { setOpen(true); });
    if (backdrop) backdrop.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  function setOpen(open) {
    root.classList.toggle('sb-open', open);
    var backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.toggle('sb-show', open);
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

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeQr();
  });

  /* 首页：外部筛选变化时同步侧栏高亮（chips 点击 / 搜索重置） */
  function syncHome() {
    if (!IS_HOME) return;
    var active = currentFilter();
    root.querySelectorAll('.sb-cat').forEach(function (btn) {
      btn.classList.toggle('sb-active', btn.dataset.cat === active);
    });
  }

  build();
  bind();
  document.body.classList.add('sb-body');

  /* 页面自带的页内工具导航（如 quick 页）与全局侧栏内容重复，隐藏之。
   * 用内联样式而非 hidden 属性，避免被页面自身样式干扰；元素保留在
   * DOM 中，页面脚本对其的引用（搜索框监听等）不受影响。 */
  var ownNav = document.querySelector('.layout > aside.sidebar');
  if (ownNav) ownNav.style.display = 'none';

  /* quick 页切换工具（hash 变化）时同步侧栏当前项高亮；
   * 面板切换由页面自身脚本处理，这里只更新导航状态 */
  if (!IS_HOME && CUR === 'quick') {
    window.addEventListener('hashchange', function () {
      root.querySelectorAll('.sb-tools li').forEach(function (li) {
        var a = li.querySelector('a');
        li.classList.toggle('sb-cur', !!a && a.hash === location.hash && location.hash.length > 1);
      });
    });
  }
  if (IS_HOME) {
    var chipsBox = document.querySelector('.chips');
    if (chipsBox) {
      var observer = new MutationObserver(syncHome);
      observer.observe(chipsBox, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });
    }
  }
})();
