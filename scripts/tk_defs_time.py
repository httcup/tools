#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ToolKnit 批次定义（七）：时间与专注（番茄钟、秒表、倒计时、世界时钟、闪卡）。"""

TOOLS = []


def t(slug, name, desc, long, keys, cat, icon, body, js, note=""):
    TOOLS.append(dict(slug=slug, name=name, desc=desc, long=long, keys=keys,
                      cat=cat, icon=icon, note=note, body=body, js=js))


t("pomodoro-timer", "番茄钟",
  "25 分钟专注 + 5 分钟休息。",
  "经典番茄钟：专注 25 分钟、休息 5 分钟自动轮换，长休息提醒，可自定义时长，完成轮数计数。",
  "番茄钟 pomodoro 专注 时间管理",
  "time-focus", "timer",
  """
<section class="tool-card">
  <div style="text-align:center;padding:1rem 0">
    <b id="clock" style="font-size:4rem;font-variant-numeric:tabular-nums;letter-spacing:-0.02em">25:00</b>
    <div><span id="phase" class="tag c-low">专注</span></div>
  </div>
  <div class="row" style="justify-content:center">
    <label class="field"><span>专注（分钟）</span><input type="number" id="work" value="25" min="1" max="90"></label>
    <label class="field"><span>休息（分钟）</span><input type="number" id="rest" value="5" min="1" max="30"></label>
    <button class="btn btn-primary" type="button" id="go">▶ 开始</button>
    <button class="btn" type="button" id="reset">重置</button>
    <span class="stats" id="stats">已完成 0 轮</span>
  </div>
</section>
""",
  """(function () {
  'use strict';
  var phase = 'work', left = 0, timer = null, running = false, rounds = 0;
  var clock = document.getElementById('clock'), tag = document.getElementById('phase');
  function show() {
    var m = Math.floor(left / 60), s = left % 60;
    clock.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    document.title = running ? clock.textContent + ' ' + (phase === 'work' ? '专注中' : '休息中') : document.title;
  }
  function setPhase(p) {
    phase = p;
    var mins = parseInt(document.getElementById(p === 'work' ? 'work' : 'rest').value) || (p === 'work' ? 25 : 5);
    left = mins * 60;
    tag.textContent = p === 'work' ? '专注' : '休息';
    tag.className = 'tag ' + (p === 'work' ? 'c-low' : 'c-ok');
    show();
  }
  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  }
  document.getElementById('go').addEventListener('click', function () {
    running = !running;
    this.textContent = running ? '⏸ 暂停' : '▶ 开始';
    if (running && left === 0) setPhase('work');
    if (running) {
      timer = setInterval(function () {
        left--;
        if (left <= 0) {
          beep();
          if (phase === 'work') { rounds++; document.getElementById('stats').textContent = '已完成 ' + rounds + ' 轮'; setPhase('rest'); }
          else setPhase('work');
        }
        show();
      }, 1000);
    } else clearInterval(timer);
  });
  document.getElementById('reset').addEventListener('click', function () {
    clearInterval(timer); running = false; rounds = 0;
    document.getElementById('go').textContent = '▶ 开始';
    document.getElementById('stats').textContent = '已完成 0 轮';
    setPhase('work');
  });
  ['work', 'rest'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () { if (!running) setPhase(phase); });
  });
  setPhase('work');
})();""",
  "专注阶段不要切换标签页；4 轮后建议休息 15–30 分钟。")

