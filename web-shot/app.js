/* 网页文章截图 — 富文本/Markdown/纯文本解析、canvas 长图排版、导出。零依赖。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var THEMES = {
    clean: { bg: '#ffffff', fg: '#1f2328', muted: '#8a919c', accent: '#1971c2', quoteBg: '#f2f6fc', quoteBar: '#1971c2', rule: '#e8eaee' },
    paper: { bg: '#fbf6ea', fg: '#3d3528', muted: '#9a8f7a', accent: '#a05a2c', quoteBg: '#f3ecda', quoteBar: '#a05a2c', rule: '#e6dcc4' },
    dark: { bg: '#1c1f26', fg: '#e6e8ec', muted: '#8b93a1', accent: '#69a6f8', quoteBg: '#252a34', quoteBar: '#69a6f8', rule: '#333a47' }
  };

  /* ── 内容解析：统一成块数组 ──────────────────────────────── */
  // blocks: [{t:'h2'|'p'|'quote'|'li'|'rule', text}]

  function parseHtml(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var root = doc.querySelector('#js_content') || doc.body || doc.documentElement;
    var blocks = [];
    (function walk(node) {
      node.childNodes.forEach(function (n) {
        if (n.nodeType === 3) {
          var txt = n.textContent.replace(/\s+/g, ' ').trim();
          if (txt) blocks.push({ t: 'p', text: txt });
          return;
        }
        if (n.nodeType !== 1) return;
        var tag = n.tagName.toLowerCase();
        if (/^(script|style|img|svg|figure|video|iframe|button|input|form|noscript)$/.test(tag)) {
          return;
        }
        if (/^h[1-3]$/.test(tag)) {
          var t = n.textContent.replace(/\s+/g, ' ').trim();
          if (t) blocks.push({ t: 'h2', text: t });
        } else if (tag === 'blockquote') {
          var q = n.textContent.replace(/\s+/g, ' ').trim();
          if (q) blocks.push({ t: 'quote', text: q });
        } else if (tag === 'li') {
          var li = n.textContent.replace(/\s+/g, ' ').trim();
          if (li) blocks.push({ t: 'li', text: li });
        } else if (tag === 'hr') {
          blocks.push({ t: 'rule' });
        } else if (tag === 'br') {
          /* skip */
        } else {
          walk(n);
        }
      });
    })(root);
    return dedupe(blocks);
  }

  function parseMarkdown(text) {
    var blocks = [];
    text.split(/\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      var m;
      if ((m = line.match(/^#{1,6}\s+(.+)$/))) blocks.push({ t: 'h2', text: m[1] });
      else if ((m = line.match(/^[-*•]\s+(.+)$/)) || (m = line.match(/^\d+[.、]\s+(.+)$/))) blocks.push({ t: 'li', text: m[1] });
      else if ((m = line.match(/^>\s?(.*)$/))) { if (m[1].trim()) blocks.push({ t: 'quote', text: m[1] }); }
      else if (/^(-{3,}|\*{3,})$/.test(line)) blocks.push({ t: 'rule' });
      else blocks.push({ t: 'p', text: line.replace(/[*_`]/g, '') });
    });
    return dedupe(blocks);
  }

  function parsePlain(text) {
    var blocks = [];
    text.split(/\n+/).forEach(function (para) {
      var line = para.trim();
      if (!line) return;
      if (/^第?[一二三四五六七八九十\d]+[、.．:：]/.test(line) && line.length < 40) blocks.push({ t: 'h2', text: line });
      else blocks.push({ t: 'p', text: line });
    });
    return dedupe(blocks);
  }

  function dedupe(blocks) {
    var out = [];
    blocks.forEach(function (b) {
      var prev = out[out.length - 1];
      if (prev && prev.t === b.t && prev.text === b.text) return;
      out.push(b);
    });
    return out;
  }

  function autoParse(raw) {
    var text = raw.trim();
    if (!text) return [];
    if (/^<\w+[\s\S]*>[\s\S]*$/.test(text) && text.indexOf('<') === 0) return parseHtml(text);
    if (/^#{1,6}\s|\n[-*]\s|\n>\s/.test('\n' + text)) return parseMarkdown(text);
    return parsePlain(text);
  }

  /* ── Canvas 排版 ────────────────────────────────────────── */
  function wrap(ctx, text, maxW) {
    var lines = [];
    var cur = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ctx.measureText(cur + ch).width > maxW && cur) {
        lines.push(cur);
        cur = ch;
      } else {
        cur += ch;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function render(opts) {
    var T = THEMES[opts.theme] || THEMES.clean;
    var W = opts.width;
    var PAD = Math.round(W * 0.08);
    var bodyW = W - PAD * 2;
    var fs = opts.fontSize;

    // 先在离屏量排版
    var measure = document.createElement('canvas').getContext('2d');
    var blocks = opts.blocks;
    var lines = [];  // {kind, text, size, lh, color, weight, indent, gapBefore, gapAfter, quote, rule}

    function pushLines(kind, text, size, lh, color, weight, extra) {
      measure.font = weight + ' ' + size + 'px ' + FONT_STACK;
      var ws = wrap(measure, text, bodyW - (extra && extra.indent || 0) - (extra && extra.pad || 0));
      ws.forEach(function (l, i) {
        lines.push(Object.assign({ kind: kind, text: l, size: size, lh: lh, color: color, weight: weight, first: i === 0 }, extra || {}));
      });
    }
    var FONT_STACK = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

    // 标题
    var title = (opts.title || '').trim();
    if (title) pushLines('title', title, Math.round(fs * 1.7), fs * 1.7 * 1.4, T.fg, '700', { gapBefore: 6, gapAfter: 8 });
    if (opts.meta) pushLines('meta', opts.meta.trim(), Math.round(fs * 0.82), fs * 1.2, T.muted, '400', { gapAfter: 14 });

    blocks.forEach(function (b, idx) {
      if (b.t === 'h2') pushLines('h2', b.text, Math.round(fs * 1.3), fs * 1.3 * 1.45, T.fg, '700', { gapBefore: idx ? 14 : 6, gapAfter: 4 });
      else if (b.t === 'quote') pushLines('quote', b.text, Math.round(fs * 0.92), fs * 1.62, T.muted, '400', { quote: true, pad: 14, gapBefore: 6, gapAfter: 6 });
      else if (b.t === 'li') pushLines('li', b.text, fs, fs * 1.85, T.fg, '400', { bullet: true, indent: 22, gapAfter: 3 });
      else if (b.t === 'rule') lines.push({ kind: 'rule' });
      else pushLines('p', b.text, fs, fs * 1.85, T.fg, '400', {});
    });

    // 算高度
    var y = PAD;
    var prev = null;
    lines.forEach(function (l) {
      if (l.kind === 'rule') { l.y = y + 10; y += 21; prev = l; return; }
      y += (l.gapBefore || 0);
      l.y = y;
      y += l.lh;
      y += (l.gapAfter || 0);
      prev = l;
    });
    var tail = opts.tail ? Math.round(fs * 2.2) : 0;
    var H = Math.round(y + tail + PAD);

    // 绘制
    var scale = 2;
    var canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = H * scale;
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, W, H);
    // 顶部细色条
    ctx.fillStyle = T.accent;
    ctx.fillRect(0, 0, W, 4);

    var quoteStart = null;
    lines.forEach(function (l, i) {
      if (l.kind === 'rule') {
        ctx.fillStyle = T.rule;
        ctx.fillRect(PAD, l.y, bodyW, 1);
        return;
      }
      // 引用底色合并绘制
      if (l.quote && quoteStart === null) quoteStart = l;
      if (!l.quote && quoteStart) {
        var y0 = quoteStart.y - (quoteStart.gapBefore || 0) * 0.4;
        var y1 = lines[i - 1].y + lines[i - 1].lh + (lines[i - 1].gapAfter || 0) * 0.6;
        ctx.fillStyle = T.quoteBg;
        ctx.fillRect(PAD, y0 - 4, bodyW, y1 - y0 + 8);
        ctx.fillStyle = T.quoteBar;
        ctx.fillRect(PAD, y0 - 4, 3, y1 - y0 + 8);
        quoteStart = null;
      }
      ctx.fillStyle = l.color;
      ctx.font = l.weight + ' ' + l.size + 'px ' + FONT_STACK;
      ctx.textBaseline = 'top';
      var x = PAD + (l.indent || 0);
      if (l.bullet && l.first) {
        ctx.beginPath();
        ctx.arc(PAD + 7, l.y + l.lh * 0.42, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (l.kind === 'h2' && l.first) {
        ctx.fillStyle = T.accent;
        ctx.fillRect(PAD, l.y + 2, 4, l.size);
        x = PAD + 14;
      }
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, x, l.y);
    });

    if (opts.tail) {
      ctx.fillStyle = T.muted;
      ctx.font = Math.round(fs * 0.78) + 'px ' + FONT_STACK;
      ctx.textAlign = 'center';
      ctx.fillText('— 小胡的工具箱 · 139t.cn —', W / 2, H - PAD + 6);
      ctx.textAlign = 'left';
    }
    return { canvas: canvas, height: H };
  }

  /* ── 抓取（r.jina.ai 只读代理）──────────────────────────── */
  async function fetchArticle(url) {
    var r = await fetch('https://r.jina.ai/' + url);
    if (!r.ok) throw new Error('抓取失败 HTTP ' + r.status);
    var text = await r.text();
    // jina 返回 Markdown：首行 Title: / URL Source: / Markdown Content:
    var title = '', body = text;
    var m = text.match(/^Title:\s*(.+)$/m);
    if (m) title = m[1];
    body = body.replace(/^Title:.*$/m, '').replace(/^URL Source:.*$/m, '').replace(/^Markdown Content:\s*/m, '');
    return { title: title, body: body };
  }

  /* ── 界面 ───────────────────────────────────────────────── */
  var lastCanvas = null;

  function rebuild() {
    var raw = $('ws-content').value;
    var blocks = autoParse(raw);
    var emptyEl = $('ws-empty');
    if (!blocks.length && !$('ws-title').value.trim()) {
      emptyEl.hidden = false;
      $('ws-canvas').style.display = 'none';
      $('ws-dl').disabled = true;
      lastCanvas = null;
      return;
    }
    var out = render({
      blocks: blocks,
      title: $('ws-title').value,
      meta: $('ws-meta').value,
      width: Number($('ws-width').value),
      theme: $('ws-theme').value,
      fontSize: Number($('ws-font').value),
      tail: $('ws-tail').checked
    });
    lastCanvas = out.canvas;
    var shown = $('ws-canvas');
    shown.style.display = 'block';
    shown.width = out.canvas.width;
    shown.height = out.canvas.height;
    shown.getContext('2d').drawImage(out.canvas, 0, 0);
    emptyEl.hidden = true;
    $('ws-dl').disabled = false;
  }

  ['ws-title', 'ws-meta', 'ws-content', 'ws-width', 'ws-theme', 'ws-font', 'ws-tail'].forEach(function (id) {
    $(id).addEventListener('input', rebuild);
    $(id).addEventListener('change', rebuild);
  });

  document.querySelector('.ws-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (!b) return;
    document.querySelectorAll('.ws-tab').forEach(function (x) {
      x.classList.toggle('active', x === b);
      x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    });
    $('ws-pane-paste').hidden = b.dataset.tab !== 'paste';
    $('ws-pane-url').hidden = b.dataset.tab !== 'url';
  });

  $('ws-fetch').addEventListener('click', async function () {
    var url = $('ws-url').value.trim();
    if (!url) return;
    this.disabled = true;
    this.textContent = '抓取中…';
    try {
      var art = await fetchArticle(url);
      $('ws-title').value = art.title || $('ws-title').value;
      $('ws-meta').value = url;
      $('ws-content').value = art.body.trim();
      rebuild();
    } catch (e) {
      alert('抓取失败：' + e.message + '。可以打开文章后复制正文，回到「粘贴正文」手动贴。');
    }
    this.disabled = false;
    this.textContent = '抓取正文';
  });

  $('ws-dl').addEventListener('click', function () {
    if (!lastCanvas) return;
    var a = document.createElement('a');
    a.download = '文章长图-' + new Date().toISOString().slice(0, 10) + '.png';
    a.href = lastCanvas.toDataURL('image/png');
    a.click();
  });

  /* ── 测试钩子（?test=1）────────────────────────────────── */
  if (location.search.indexOf('test=1') >= 0) runTests();

  function runTests() {
    window.WS = { parseHtml: parseHtml, parseMarkdown: parseMarkdown, parsePlain: parsePlain, render: render, autoParse: autoParse };
    var out = [];
    var T = function (name, fn) {
      try { fn(); out.push(name + ': PASS'); }
      catch (e) { out.push(name + ': FAIL ' + e.message); }
    };
    var assert = function (c, m) { if (!c) throw new Error(m || 'assert'); };

    T('HTML 解析（公众号结构）', function () {
      var html = '<div id="js_content"><h2>第一部分</h2><p>这是段落一。</p><blockquote>引用内容</blockquote><ul><li>要点甲</li><li>要点乙</li></ul><img src="x.jpg"><script>bad()</' + 'script></div>';
      var b = parseHtml(html);
      assert(b.length === 5, '应解析出 5 块: ' + JSON.stringify(b));
      assert(b[0].t === 'h2' && b[0].text === '第一部分', '标题块');
      assert(b[2].t === 'quote', '引用块');
      assert(b[3].t === 'li' && b[4].t === 'li', '列表块');
    });

    T('Markdown 解析', function () {
      var b = parseMarkdown('# 大标题\n\n正文段落。\n\n## 小节\n\n- 甲\n- 乙\n\n> 引用\n\n---');
      assert(b[0].t === 'h2' && b[0].text === '大标题', '首块应为标题');
      assert(b[2].t === 'h2' && b[2].text === '小节', '二级标题');
      assert(b[3].t === 'li' && b[4].t === 'li', '列表');
      assert(b[5].t === 'quote', '引用');
      assert(b[6].t === 'rule', '分隔线');
    });

    T('纯文本章节识别', function () {
      var b = parsePlain('一、开箱\n盒子很精致。\n二、体验\n屏幕不错。');
      assert(b[0].t === 'h2' && b[1].t === 'p' && b[2].t === 'h2', '章节标题应识别: ' + JSON.stringify(b));
    });

    T('自动识别选择解析器', function () {
      assert(autoParse('<p>hi</p>').length === 1, 'HTML 走 HTML');
      assert(autoParse('# 标题\n- 甲').length === 2, 'MD 走 Markdown');
      assert(autoParse('普通文字段落').length === 1, '纯文本');
    });

    T('长图渲染：标题/段落/引用/列表', function () {
      var r = render({
        blocks: autoParse('第一段内容。\n\n## 小标题\n\n列表项一\n列表项二\n\n> 一句引用'),
        title: '测试文章标题',
        meta: '公众号 · 2026-11-02',
        width: 750, theme: 'clean', fontSize: 17, tail: true
      });
      assert(r.canvas.width === 1500, '2x 导出应为 1500px 宽: ' + r.canvas.width);
      assert(r.canvas.height > 800, '高度应可观: ' + r.canvas.height);
      var d = r.canvas.getContext('2d').getImageData(20, 20, 1, 1).data;
      assert(d[0] === 255 && d[1] === 255, '背景应为白');
      var url = r.canvas.toDataURL('image/png');
      assert(url.length > 20000, '导出 dataURL 应有内容: ' + url.length);
      window.__r = r;
    });

    T('三种主题渲染', function () {
      ['paper', 'dark'].forEach(function (t) {
        var r = render({ blocks: [{ t: 'p', text: '你好世界，这是一段测试文本。' }], title: 'T', width: 750, theme: t, fontSize: 17, tail: false });
        var d = r.canvas.getContext('2d').getImageData(375 * 2, 100, 1, 1).data;
        assert(d[3] === 255, t + ' 主题应有背景');
      });
    });

    T('长文本换行不越界', function () {
      var long = '这是一段特别长的文字用来测试换行逻辑。'.repeat(20);
      var r = render({ blocks: [{ t: 'p', text: long }], title: '', width: 750, theme: 'clean', fontSize: 17, tail: false });
      var d = r.canvas.getContext('2d').getImageData(r.canvas.width - 2, r.canvas.height / 2, 1, 1).data;
      assert(d[0] === 255, '右边缘应留白（不越界）');
    });

    var pass = out.filter(function (s) { return s.indexOf('PASS') >= 0; }).length;
    var pre = document.createElement('pre');
    pre.id = 'r';
    pre.textContent = out.join('\n') + '\nRESULTS: ' + pass + '/' + out.length + ' PASS';
    document.body.appendChild(pre);
  }
})();
