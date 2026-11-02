/* 在线提词器 — 滚动逻辑、快捷键、本地保存。零依赖。 */
(function () {
  'use strict';

  var KEY = 'tp.v1';

  var $ = function (id) { return document.getElementById(id); };

  var els = {
    text: $('tp-text'), count: $('tp-count'),
    speed: $('tp-speed'), speedV: $('tp-speed-v'),
    size: $('tp-size'), sizeV: $('tp-size-v'),
    width: $('tp-width'), widthV: $('tp-width-v'),
    delay: $('tp-delay'), delayV: $('tp-delay-v'),
    mirrorH: $('tp-mirror-h'), mirrorV: $('tp-mirror-v'),
    dark: $('tp-dark'), guide: $('tp-guide'),
    start: $('tp-start'), sample: $('tp-sample'), clear: $('tp-clear'),
    stage: $('tp-stage'), inner: $('tp-stage-inner'), scroll: $('tp-scroll'),
    guideLine: $('tp-guide-line'), countdown: $('tp-countdown'),
    toggle: $('tp-toggle'), faster: $('tp-faster'), slower: $('tp-slower'),
    bigger: $('tp-bigger'), smaller: $('tp-smaller'),
    full: $('tp-full'), exit: $('tp-exit'), progress: $('tp-progress')
  };

  var SAMPLE = [
    '大家好，欢迎来到今天的分享。',
    '',
    '今天我想用十分钟，讲三件很具体的事：为什么做、怎么做、做完之后怎么看效果。',
    '',
    '先说第一件。我们过去半年一直在解决同一个问题——用户在第一步就流失了。',
    '不是产品不好，而是他根本没看懂我们从哪一步开始。',
    '',
    '所以我们把入口重做了一遍：只留一个按钮，只讲一句话。',
    '上线两周之后，完成率从百分之三十一，涨到了百分之五十八。',
    '',
    '第二件事，讲我们踩过的坑。',
    '我们一开始加了很多功能，以为用户会喜欢，结果反而更犹豫了。',
    '',
    '第三件事，是接下来要做的。',
    '我们会把这条路径再压缩一半，让第一次使用的人，三十秒内就能拿到结果。',
    '',
    '讲完了，谢谢大家。'
  ].join('\n');

  var state = {
    speed: 240, size: 48, width: 80, delay: 3,
    mirrorH: false, mirrorV: false, dark: true, guide: true
  };

  var playing = false;
  var rafId = 0;
  var offset = 0;
  var maxOffset = 0;
  var lastTime = 0;
  var countdownTimer = 0;

  /* ---------- 本地保存 ---------- */

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (typeof saved.text === 'string') els.text.value = saved.text;
      ['speed', 'size', 'width', 'delay'].forEach(function (k) {
        if (typeof saved[k] === 'number') state[k] = saved[k];
      });
      ['mirrorH', 'mirrorV', 'dark', 'guide'].forEach(function (k) {
        if (typeof saved[k] === 'boolean') state[k] = saved[k];
      });
    } catch (e) { /* 忽略损坏的数据 */ }
  }

  var saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(KEY, JSON.stringify({
          text: els.text.value,
          speed: state.speed, size: state.size, width: state.width, delay: state.delay,
          mirrorH: state.mirrorH, mirrorV: state.mirrorV, dark: state.dark, guide: state.guide
        }));
      } catch (e) { /* 存储被禁用时静默跳过 */ }
    }, 300);
  }

  /* ---------- 界面同步 ---------- */

  function syncUI() {
    els.speed.value = String(state.speed);
    els.size.value = String(state.size);
    els.width.value = String(state.width);
    els.delay.value = String(state.delay);
    els.mirrorH.checked = state.mirrorH;
    els.mirrorV.checked = state.mirrorV;
    els.dark.checked = state.dark;
    els.guide.checked = state.guide;

    els.speedV.textContent = state.speed + ' 字/分';
    els.sizeV.textContent = state.size + 'px';
    els.widthV.textContent = state.width + '%';
    els.delayV.textContent = state.delay ? state.delay + ' 秒' : '不倒数';
    els.count.textContent = countChars() + ' 字';
  }

  function countChars() {
    return els.text.value.replace(/\s/g, '').length;
  }

  /* ---------- 舞台 ---------- */

  function buildStage() {
    var lines = els.text.value.replace(/\r\n?/g, '\n').split(/\n/);
    var frag = document.createDocumentFragment();
    var buf = [];
    var flush = function () {
      if (!buf.length) return;
      var p = document.createElement('p');
      p.textContent = buf.join('\n');
      frag.appendChild(p);
      buf = [];
    };
    lines.forEach(function (line) {
      if (!line.trim()) { flush(); return; }
      buf.push(line);
    });
    flush();
    els.scroll.replaceChildren(frag);
    if (!els.scroll.childNodes.length) {
      var p = document.createElement('p');
      p.textContent = '先回到编辑区写点要提的内容。';
      els.scroll.appendChild(p);
    }
  }

  function applyLook() {
    els.scroll.style.fontSize = state.size + 'px';
    els.scroll.style.maxWidth = state.width + '%';
    els.stage.style.background = state.dark ? '#0b0d10' : '#ffffff';
    els.scroll.style.color = state.dark ? '#f7f8fa' : '#101317';
    els.inner.style.transform =
      'scale(' + (state.mirrorH ? -1 : 1) + ',' + (state.mirrorV ? -1 : 1) + ')';
    els.guideLine.style.display = state.guide ? '' : 'none';
  }

  /* 字数/分 → 像素/秒：按当前字号估算一行能放几个字，再折算行高。 */
  function pxPerSecond() {
    var vw = els.stage.clientWidth || window.innerWidth;
    var contentWidth = Math.max(120, vw * state.width / 100);
    var charsPerLine = Math.max(4, contentWidth / state.size);
    var linesPerSecond = (state.speed / 60) / charsPerLine;
    var lineHeight = state.size * 1.5;
    return Math.max(4, linesPerSecond * lineHeight);
  }

  function resetScroll() {
    offset = 0;
    maxOffset = Math.max(0, els.scroll.scrollHeight - els.stage.clientHeight * 0.42);
    els.scroll.style.transform = 'translate3d(0,0,0)';
    els.progress.textContent = '0%';
  }

  function step(now) {
    if (!playing) return;
    var dt = lastTime ? (now - lastTime) / 1000 : 0;
    lastTime = now;
    if (dt > 0.25) dt = 0.25;          // 切后台回来别一下跳很远
    offset += pxPerSecond() * dt;
    if (offset >= maxOffset) {
      offset = maxOffset;
      els.scroll.style.transform = 'translate3d(0,' + (-offset) + 'px,0)';
      els.progress.textContent = '100%';
      pause();
      return;
    }
    els.scroll.style.transform = 'translate3d(0,' + (-offset) + 'px,0)';
    els.progress.textContent = Math.round(offset / maxOffset * 100) + '%';
    rafId = requestAnimationFrame(step);
  }

  function play() {
    if (!els.text.value.trim()) {
      els.text.focus();
      return;
    }
    playing = true;
    els.toggle.textContent = '暂停';
    lastTime = 0;
    rafId = requestAnimationFrame(step);
  }

  function pause() {
    playing = false;
    cancelAnimationFrame(rafId);
    els.toggle.textContent = '继续';
  }

  function openStage(withCountdown) {
    buildStage();
    applyLook();
    els.stage.hidden = false;
    document.body.style.overflow = 'hidden';
    resetScroll();
    if (withCountdown && state.delay > 0) countdown(state.delay, play);
    else play();
  }

  function closeStage() {
    pause();
    clearInterval(countdownTimer);
    els.countdown.hidden = true;
    els.countdown.textContent = '';
    els.stage.hidden = true;
    document.body.style.overflow = '';
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    els.text.focus({ preventScroll: true });
  }

  function countdown(from, done) {
    var left = from;
    els.countdown.hidden = false;
    els.countdown.textContent = String(left);
    clearInterval(countdownTimer);
    countdownTimer = setInterval(function () {
      left -= 1;
      if (left <= 0) {
        clearInterval(countdownTimer);
        els.countdown.hidden = true;
        els.countdown.textContent = '';
        done();
      } else {
        els.countdown.textContent = String(left);
      }
    }, 1000);
  }

  function adjustSize(delta) {
    state.size = Math.min(120, Math.max(24, state.size + delta));
    syncUI(); save();
    if (!els.stage.hidden) { applyLook(); resetScroll(); }
  }

  function adjustSpeed(delta) {
    state.speed = Math.min(600, Math.max(60, state.speed + delta));
    syncUI(); save();
  }

  /* ---------- 事件 ---------- */

  els.text.addEventListener('input', function () { syncUI(); save(); });

  els.speed.addEventListener('input', function () { state.speed = Number(els.speed.value); syncUI(); save(); });
  els.size.addEventListener('input', function () { state.size = Number(els.size.value); syncUI(); save(); });
  els.width.addEventListener('input', function () { state.width = Number(els.width.value); syncUI(); save(); });
  els.delay.addEventListener('input', function () { state.delay = Number(els.delay.value); syncUI(); save(); });

  els.mirrorH.addEventListener('change', function () { state.mirrorH = els.mirrorH.checked; syncUI(); save(); });
  els.mirrorV.addEventListener('change', function () { state.mirrorV = els.mirrorV.checked; syncUI(); save(); });
  els.dark.addEventListener('change', function () { state.dark = els.dark.checked; syncUI(); save(); });
  els.guide.addEventListener('change', function () { state.guide = els.guide.checked; syncUI(); save(); });

  els.start.addEventListener('click', function () { openStage(true); });
  els.sample.addEventListener('click', function () {
    els.text.value = SAMPLE;
    syncUI(); save();
  });
  els.clear.addEventListener('click', function () {
    if (!els.text.value.trim() || confirm('清空当前提词内容？')) {
      els.text.value = '';
      syncUI(); save();
      els.text.focus();
    }
  });

  els.toggle.addEventListener('click', function () {
    if (playing) pause();
    else play();
  });
  els.faster.addEventListener('click', function () { adjustSpeed(20); });
  els.slower.addEventListener('click', function () { adjustSpeed(-20); });
  els.bigger.addEventListener('click', function () { adjustSize(4); });
  els.smaller.addEventListener('click', function () { adjustSize(-4); });
  els.exit.addEventListener('click', closeStage);

  els.full.addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    else document.documentElement.requestFullscreen().catch(function () {});
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toUpperCase();
    var typing = tag === 'INPUT' || tag === 'TEXTAREA';
    var stageOpen = !els.stage.hidden;

    if (!stageOpen) {
      if (e.code === 'Space' && !typing && els.text.value.trim()) {
        e.preventDefault();
        openStage(true);
      }
      return;
    }

    if (e.key === 'Escape') { e.preventDefault(); closeStage(); return; }
    if (e.code === 'Space') { e.preventDefault(); if (playing) pause(); else play(); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); adjustSize(4); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); adjustSize(-4); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); adjustSpeed(20); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); adjustSpeed(-20); return; }
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      els.full.click();
    }
  });

  window.addEventListener('resize', function () {
    if (!els.stage.hidden) { applyLook(); resetScroll(); }
  });

  load();
  syncUI();
})();
