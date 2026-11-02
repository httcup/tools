/* 全站语言切换：简体中文（源语言）、繁體中文、English、日本語、Français、Español
 *
 * 工作方式：页面只有一套中文原文，切换语言时用 i18n/<lang>.json 里的
 * 「中文原文 → 译文」对照表替换页面上的文本节点与可翻译属性；
 * 繁体走 OpenCC 生成的字符表 + 词表，不需要逐条译文。
 * 未收录的字符串保持中文原文（渐进式覆盖，新增工具不会因此报错）。
 */
(function () {
  'use strict';

  var LANGS = [
    { id: 'zh-Hans', label: '简体中文', code: '简', tag: 'zh-Hans' },
    { id: 'zh-Hant', label: '繁體中文', code: '繁', tag: 'zh-Hant' },
    { id: 'en', label: 'English', code: 'EN', tag: 'en' },
    { id: 'ja', label: '日本語', code: '日', tag: 'ja' },
    { id: 'fr', label: 'Français', code: 'FR', tag: 'fr' },
    { id: 'es', label: 'Español', code: 'ES', tag: 'es' }
  ];
  var STORE = 'abox-lang';
  var CACHE = 'abox-i18n-dict-';
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var SKIP_TAGS = /^(SCRIPT|STYLE|PRE|CODE|TEXTAREA|KBD|SAMP|SVG)$/;

  var script = document.currentScript;
  var BASE = script && script.src ? script.src.replace(/[^/]*$/, '') : '';
  var current = 'zh-Hans';
  var dict = null;      // 当前语言的对照表
  var patterns = null;  // 带变量的句子
  var chars = null;     // 繁体字符表
  var applying = false;
  var textOrig = new WeakMap();
  var attrOrig = new WeakMap();

  /* ---------- 基础工具 ---------- */
  function norm(s) {
    return String(s).replace(/\s+/g, ' ').trim();
  }

  function isCJK(s) {
    return /[\u3400-\u9fff]/.test(s);
  }

  function convertChars(s) {
    if (!chars) return null;
    var out = '', hit = false;
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i), t = chars[c];
      if (t) { out += t; hit = true; } else { out += c; }
    }
    return hit ? out : null;
  }

  function lookup(text) {
    if (!text || !isCJK(text)) return null;
    if (dict && Object.prototype.hasOwnProperty.call(dict, text)) return dict[text];
    if (patterns) {
      for (var i = 0; i < patterns.length; i++) {
        var m = text.match(patterns[i][0]);
        if (m) {
          return patterns[i][1].replace(/\{\{(\d+)(\*t)?\}\}/g, function (w, n, tr) {
            if (m[+n] === undefined) return w;
            if (!tr) return m[+n];
            var inner = dict && dict[m[+n]];
            return inner || m[+n];
          });
        }
      }
    }
    return convertChars(text);
  }

  /* 保留原文首尾空白的替换 */
  function translateRaw(raw) {
    var core = norm(raw);
    if (!core) return null;
    var t = lookup(core);
    if (t === null || t === undefined || t === core) return null;
    var lead = raw.match(/^\s*/)[0];
    var tail = raw.match(/\s*$/)[0];
    return lead + t + tail;
  }

  function skipNode(node) {
    var el = node.parentElement;
    while (el) {
      if (SKIP_TAGS.test(el.tagName)) return true;
      if (el.hasAttribute && el.hasAttribute('data-i18n-skip')) return true;
      if (el.classList && el.classList.contains('notranslate')) return true;
      el = el.parentElement;
    }
    return false;
  }

  /* ---------- 应用翻译 ---------- */
  function applyNode(node) {
    if (node.nodeType === 1) {
      ATTRS.forEach(function (name) {
        if (!node.hasAttribute(name)) return;
        var rec = attrOrig.get(node) || {};
        if (!(name in rec)) rec[name] = node.getAttribute(name);
        attrOrig.set(node, rec);
        var out = rec[name] === current ? null : translateRaw(rec[name]);
        node.setAttribute(name, out === null ? rec[name] : out);
      });
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      if (skipNode(root)) return;
      var orig = textOrig.get(root);
      if (orig === undefined) { orig = root.nodeValue; textOrig.set(root, orig); }
      var out = translateRaw(orig);
      var next = out === null ? orig : out;
      if (root.nodeValue !== next) root.nodeValue = next;
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) applyNode(root);

    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          if (SKIP_TAGS.test(n.tagName)) return NodeFilter.FILTER_REJECT;
          if (n.hasAttribute('data-i18n-skip') || n.classList.contains('notranslate')) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 1) applyNode(n);
      else {
        var o = textOrig.get(n);
        if (o === undefined) { o = n.nodeValue; textOrig.set(n, o); }
        var r = translateRaw(o);
        var v = r === null ? o : r;
        if (n.nodeValue !== v) n.nodeValue = v;
      }
    }
  }

  function applyAll() {
    if (applying) return;
    applying = true;
    try { walk(document.documentElement); } finally { applying = false; }
  }

  /* ---------- 动态内容 ---------- */
  var pending = new Set();
  var scheduled = false;
  function flush() {
    scheduled = false;
    if (applying) return;
    applying = true;
    try {
      pending.forEach(function (n) {
        if (n.isConnected) walk(n);
      });
    } finally {
      applying = false;
      pending.clear();
    }
  }
  function queue(n) {
    pending.add(n);
    if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
  }

  function observe() {
    if (!window.MutationObserver) return;
    new MutationObserver(function (records) {
      if (applying) return;
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === 'characterData') queue(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) queue(r.addedNodes[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  /* ---------- 语言选择 ---------- */
  function detect() {
    var prefs = navigator.languages || [navigator.language || 'zh-Hans'];
    for (var i = 0; i < prefs.length; i++) {
      var p = String(prefs[i]).toLowerCase();
      if (/^zh(-(tw|hk|mo|hant))?/.test(p)) {
        if (/tw|hk|mo|hant/.test(p)) return 'zh-Hant';
        if (/^zh$/.test(p) || /cn|hans|sg/.test(p)) return 'zh-Hans';
      }
      if (/^ja/.test(p)) return 'ja';
      if (/^fr/.test(p)) return 'fr';
      if (/^es/.test(p)) return 'es';
      if (/^en/.test(p)) return 'en';
    }
    return 'zh-Hans';
  }

  function stored() {
    try {
      var v = localStorage.getItem(STORE);
      for (var i = 0; i < LANGS.length; i++) if (LANGS[i].id === v) return v;
    } catch (e) {}
    return null;
  }

  /* ?lang=en 之类可以直接指定语言，方便分享与测试 */
  function fromQuery() {
    var m = /[?&]lang=([\w-]+)/.exec(location.search);
    if (!m) return null;
    for (var i = 0; i < LANGS.length; i++) {
      if (LANGS[i].id.toLowerCase() === m[1].toLowerCase()) return LANGS[i].id;
    }
    return null;
  }

  function save(id) {
    try { localStorage.setItem(STORE, id); } catch (e) {}
  }

  /* ---------- 按访问者所在国家自动选语言 ---------- */
  var GEO_KEY = 'abox-geo-lang';
  var HANT = ['TW', 'HK', 'MO'];
  var HANS = ['CN', 'SG'];
  var FR = ['FR', 'BE', 'CH', 'MC', 'LU', 'SN', 'CI', 'ML', 'BF', 'NE', 'TG', 'BJ',
            'GA', 'CG', 'CD', 'MG', 'CM', 'HT', 'DJ', 'KM', 'SC', 'VU', 'RE', 'GP',
            'MQ', 'GF', 'NC', 'PF'];
  var ES = ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'UY', 'PY', 'BO', 'EC', 'CR',
            'GT', 'HN', 'NI', 'PA', 'DO', 'PR', 'CU', 'SV', 'GQ'];

  function langForCountry(cc) {
    cc = String(cc || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) return null;
    if (HANT.indexOf(cc) >= 0) return 'zh-Hant';
    if (HANS.indexOf(cc) >= 0) return 'zh-Hans';
    if (cc === 'JP') return 'ja';
    if (FR.indexOf(cc) >= 0) return 'fr';
    if (ES.indexOf(cc) >= 0) return 'es';
    return 'en';
  }

  function geoCached() {
    try {
      var raw = sessionStorage.getItem(GEO_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (o && o.l && Date.now() - o.t < 6 * 3600 * 1000) return o.l;
    } catch (e) {}
    return null;
  }

  function getText(url, ms) {
    if (!window.fetch) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var done = false, ctrl = null, timer;
      function finish(v) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(v);
      }
      timer = setTimeout(function () {
        try { if (ctrl) ctrl.abort(); } catch (e) {}
        finish(null);
      }, ms);
      try {
        ctrl = window.AbortController ? new AbortController() : null;
        fetch(url, { credentials: 'omit', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
          .then(function (r) { return r.ok ? r.text() : null; })
          .then(finish, function () { finish(null); });
      } catch (e) { finish(null); }
    });
  }

  /* Cloudflare 的 /cdn-cgi/trace 直接给出 loc=国家码，同源、无需第三方；
     非 Cloudflare 部署时退回公共 IP 归属地接口。 */
  function detectByIP() {
    var cached = geoCached();
    if (cached) return Promise.resolve(cached);

    return getText(BASE + 'cdn-cgi/trace', 1200).then(function (body) {
      var m = body && /(?:^|\n)loc=([A-Z]{2})/.exec(body);
      if (m) return langForCountry(m[1]);
      return getText('https://ipwho.is/?fields=country_code', 1500).then(function (t) {
        if (t) {
          try {
            var j = JSON.parse(t);
            if (j && j.country_code) return langForCountry(j.country_code);
          } catch (e) {}
        }
        return getText('https://ipapi.co/country/', 1500).then(function (c) {
          return c && /^[A-Za-z]{2}$/.test(c.trim()) ? langForCountry(c.trim()) : null;
        });
      });
    }).then(function (lang) {
      if (lang) {
        try { sessionStorage.setItem(GEO_KEY, JSON.stringify({ l: lang, t: Date.now() })); } catch (e) {}
      }
      return lang;
    }).catch(function () { return null; });
  }

  /* ---------- 读取词典 ---------- */
  function readCache(id) {
    try {
      var raw = localStorage.getItem(CACHE + id);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeCache(id, data) {
    try { localStorage.setItem(CACHE + id, JSON.stringify(data)); } catch (e) {}
  }

  function getJSON(file) {
    return fetch(BASE + 'i18n/' + file, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function setDict(data) {
    if (!data) { dict = null; patterns = null; return; }
    dict = data;
    patterns = data.__patterns || null;
    if (dict) { delete dict.__patterns; }
  }

  function load(id) {
    if (id === 'zh-Hans') { dict = null; patterns = null; chars = null; return Promise.resolve(); }
    var cached = readCache(id);
    if (cached) { setDict(cached); if (id !== 'zh-Hant' || chars) return Promise.resolve(); }

    var jobs = [];
    jobs.push(getJSON(id + '.json').then(function (d) {
      if (d) { setDict(d); writeCache(id, d); }
      else if (!cached) setDict(null);
    }));
    if (id === 'zh-Hant' && !chars) {
      jobs.push(getJSON('zh-Hant.chars.json').then(function (c) { if (c) chars = c; }));
    }
    return Promise.all(jobs);
  }

  /* ---------- 切换器 ---------- */
  var GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/>' +
    '<path d="M12 3c2.4 2.7 2.4 15.3 0 18M12 3c-2.4 2.7-2.4 15.3 0 18"/></svg>';

  function syncSwitcher(id) {
    var items = document.querySelectorAll('.lang-item');
    for (var i = 0; i < items.length; i++) {
      var on = items[i].getAttribute('data-lang') === id;
      items[i].setAttribute('aria-checked', on ? 'true' : 'false');
      items[i].classList.toggle('is-current', on);
    }
    var btn = document.getElementById('lang-btn');
    if (btn) {
      var label = '语言 / Language';
      for (var j = 0; j < LANGS.length; j++) {
        if (LANGS[j].id === id) label = LANGS[j].label + ' · Language';
      }
      btn.title = label;
      btn.setAttribute('aria-label', label);
      btn.setAttribute('data-lang', id);
    }
  }

  function buildSwitcher() {
    var box = document.createElement('div');
    box.className = 'lang-switch';
    box.setAttribute('data-i18n-skip', '');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-btn';
    btn.id = 'lang-btn';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', '语言 / Language');
    btn.title = '语言 / Language';
    btn.innerHTML = GLOBE;

    var menu = document.createElement('div');
    menu.className = 'lang-menu';
    menu.id = 'lang-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    LANGS.forEach(function (l) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'lang-item';
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('data-lang', l.id);
      item.innerHTML = '<span class="lang-name"></span><span class="lang-code"></span>';
      item.querySelector('.lang-name').textContent = l.label;
      item.querySelector('.lang-code').textContent = l.code;
      item.addEventListener('click', function () {
        close();
        applyLang(l.id, true);
      });
      menu.appendChild(item);
    });

    function open() {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      box.classList.add('open');
      var cur = menu.querySelector('.is-current');
      if (cur && cur.focus) cur.focus();
    }

    function close() {
      if (menu.hidden) return;
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      box.classList.remove('open');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.hidden) open(); else close();
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !box.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') close();
    });

    box.appendChild(btn);
    box.appendChild(menu);

    var host = document.querySelector('.head-tools') ||
               document.querySelector('.topbar-actions') ||
               document.querySelector('header');
    if (host) host.appendChild(box);
    else document.body.insertBefore(box, document.body.firstChild);

    syncSwitcher(current);
  }

  function mount() {
    if (document.querySelector('.lang-switch')) return;
    buildSwitcher();
  }

  /* ---------- 对外切换 ---------- */
  function applyLang(id, persist) {
    var known = null;
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].id === id) known = LANGS[i];
    if (!known) id = 'zh-Hans';
    current = id;
    if (persist) save(id);
    var tag = (known || LANGS[0]).tag;
    document.documentElement.lang = tag;
    document.documentElement.setAttribute('data-lang', id);
    syncSwitcher(id);

    return load(id).then(function () {
      applyAll();
      document.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: id } }));
    });
  }

  function switchTo(id) { return applyLang(id, true); }

  /* 没有手动选择时，按 IP 国家自动适配；国内/日本/法语区/西语区各自落到对应语言 */
  function autoDetect() {
    detectByIP().then(function (lang) {
      if (!lang || lang === current) return;
      if (stored()) return;            // 期间用户已手动选择，尊重用户
      applyLang(lang, false);
    });
  }

  /* ---------- 启动 ---------- */
  var explicit = fromQuery() || stored();
  if (explicit === 'zh-Hans') explicit = 'zh-Hans';
  current = explicit || detect();
  if (fromQuery()) save(current);
  document.documentElement.setAttribute('data-lang', current);
  document.documentElement.lang = current;

  var startDict = current !== 'zh-Hans' ? readCache(current) : null;
  if (startDict) setDict(startDict);

  function boot() {
    mount();
    if (current !== 'zh-Hans') applyLang(current, false);
    else applyAll();
    observe();
    if (!explicit) autoDetect();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.siteI18n = { switchTo: switchTo, get lang() { return current; }, languages: LANGS };
})();
