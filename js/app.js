/* 小胡的工具箱 · 首页交互
   搜索过滤、分类筛选、收藏、主题切换。无第三方请求。 */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var STORE = 'localtools:stars';
  var state = { q: '', cat: 'all' };

  var items = $$('li[data-slug]');
  var sections = $$('section.cat[data-cat]');
  var countEl = $('#count');
  var emptyEl = $('#empty');
  var searchEl = $('#q');

  /* ---------- 收藏 ---------- */
  function readStars() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE) || '[]');
      return Array.isArray(raw) ? raw.filter(function (s) { return typeof s === 'string'; }) : [];
    } catch (e) { return []; }
  }
  function writeStars(list) {
    try { localStorage.setItem(STORE, JSON.stringify(list)); } catch (e) { /* 隐私模式下忽略 */ }
  }

  var stars = readStars();
  var favSection = $('#favs');
  var favGrid = $('#fav-grid');

  function syncStars() {
    $$('.star').forEach(function (btn) {
      var on = stars.indexOf(btn.dataset.star) !== -1;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    renderFavs();
  }

  function renderFavs() {
    if (!favSection || !favGrid) return;
    favGrid.innerHTML = '';
    var list = stars.map(function (slug) {
      return $('li[data-slug="' + slug + '"]');
    }).filter(Boolean);

    list.forEach(function (li) {
      var clone = li.cloneNode(true);
      clone.classList.remove('is-hidden');
      favGrid.appendChild(clone);
    });
    bindStars(favGrid);

    favSection.hidden = list.length === 0;
    var label = $('#fav-count');
    if (label) label.textContent = list.length ? list.length + ' 个' : '';
  }

  function bindStars(scope) {
    $$('.star', scope).forEach(function (btn) {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var slug = btn.dataset.star;
        var i = stars.indexOf(slug);
        if (i === -1) stars.push(slug); else stars.splice(i, 1);
        writeStars(stars);
        syncStars();
      });
    });
  }

  /* ---------- 过滤 ---------- */
  function apply() {
    var terms = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;

    items.forEach(function (li) {
      var byCat = state.cat === 'all' || li.dataset.cat === state.cat;
      var key = li.dataset.key || '';
      var byText = terms.every(function (t) { return key.indexOf(t) !== -1; });
      var ok = byCat && byText;
      li.classList.toggle('is-hidden', !ok);
      if (ok) shown += 1;
    });

    sections.forEach(function (sec) {
      var any = $$('li[data-slug]', sec).some(function (li) {
        return !li.classList.contains('is-hidden');
      });
      sec.classList.toggle('is-hidden', !any);
    });

    if (countEl) countEl.textContent = String(shown);
    if (emptyEl) emptyEl.classList.toggle('show', shown === 0);
  }

  $$('.chip[data-cat]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      state.cat = chip.dataset.cat;
      $$('.chip[data-cat]').forEach(function (c) {
        c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
      });
      apply();
      chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      if (window.scrollY > 260) window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ---------- 分类 chips 滚动箭头 ---------- */
  (function () {
    var wrap = document.querySelector('.chips-wrap');
    var box = document.querySelector('.chips');
    if (!wrap || !box) return;
    var prev = wrap.querySelector('.chip-nav.prev');
    var next = wrap.querySelector('.chip-nav.next');
    function sync() {
      var max = box.scrollWidth - box.clientWidth;
      var left = box.scrollLeft;
      wrap.classList.toggle('can-left', left > 2);
      wrap.classList.toggle('can-right', left < max - 2);
      if (prev) prev.hidden = left <= 2;
      if (next) next.hidden = left >= max - 2;
    }
    function page(dir) {
      box.scrollBy({ left: dir * Math.max(240, box.clientWidth * 0.7), behavior: 'smooth' });
    }
    if (prev) prev.addEventListener('click', function () { page(-1); });
    if (next) next.addEventListener('click', function () { page(1); });
    box.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  })();

  if (searchEl) {
    searchEl.addEventListener('input', function () {
      state.q = searchEl.value;
      apply();
    });
    searchEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        searchEl.value = '';
        state.q = '';
        apply();
        searchEl.blur();
      }
    });
  }

  var resetBtn = $('#reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      state.q = '';
      state.cat = 'all';
      if (searchEl) searchEl.value = '';
      $$('.chip[data-cat]').forEach(function (c) {
        c.setAttribute('aria-pressed', c.dataset.cat === 'all' ? 'true' : 'false');
      });
      apply();
    });
  }

  /* / 聚焦搜索框 */
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || !searchEl || document.activeElement === searchEl) return;
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    searchEl.focus();
    searchEl.select();
  });

  /* ---------- 主题 ---------- */
  var themeBtn = $('#theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) { /* 忽略 */ }
    });
  }

  bindStars(document);
  syncStars();
  apply();
})();
