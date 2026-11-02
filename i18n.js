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
  /* 词典更新后把这个版本号 +1，老用户浏览器里的旧词典会自动失效 */
  var DICT_VER = 7;
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
  var optVal = new WeakMap();   // <option> 的原始文本 → value

  /* ---------- 基础工具 ---------- */
  function norm(s) {
    return String(s).replace(/\s+/g, ' ').trim();
  }

  /* 很多工具用 <option>文本</option> 建下拉框，靠 select.value 反查数据表，
   * 而 option 没有 value 属性时 value 就等于显示文本。译文一换，脚本里的中文
   * 键就查不到了。所以翻译前先把原文钉进 value，让取值始终是中文原文，
   * 用户看到的仍然是译文。 */
  function pinOptionValue(el) {
    if (el.tagName !== 'OPTION' || el.hasAttribute('value')) return;
    var v = optVal.get(el);
    if (v === undefined) { v = el.textContent; optVal.set(el, v); }
    if (el.getAttribute('value') !== v) el.setAttribute('value', v);
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

  function applyPattern(entry, text) {
    var m = entry[0].exec(text);
    if (!m) return null;
    return entry[1].replace(/\{\{(\d+)(\*t)?\}\}/g, function (w, n, tr) {
      if (m[+n] === undefined) return w;
      if (!tr) return m[+n];
      var inner = dict && dict[m[+n]];
      return inner || m[+n];
    });
  }

  function lookup(text) {
    if (!text || !isCJK(text)) return null;
    if (dict && Object.prototype.hasOwnProperty.call(dict, text)) return dict[text];
    if (patIndex) {
      var buckets = [patIndex[text.charAt(0)] || [], patIndex[''] || []];
      for (var b = 0; b < buckets.length; b++) {
        var list = buckets[b];
        for (var i = 0; i < list.length; i++) {
          var hit = applyPattern(list[i], text);
          if (hit !== null) return hit;
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
      pinOptionValue(node);
      ATTRS.forEach(function (name) {
        if (!node.hasAttribute(name)) return;
        var rec = attrOrig.get(node) || {};
        if (!(name in rec)) rec[name] = node.getAttribute(name);
        attrOrig.set(node, rec);
        var out = rec[name] === current ? null : translateRaw(rec[name]);
        var next = out === null ? rec[name] : out;
        if (node.getAttribute(name) !== next) {
          selfWrite.add(node);
          node.setAttribute(name, next);
        }
      });
    }
  }

  var lastError = null;

  function doText(node) {
    try {
      if (skipNode(node)) return;
      var orig = textOrig.get(node);
      if (orig === undefined) { orig = node.nodeValue; textOrig.set(node, orig); }
      var out = translateRaw(orig);
      var next = out === null ? orig : out;
      if (node.nodeValue !== next) { selfWrite.add(node); node.nodeValue = next; }
    } catch (e) {
      if (!lastError) lastError = e;
    }
  }

  function doElem(node) {
    try { applyNode(node); } catch (e) { if (!lastError) lastError = e; }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) doElem(root);

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
      if (n.nodeType === 1) doElem(n);
      else doText(n);
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
  var selfWrite = new WeakSet();   // 我们自己写进去的值，避免被当成变化再翻一遍
  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
  }
  function flush() {
    scheduled = false;
    if (applying) { schedule(); return; }   // 正在翻译：让出这一帧，别把队列丢了
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
    schedule();
  }

  function observe() {
    if (!window.MutationObserver) return;
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        var list = r.type === 'characterData' ? [r.target] : r.addedNodes;
        for (var j = 0; j < list.length; j++) {
          var t = list[j];
          if (selfWrite.has(t)) continue;   // 自己的写入，跳过
          queue(t);                          // 翻译过程中插入的内容也要留到下一轮
        }
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
      var raw = localStorage.getItem(CACHE + DICT_VER + '-' + id);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeCache(id, data) {
    var key = CACHE + DICT_VER + '-';
    try {
      /* 词典体积不小，只保留当前语言，避免占满 localStorage */
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && k.indexOf(key) === 0 && k !== key + id) localStorage.removeItem(k);
      }
    } catch (e) {}
    try { localStorage.setItem(key + id, JSON.stringify(data)); } catch (e) {}
  }

  function getJSON(file) {
    return fetch(BASE + 'i18n/' + file + '?v=' + DICT_VER, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /* 模板预编译 + 按首字分桶：词典里上千条占位符模板，逐条 match 会拖慢页面 */
  var patIndex = null;

  function setDict(data) {
    if (!data) { dict = null; patterns = null; patIndex = null; return; }
    dict = data;
    var raw = data.__patterns || null;
    patterns = null;
    patIndex = null;
    if (raw && raw.length) {
      patterns = [];
      patIndex = {};
      for (var i = 0; i < raw.length; i++) {
        var rx;
        try { rx = new RegExp(raw[i][0]); } catch (e) { continue; }
        var entry = [rx, raw[i][1]];
        patterns.push(entry);
        var first = rx.source.charAt(0) === '^' ? rx.source.charAt(1) : rx.source.charAt(0);
        var key = '\\^$.|?*+()[]{}'.indexOf(first) >= 0 ? '' : first;
        (patIndex[key] || (patIndex[key] = [])).push(entry);
      }
    }
    if (dict) { delete dict.__patterns; }
  }

  function load(id) {
    if (id === 'zh-Hans') { dict = null; patterns = null; patIndex = null; chars = null; return Promise.resolve(); }
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

  window.siteI18n = { switchTo: switchTo, get lang() { return current; }, languages: LANGS, get error() { return lastError; } };
})();
