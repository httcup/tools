/* 周报生成器 — 条目编辑、排版生成、复制下载。零依赖。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var LS_KEY = 'wr.v1';
  var SECS = ['done', 'plan', 'risk'];
  var SEC_NAMES = { done: '本周完成', plan: '下周计划', risk: '问题与需要的支持' };

  var data = {
    name: '',
    items: { done: [], plan: [], risk: [] },   // [{text}]
    title: '周报',
    optDate: true,
    optNum: true,
    optSkipEmpty: true
  };

  /* ── 周期：本周一到周日 ─────────────────────────────────── */
  function weekRange() {
    var now = new Date();
    var day = (now.getDay() + 6) % 7; // 周一=0
    var mon = new Date(now); mon.setDate(now.getDate() - day);
    var sun = new Date(now); sun.setDate(now.getDate() + (6 - day));
    var f = function (d) {
      return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    };
    return f(mon) + ' - ' + f(sun);
  }

  /* ── 渲染条目列表 ───────────────────────────────────────── */
  function renderList(sec) {
    var ul = $('wr-list-' + sec);
    ul.innerHTML = '';
    data.items[sec].forEach(function (it, idx) {
      var li = document.createElement('li');
      li.className = 'wr-item';
      var ta = document.createElement('textarea');
      ta.rows = 1;
      ta.value = it.text;
      ta.placeholder = sec === 'done' ? '做了什么、结果如何' : (sec === 'plan' ? '计划做什么' : '卡在哪、需要谁支持');
      ta.addEventListener('input', function () {
        it.text = ta.value;
        render(); persist();
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'wr-del';
      del.setAttribute('aria-label', '删除这条');
      del.textContent = '×';
      del.addEventListener('click', function () {
        data.items[sec].splice(idx, 1);
        renderList(sec); render(); persist();
      });
      li.appendChild(ta);
      li.appendChild(del);
      ul.appendChild(li);
    });
    var emptyEl = document.querySelector('[data-empty="' + sec + '"]');
    if (emptyEl) emptyEl.hidden = data.items[sec].length > 0;
  }

  function add(sec) {
    data.items[sec].push({ text: '' });
    renderList(sec); persist();
    var tas = $('wr-list-' + sec).querySelectorAll('textarea');
    if (tas.length) tas[tas.length - 1].focus();
  }

  /* ── 生成周报文本 ───────────────────────────────────────── */
  function build() {
    var lines = [];
    var title = ($('wr-title').value || '').trim() || '周报';
    if (data.name) title = data.name + '的' + title;
    if (data.optDate) title += '（' + weekRange() + '）';
    lines.push('# ' + title, '');

    SECS.forEach(function (sec, i) {
      var items = data.items[sec].filter(function (it) { return it.text.trim(); });
      if (!items.length && data.optSkipEmpty) return;
      lines.push('## ' + SEC_NAMES[sec], '');
      items.forEach(function (it, idx) {
        var text = it.text.trim().replace(/\s+/g, ' ');
        lines.push((data.optNum ? (idx + 1) + '. ' : '- ') + text);
      });
      lines.push('');
    });

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  function render() {
    $('wr-preview').textContent = build();
  }

  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function restore() {
    try {
      var d = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (d && d.items) {
        data.name = d.name || '';
        data.items = d.items;
        SECS.forEach(function (s) { if (!Array.isArray(data.items[s])) data.items[s] = []; });
      }
    } catch (e) {}
    $('wr-name').value = data.name;
    $('wr-range').value = weekRange();
  }

  /* ── 事件 ───────────────────────────────────────────────── */
  document.querySelectorAll('[data-add]').forEach(function (b) {
    b.addEventListener('click', function () { add(b.dataset.add); });
  });

  $('wr-name').addEventListener('input', function () {
    data.name = this.value.trim();
    render(); persist();
  });

  $('wr-title').addEventListener('input', render);
  $('wr-opt-date').addEventListener('change', function () { data.optDate = this.checked; render(); });
  $('wr-opt-num').addEventListener('change', function () { data.optNum = this.checked; render(); });
  $('wr-opt-skip-empty').addEventListener('change', function () { data.optSkipEmpty = this.checked; render(); });

  function copyText(text, btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = '已复制';
      setTimeout(function () { btn.textContent = old; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  $('wr-copy').addEventListener('click', function () { copyText(build(), this); });

  function download(name, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  var fileStamp = function () {
    var n = new Date();
    return n.getFullYear() + ('0' + (n.getMonth() + 1)).slice(-2) + ('0' + n.getDate()).slice(-2);
  };
  $('wr-dl-md').addEventListener('click', function () { download(fileStamp() + '-周报.md', build()); });
  $('wr-dl-txt').addEventListener('click', function () { download(fileStamp() + '-周报.txt', build()); });

  restore();
  SECS.forEach(renderList);
  render();

  /* ── 测试钩子（?test=1）────────────────────────────────── */
  if (location.search.indexOf('test=1') >= 0) runTests();

  function runTests() {
    var out = [];
    var T = function (name, fn) {
      try { fn(); out.push(name + ': PASS'); }
      catch (e) { out.push(name + ': FAIL ' + e.message); }
    };
    var assert = function (c, m) { if (!c) throw new Error(m || 'assert'); };

    T('周期自动生成', function () {
      var r = weekRange();
      assert(/月\d+日 - \d+月\d+日/.test(r), '周期格式应为「x月x日 - x月x日」: ' + r);
    });

    T('添加条目并进预览', function () {
      add('done');
      var tas = $('wr-list-done').querySelectorAll('textarea');
      assert(tas.length === 1, '应有 1 条');
      tas[0].value = '上线退款流程改造，时效 48h→6h';
      tas[0].dispatchEvent(new Event('input'));
      var p = $('wr-preview').textContent;
      assert(p.indexOf('退款流程') >= 0, '预览应包含条目');
      assert(p.indexOf('## 本周完成') >= 0, '预览应有章节标题');
      assert(p.indexOf('1. ') >= 0, '条目应有编号');
    });

    T('空章节跳过开关', function () {
      $('wr-opt-skip-empty').checked = false;
      $('wr-opt-skip-empty').dispatchEvent(new Event('change'));
      assert($('wr-preview').textContent.indexOf('## 问题与需要的支持') >= 0, '关闭跳过后应输出空章节');
      $('wr-opt-skip-empty').checked = true;
      $('wr-opt-skip-empty').dispatchEvent(new Event('change'));
      assert($('wr-preview').textContent.indexOf('## 问题与需要的支持') < 0, '开启跳过后空章节应消失');
    });

    T('编号开关与署名标题', function () {
      $('wr-name').value = '小胡';
      $('wr-name').dispatchEvent(new Event('input'));
      var p = $('wr-preview').textContent;
      assert(p.indexOf('小胡的周报') >= 0, '标题应含署名');
      $('wr-opt-num').checked = false;
      $('wr-opt-num').dispatchEvent(new Event('change'));
      p = $('wr-preview').textContent;
      assert(p.indexOf('- 上线退款流程') >= 0, '关编号后应为短横线列表');
      $('wr-opt-num').checked = true;
      $('wr-opt-num').dispatchEvent(new Event('change'));
    });

    T('删除条目', function () {
      var n = data.items.done.length;
      var del = $('wr-list-done').querySelector('.wr-del');
      del.click();
      assert(data.items.done.length === n - 1, '删除后应少一条');
    });

    T('下载 .md 生成 Blob', function () {
      var text = build();
      var blob = new Blob([text], { type: 'text/plain' });
      assert(blob.size > 20, 'Blob 应非空');
      assert(text.indexOf('# ') === 0, '应以一级标题开头');
    });

    T('localStorage 持久化', function () {
      var saved = JSON.parse(localStorage.getItem('wr.v1') || 'null');
      assert(saved && saved.items && Array.isArray(saved.items.done), '应有本地保存');
    });

    var pass = out.filter(function (s) { return s.indexOf('PASS') >= 0; }).length;
    var pre = document.createElement('pre');
    pre.id = 'r';
    pre.textContent = out.join('\n') + '\nRESULTS: ' + pass + '/' + out.length + ' PASS';
    document.body.appendChild(pre);
  }
})();