t("stopwatch", "秒表",
  "带计次功能的精确秒表。",
  "精确到百分之一秒的秒表，支持计次（Lap）并显示每次分段时间，可复制成绩。",
  "秒表 stopwatch 计次 计时",
  "time-focus", "stopwatch",
  """
<section class="tool-card">
  <div style="text-align:center;padding:1rem 0">
    <b id="clock" style="font-size:3.6rem;font-variant-numeric:tabular-nums">00:00.00</b>
  </div>
  <div class="row" style="justify-content:center">
    <button class="btn btn-primary" type="button" id="go">▶ 开始</button>
    <button class="btn" type="button" id="lap" disabled>计次</button>
    <button class="btn" type="button" id="resetBtn" disabled>重置</button>
    <button class="btn" type="button" id="copy" disabled>复制成绩</button>
  </div>
  <ul class="result-list" id="laps" style="margin-top:0.8rem;max-height:14rem;overflow:auto"></ul>
</section>
""",
  """(function () {
  'use strict';
  var t0 = 0, acc = 0, timer = null, laps = [];
  var clock = document.getElementById('clock');
  function now() { return acc + (timer ? performance.now() - t0 : 0); }
  function fmt(ms) {
    var m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, c = Math.floor(ms / 10) % 100;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '.' + (c < 10 ? '0' : '') + c;
  }
  function render() { clock.textContent = fmt(now()); }
  document.getElementById('go').addEventListener('click', function () {
    if (timer) {
      acc += performance.now() - t0;
      clearInterval(timer); timer = null;
      this.textContent = '▶ 继续';
      document.getElementById('lap').disabled = true;
    } else {
      t0 = performance.now();
      timer = setInterval(render, 33);
      this.textContent = '⏸ 暂停';
      document.getElementById('lap').disabled = false;
    }
    document.getElementById('resetBtn').disabled = timer === null && now() === 0;
  });
  document.getElementById('lap').addEventListener('click', function () {
    laps.push(now());
    var el = document.getElementById('laps');
    el.innerHTML = laps.map(function (l, i) {
      var prev = i > 0 ? laps[i - 1] : 0;
      return '<li><b>#' + (i + 1) + '</b> <span style="float:right;font-variant-numeric:tabular-nums">+' + fmt(l - prev) + ' · 累计 ' + fmt(l) + '</span></li>';
    }).reverse().join('');
    document.getElementById('copy').disabled = false;
  });
  document.getElementById('resetBtn').addEventListener('click', function () {
    clearInterval(timer); timer = null; acc = 0; laps = [];
    document.getElementById('go').textContent = '▶ 开始';
    document.getElementById('lap').disabled = true;
    this.disabled = true; document.getElementById('copy').disabled = true;
    document.getElementById('laps').innerHTML = '';
    render();
  });
  document.getElementById('copy').addEventListener('click', function () {
    navigator.clipboard.writeText(laps.map(function (l, i) { return '#' + (i + 1) + '  ' + fmt(l); }).join('\\n'));
  });
  render();
})();""",
  "计次列表显示单段与累计时间。")

t("countdown-timer", "倒计时",
  "大字倒计时，结束提醒。",
  "设置时分秒的倒计时，大字号显示，支持暂停与继续，结束用声音提醒，适合厨房、课堂与演讲计时。",
  "倒计时 计时器 厨房 演讲",
  "time-focus", "timer",
  """
<section class="tool-card">
  <div style="text-align:center;padding:1rem 0">
    <b id="clock" style="font-size:4rem;font-variant-numeric:tabular-nums">00:00</b>
  </div>
  <div class="row" style="justify-content:center">
    <label class="field"><span>分</span><input type="number" id="m" value="5" min="0" max="180"></label>
    <label class="field"><span>秒</span><input type="number" id="s" value="0" min="0" max="59"></label>
    <button class="btn btn-primary" type="button" id="go">▶ 开始</button>
    <button class="btn" type="button" id="resetBtn">重置</button>
  </div>
</section>
""",
  """(function () {
  'use strict';
  var left = 0, endAt = 0, timer = null, running = false;
  var clock = document.getElementById('clock');
  function show() {
    var h = Math.floor(left / 3600), m = Math.floor(left / 60) % 60, s = left % 60;
    clock.textContent = (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.3, 0.6].forEach(function (t) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 990;
        g.gain.setValueAtTime(0.3, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.26);
      });
    } catch (e) {}
  }
  function set() { left = (parseInt(document.getElementById('m').value) || 0) * 60 + (parseInt(document.getElementById('s').value) || 0); show(); }
  document.getElementById('go').addEventListener('click', function () {
    if (running) { running = false; clearInterval(timer); left = Math.round((endAt - Date.now()) / 1000); this.textContent = '▶ 继续'; return; }
    if (left <= 0) set();
    if (left <= 0) return;
    running = true;
    endAt = Date.now() + left * 1000;
    this.textContent = '⏸ 暂停';
    timer = setInterval(function () {
      left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      show();
      if (left <= 0) {
        running = false;
        clearInterval(timer);
        document.getElementById('go').textContent = '▶ 开始';
        beep();
      }
    }, 250);
  });
  document.getElementById('resetBtn').addEventListener('click', function () {
    running = false; clearInterval(timer);
    document.getElementById('go').textContent = '▶ 开始';
    set();
  });
  ['m', 's'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () { if (!running) set(); });
  });
  set();
})();""",
  "结束响三声；页面切走后仍按真实时间计算。")

t("world-clock", "世界时钟",
  "多城市当前时间实时对照。",
  "同时显示北京时间、纽约、伦敦、东京、巴黎、悉尼等城市当前时间，每秒刷新，按日期与昼夜标注。",
  "世界时钟 时区 城市 时间 world clock",
  "time-focus", "globe2",
  """
<section class="tool-card">
  <div class="row">
    <label class="field"><span>添加城市（IANA 时区）</span><input type="text" id="tz" placeholder="如 Asia/Shanghai" style="min-width:14rem"></label>
    <button class="btn" type="button" id="add">添加</button>
    <button class="btn" type="button" data-copy-target="#allOut">复制全部</button>
  </div>
  <textarea id="allOut" hidden></textarea>
</section>
<section class="tool-card">
  <div id="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(11rem,1fr));gap:0.7rem"></div>
</section>
""",
  """(function () {
  'use strict';
  var CITIES = [
    ['北京时间', 'Asia/Shanghai'], ['东京', 'Asia/Tokyo'], ['新加坡', 'Asia/Singapore'],
    ['伦敦', 'Europe/London'], ['巴黎', 'Europe/Paris'], ['纽约', 'America/New_York'],
    ['洛杉矶', 'America/Los_Angeles'], ['悉尼', 'Australia/Sydney']
  ];
  var grid = document.getElementById('grid');
  try { localStorage.getItem('tk-cities') && (CITIES = JSON.parse(localStorage.getItem('tk-cities'))); } catch (e) {}
  function fmt(tz) {
    try {
      var d = new Date();
      var time = d.toLocaleTimeString('zh-CN', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      var date = d.toLocaleDateString('zh-CN', { timeZone: tz, month: 'long', day: 'numeric', weekday: 'short' });
      var h = +d.toLocaleString('en', { timeZone: tz, hour: '2-digit', hour12: false });
      return { time: time, date: date, night: h < 6 || h >= 19 };
    } catch (e) { return null; }
  }
  function render() {
    grid.innerHTML = CITIES.map(function (c) {
      var f = fmt(c[1]);
      return '<div style="border:1px solid var(--border);border-radius:10px;padding:0.7rem 0.9rem">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:0.85rem">' + TK.esc(c[0]) + '</b><span>' + (f.night ? '🌙' : '☀️') + '</span></div>' +
        '<div style="font-size:1.5rem;font-weight:700;font-variant-numeric:tabular-nums">' + (f ? f.time : '—') + '</div>' +
        '<div style="font-size:0.72rem;color:var(--text-dim)">' + (f ? f.date : '无效时区') + '</div></div>';
    }).join('');
    document.getElementById('allOut').value = CITIES.map(function (c) {
      var f = fmt(c[1]);
      return c[0] + '  ' + (f ? f.time + ' ' + f.date : '无效时区');
    }).join('\\n');
  }
  document.getElementById('add').addEventListener('click', function () {
    var tz = document.getElementById('tz').value.trim();
    if (!tz || CITIES.some(function (c) { return c[1] === tz; })) return;
    CITIES.push([tz.split('/').pop().replace(/_/g, ' '), tz]);
    try { localStorage.setItem('tk-cities', JSON.stringify(CITIES)); } catch (e) {}
    document.getElementById('tz').value = '';
    render();
  });
  setInterval(render, 1000);
  render();
})();""",
  "时区名用 IANA 格式，如 America/Vancouver、Europe/Berlin；城市列表保存在本地。")

t("flashcard-maker", "闪卡制作与复习",
  "自制学习卡片并翻面复习。",
  "创建正反面闪卡，自动保存在浏览器本地；复习时随机抽卡、点击翻面并标记会与不会，支持导入导出。",
  "闪卡 记忆 背单词 学习 flashcard",
  "time-focus", "cards",
  """
<section class="tool-card">
  <div class="card-head"><h2>添加卡片</h2><span class="stats" id="stats"></span></div>
  <div class="row">
    <label class="field"><span>正面（问题）</span><input type="text" id="front" placeholder="如：ubiquitous" style="min-width:12rem"></label>
    <label class="field"><span>背面（答案）</span><input type="text" id="back" placeholder="如：无处不在的" style="min-width:12rem"></label>
    <button class="btn btn-primary" type="button" id="addBtn">添加</button>
  </div>
  <div class="row">
    <button class="btn" type="button" id="studyBtn">开始复习</button>
    <button class="btn" type="button" id="exportBtn">导出</button>
    <label class="btn">导入<input type="file" id="importFile" accept=".json,.txt" hidden></label>
    <button class="btn btn-ghost" type="button" id="clearBtn">清空全部</button>
  </div>
</section>
<section class="tool-card" id="studyCard" hidden>
  <div style="text-align:center;padding:1rem 0">
    <div id="card" style="min-height:8rem;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);cursor:pointer;padding:1rem">
      <b id="side" style="font-size:1.4rem"></b>
      <span class="stats" style="margin-top:0.5rem">点击卡片翻面</span>
    </div>
    <div class="row" style="justify-content:center;margin-top:0.8rem">
      <button class="btn" type="button" id="againBtn">不会 ↻</button>
      <button class="btn btn-primary" type="button" id="okBtn">会了 ✓</button>
    </div>
  </div>
</section>
""",
  """(function () {
  'use strict';
  var cards = [];
  try { cards = JSON.parse(localStorage.getItem('tk-flashcards') || '[]'); } catch (e) {}
  var deck = [], idx = 0, flipped = false;
  function save() { try { localStorage.setItem('tk-flashcards', JSON.stringify(cards)); } catch (e) {} updateStats(); }
  function updateStats() { document.getElementById('stats').textContent = cards.length + ' 张卡片'; }
  document.getElementById('addBtn').addEventListener('click', function () {
    var f = document.getElementById('front').value.trim(), b = document.getElementById('back').value.trim();
    if (!f || !b) return;
    cards.push({ f: f, b: b });
    save();
    document.getElementById('front').value = '';
    document.getElementById('back').value = '';
    document.getElementById('front').focus();
  });
  document.getElementById('studyBtn').addEventListener('click', function () {
    if (!cards.length) return;
    deck = cards.map(function (c, i) { return i; }).sort(function () { return Math.random() - 0.5; });
    idx = 0;
    document.getElementById('studyCard').hidden = false;
    show();
  });
  function show() {
    if (idx >= deck.length) {
      document.getElementById('side').textContent = '本轮完成 🎉';
      document.querySelector('#card .stats').textContent = '点击「开始复习」再来一轮';
      flipped = false;
      return;
    }
    flipped = false;
    document.getElementById('side').textContent = cards[deck[idx]].f;
    document.querySelector('#card .stats').textContent = '点击卡片翻面 · 第 ' + (idx + 1) + ' / ' + deck.length + ' 张';
  }
  document.getElementById('card').addEventListener('click', function () {
    if (idx >= deck.length) return;
    flipped = !flipped;
    document.getElementById('side').textContent = cards[deck[idx]][flipped ? 'b' : 'f'];
    document.querySelector('#card .stats').textContent = flipped ? '记住答案了吗？' : '点击卡片翻面';
  });
  function next(again) {
    if (again) deck.push(deck[idx]);
    idx++;
    show();
  }
  document.getElementById('okBtn').addEventListener('click', function () { next(false); });
  document.getElementById('againBtn').addEventListener('click', function () { next(true); });
  document.getElementById('exportBtn').addEventListener('click', function () {
    TK.download('flashcards.json', JSON.stringify(cards, null, 2));
  });
  document.getElementById('importFile').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var data = JSON.parse(r.result);
        if (Array.isArray(data)) { cards = cards.concat(data.filter(function (c) { return c.f && c.b; })); save(); }
      } catch (err) {}
    };
    r.readAsText(f);
  });
  document.getElementById('clearBtn').addEventListener('click', function () {
    if (!cards.length || !confirm('确定清空全部 ' + cards.length + ' 张卡片？')) return;
    cards = []; save();
    document.getElementById('studyCard').hidden = true;
  });
  updateStats();
})();""",
  "卡片自动保存在当前浏览器（localStorage），换设备请先导出再导入。")
