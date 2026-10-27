#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ToolKnit 批次定义（六）：测试与解压（反应、打靶、手速、键盘、打字、呼吸、设备自检）。"""

TOOLS = []


def t(slug, name, desc, long, keys, cat, icon, body, js, note=""):
    TOOLS.append(dict(slug=slug, name=name, desc=desc, long=long, keys=keys,
                      cat=cat, icon=icon, note=note, body=body, js=js))


t("reaction-time-test", "反应速度测试",
  "测你的视觉反应时间。",
  "点击开始后屏幕变绿的瞬间点击，测量视觉反应时间，记录最近 5 次与平均成绩，看看你排在什么水平。",
  "反应速度 测试 反应时间 reaction",
  "test-fun", "gamepad",
  """
<section class="tool-card">
  <div id="stage" style="height:14rem;border-radius:10px;border:1px solid var(--border);background:#eef1f4;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;user-select:none">
    <b id="msg" style="font-size:1.2rem">点击此处开始</b>
    <span id="hint" style="color:var(--text-dim);margin-top:0.4rem">变绿的瞬间点击</span>
  </div>
  <dl class="kv" style="margin-top:0.9rem"><dt>最近成绩</dt><dd id="last">—</dd><dt>最近 5 次平均</dt><dd id="avg">—</dd><dt>最佳</dt><dd id="best">—</dd></dl>
</section>
""",
  """(function () {
  'use strict';
  var stage = document.getElementById('stage'), msg = document.getElementById('msg');
  var state = 'idle', t0 = 0, timer = null, results = [];
  function fmt(ms) { return ms + ' ms'; }
  stage.addEventListener('pointerdown', function () {
    if (state === 'idle') {
      state = 'wait';
      stage.style.background = '#c2554d';
      msg.textContent = '等待变绿…';
      msg.style.color = '#fff'; document.getElementById('hint').style.color = 'rgba(255,255,255,0.8)';
      timer = setTimeout(function () {
        state = 'go';
        t0 = performance.now();
        stage.style.background = '#3d9a6c';
        msg.textContent = '点击！';
      }, 1200 + Math.random() * 2800);
    } else if (state === 'wait') {
      clearTimeout(timer);
      state = 'idle';
      stage.style.background = '#eef1f4';
      msg.textContent = '太早了！等变绿再点';
      msg.style.color = ''; document.getElementById('hint').style.color = '';
    } else if (state === 'go') {
      var ms = Math.round(performance.now() - t0);
      results.push(ms);
      if (results.length > 5) results.shift();
      state = 'idle';
      stage.style.background = '#eef1f4';
      msg.textContent = fmt(ms) + ' — 再来一次？';
      msg.style.color = ''; document.getElementById('hint').style.color = '';
      document.getElementById('last').textContent = fmt(ms);
      document.getElementById('avg').textContent = fmt(Math.round(results.reduce(function (a, b) { return a + b; }) / results.length));
      document.getElementById('best').textContent = fmt(Math.min.apply(null, results));
    }
  });
})();""",
  "人类平均约 250 ms；低于 200 ms 已是电竞级反应。")

t("aim-trainer", "打靶训练",
  "30 秒内点中尽可能多的目标。",
  "限时 30 秒的打靶训练：目标随机出现、越点越小，统计命中数、命中率与平均反应，锻炼鼠标定位。",
  "打靶 aim 训练 鼠标 fps",
  "test-fun", "gamepad",
  """
<section class="tool-card">
  <div class="row">
    <button class="btn btn-primary" type="button" id="start">开始 30 秒挑战</button>
    <span class="stats" id="stats"></span>
  </div>
  <div id="field" style="position:relative;height:22rem;border:1px solid var(--border);border-radius:10px;background:#f2f4f7;overflow:hidden;cursor:crosshair">
    <div id="target" style="position:absolute;width:56px;height:56px;border-radius:99px;background:#c2554d;box-shadow:0 0 0 6px rgba(194,85,77,0.2);display:none;cursor:pointer"></div>
  </div>
</section>
""",
  """(function () {
  'use strict';
  var field = document.getElementById('field'), target = document.getElementById('target');
  var hits = 0, misses = 0, size = 56, playing = false, endAt = 0;
  function spawn() {
    if (!playing) return;
    size = Math.max(22, 56 - hits * 1.2);
    target.style.width = target.style.height = size + 'px';
    target.style.left = Math.random() * (field.clientWidth - size - 8) + 'px';
    target.style.top = Math.random() * (field.clientHeight - size - 8) + 'px';
    target.style.display = 'block';
  }
  function tick() {
    if (!playing) return;
    var left = Math.max(0, endAt - Date.now());
    document.getElementById('stats').textContent = '剩余 ' + (left / 1000).toFixed(1) + ' s · 命中 ' + hits + ' · 未中 ' + misses;
    if (left <= 0) {
      playing = false;
      target.style.display = 'none';
      var total = hits + misses;
      document.getElementById('stats').textContent = '结束！命中 ' + hits + ' / ' + total + '（' + (total ? Math.round(hits / total * 100) : 0) + '% 命中率）';
      return;
    }
    requestAnimationFrame(tick);
  }
  document.getElementById('start').addEventListener('click', function () {
    hits = misses = 0; size = 56; playing = true; endAt = Date.now() + 30000;
    this.textContent = '进行中…';
    spawn(); tick();
  });
  target.addEventListener('pointerdown', function (e) {
    if (!playing) return;
    e.stopPropagation();
    hits++;
    spawn();
  });
  field.addEventListener('pointerdown', function () { if (playing) misses++; });
})();""",
  "目标会随命中数越来越小；职业玩家 30 秒能命中 55+。")

t("cps-test", "手速测试",
  "10 秒内你能点多少下。",
  "经典的点击速度测试：10 秒内疯狂点击，计算 CPS（每秒点击次数），支持 1/5/10 秒三档时长。",
  "手速 cps 点击 测试",
  "test-fun", "gamepad",
  """
<section class="tool-card">
  <div class="row">
    <label class="field"><span>时长</span><select id="dur"><option value="1">1 秒</option><option value="5">5 秒</option><option value="10" selected>10 秒</option></select></label>
  </div>
  <div id="area" style="height:14rem;border-radius:10px;border:1px solid var(--border);background:#eef1f4;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;user-select:none">
    <b id="num" style="font-size:3.2rem;font-variant-numeric:tabular-nums">0</b>
    <span id="hint" style="color:var(--text-dim)">点击此区域开始</span>
  </div>
  <dl class="kv" style="margin-top:0.9rem"><dt>CPS（每秒点击）</dt><dd id="cps">—</dd><dt>成绩参考</dt><dd id="lv">—</dd></dl>
</section>
""",
  """(function () {
  'use strict';
  var area = document.getElementById('area'), num = document.getElementById('num');
  var clicks = 0, running = false, t0 = 0, timer = null;
  area.addEventListener('pointerdown', function () {
    if (!running) {
      running = true; clicks = 0; t0 = Date.now();
      var dur = parseInt(document.getElementById('dur').value) * 1000;
      document.getElementById('hint').textContent = '疯狂点击！';
      timer = setTimeout(function () {
        running = false;
        var cps = clicks / (dur / 1000);
        document.getElementById('cps').textContent = cps.toFixed(1);
        document.getElementById('lv').textContent =
          cps < 4 ? '普通人' : cps < 6 ? '手速不错' : cps < 8 ? '高手' : '蝴蝶手';
        document.getElementById('hint').textContent = '再点一次重新开始';
      }, dur);
    }
    clicks++;
    num.textContent = clicks;
  });
})();""",
  "CPS = 点击次数 ÷ 秒数；用两根手指交替点更快。")

t("keyboard-tester", "键盘测试",
  "逐键检查键盘有没有坏键。",
  "按下键盘任意键，对应键位亮起并计数，方便检查每个按键是否正常、有没有卡键或连击。",
  "键盘测试 按键 检测 keyboard",
  "test-fun", "keyboard",
  """
<section class="tool-card">
  <div id="kb" style="display:flex;flex-direction:column;gap:0.3rem;align-items:center"></div>
  <div class="row"><span class="stats" id="stats">按下任意键开始（在页面上直接按）</span><button class="btn" type="button" id="reset">重置</button></div>
</section>
""",
  """(function () {
  'use strict';
  var ROWS = ['` 1 2 3 4 5 6 7 8 9 0 - = ⌫', 'Tab Q W E R T Y U I O P [ ] \\\\', 'Caps A S D F G H J K L ; \\' Enter', 'Shift Z X C V B N M , . / Shift', 'Space'];
  var kb = document.getElementById('kb'), counts = {}, els = {};
  ROWS.forEach(function (row) {
    var div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:0.25rem';
    row.split(' ').forEach(function (key) {
      var el = document.createElement('div');
      el.textContent = key;
      var w = { '⌫': 2, 'Tab': 1.6, '\\\\': 1.6, 'Caps': 1.9, 'Enter': 2.1, 'Shift': 2.4, 'Space': 8 }[key] || 1;
      el.style.cssText = 'min-width:2.2rem;flex:' + w + ';padding:0.55rem 0.3rem;text-align:center;border:1px solid var(--border);border-radius:6px;background:var(--surface);font-size:0.75rem;color:var(--text-dim)';
      els[key] = el;
      div.appendChild(el);
    });
    kb.appendChild(div);
  });
  var focused = null;
  window.addEventListener('keydown', function (e) {
    var k = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    var el = els[k] || els[e.key];
    if (!el) return;
    e.preventDefault();
    counts[k] = (counts[k] || 0) + 1;
    el.style.background = 'var(--accent)';
    el.style.color = 'var(--accent-text)';
    el.textContent = k + (counts[k] > 1 ? ' ×' + counts[k] : '');
    document.getElementById('stats').textContent = '已按 ' + Object.keys(counts).length + ' 个不同按键 / 共 ' + Object.values(counts).reduce(function (a, b) { return a + b; }, 0) + ' 次';
  });
  window.addEventListener('keyup', function (e) {
    var k = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    var el = els[k] || els[e.key];
    if (el) { el.style.background = 'color-mix(in srgb, var(--ok) 22%, var(--surface))'; el.style.color = ''; }
  });
  document.getElementById('reset').addEventListener('click', function () {
    counts = {};
    Object.keys(els).forEach(function (k) {
      els[k].style.background = '';
      els[k].style.color = '';
      els[k].textContent = k;
    });
    document.getElementById('stats').textContent = '已重置';
  });
})();""",
  "按过的键变绿色并显示次数；从未亮起的键可能有问题。")

t("typing-test", "打字速度测试",
  "测中文或英文打字速度。",
  "60 秒限时打字测试，实时显示速度、正确率，支持中文句子与英文单词两种模式。",
  "打字 速度 测试 typing wpm",
  "test-fun", "keyboard",
  """
<section class="tool-card">
  <div class="row">
    <label class="field"><span>模式</span><select id="mode"><option value="zh">中文句子</option><option value="en">英文单词</option></select></label>
    <button class="btn btn-primary" type="button" id="start">开始测试</button>
    <span class="stats" id="stats"></span>
  </div>
  <div id="text" style="font-size:1.15rem;line-height:2;padding:1rem;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);letter-spacing:0.02em"></div>
  <input type="text" id="in" class="sel" style="width:100%;min-height:44px;margin-top:0.7rem" placeholder="点「开始测试」后在这里输入…" autocomplete="off">
</section>
""",
  """(function () {
  'use strict';
  var ZH = ['日出江花红胜火，春来江水绿如蓝。', '千里之行，始于足下。', '宝剑锋从磨砺出，梅花香自苦寒来。', '学而不思则罔，思而不学则殆。', '海内存知己，天涯若比邻。', '会当凌绝顶，一览众山小。', '纸上得来终觉浅，绝知此事要躬行。', '沉舟侧畔千帆过，病树前头万木春。'];
  var EN = ['the quick brown fox jumps over the lazy dog', 'practice makes perfect', 'actions speak louder than words', 'every cloud has a silver lining', 'a journey of a thousand miles begins with a single step'];
  var target = '', startAt = 0, timer = null, running = false;
  function pick() {
    var mode = document.getElementById('mode').value;
    var arr = mode === 'zh' ? ZH : EN;
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function render() {
    var v = document.getElementById('in').value;
    var el = document.getElementById('text');
    el.innerHTML = target.split('').map(function (c, i) {
      var state = i < v.length ? (v[i] === c ? 'ok' : 'bad') : 'todo';
      var bg = state === 'ok' ? 'color-mix(in srgb, var(--ok) 25%, transparent)' : state === 'bad' ? 'color-mix(in srgb, #c2554d 30%, transparent)' : 'transparent';
      return '<span style="background:' + bg + ';border-radius:3px;padding:0 1px">' + TK.esc(c) + '</span>';
    }).join('');
  }
  document.getElementById('start').addEventListener('click', function () {
    target = pick();
    running = true;
    startAt = Date.now();
    document.getElementById('in').value = '';
    document.getElementById('in').focus();
    render();
    clearInterval(timer);
    timer = setInterval(function () {
      var s = (Date.now() - startAt) / 1000;
      var v = document.getElementById('in').value;
      var correct = 0;
      for (var i = 0; i < Math.min(v.length, target.length); i++) if (v[i] === target[i]) correct++;
      var cpm = v.length / s * 60;
      document.getElementById('stats').textContent = s.toFixed(0) + ' s · ' +
        (document.getElementById('mode').value === 'zh' ? Math.round(cpm) + ' 字/分' : Math.round(cpm / 5) + ' WPM') +
        ' · 正确率 ' + (v.length ? Math.round(correct / v.length * 100) : 100) + '%';
    }, 300);
  });
  document.getElementById('in').addEventListener('input', function () {
    render();
    if (running && this.value.length >= target.length) {
      running = false;
      clearInterval(timer);
      document.getElementById('hint') && 0;
      this.blur();
    }
  });
  render();
})();""",
  "中文以「字/分」计，英文按 5 字符 = 1 单词折算 WPM。")

t("breathing-relaxation", "呼吸放松引导",
  "4-7-8 呼吸法动画引导。",
  "跟随圆圈胀缩的节奏做 4-7-8 呼吸（吸气 4 秒、屏息 7 秒、呼气 8 秒），可切换节奏与轮数，快速平静下来。",
  "呼吸 放松 冥想 助眠 478",
  "test-fun", "lungs",
  """
<section class="tool-card">
  <div style="display:flex;flex-direction:column;align-items:center;padding:1rem 0">
    <div id="ball" style="width:7rem;height:7rem;border-radius:99px;background:color-mix(in srgb, var(--accent) 30%, var(--surface));display:flex;align-items:center;justify-content:center;transition:transform 4s ease-in-out">
      <b id="phase" style="font-size:1rem">准备好了吗</b>
    </div>
    <span class="stats" id="stats" style="margin-top:0.8rem"></span>
  </div>
  <div class="row" style="justify-content:center">
    <label class="field"><span>节奏</span><select id="pat"><option value="478">4-7-8 助眠</option><option value="444">4-4-4 平衡</option><option value="46">4-6 延长呼气</option></select></label>
    <label class="field"><span>轮数</span><input type="number" id="rounds" value="4" min="1" max="20"></label>
    <button class="btn btn-primary" type="button" id="go">▶ 开始</button>
  </div>
</section>
""",
  """(function () {
  'use strict';
  var timer = null;
  function run() {
    clearInterval(timer);
    var p = document.getElementById('pat').value;
    var parts = { '478': ['吸气', 4, '屏息', 7, '呼气', 8], '444': ['吸气', 4, '屏息', 4, '呼气', 4], '46': ['吸气', 4, '屏息', 0, '呼气', 6] }[p];
    var rounds = parseInt(document.getElementById('rounds').value) || 4;
    var ball = document.getElementById('ball'), phase = document.getElementById('phase');
    var r = 0, i = 0;
    function step() {
      if (i >= parts.length) {
        i = 0; r++;
        if (r >= rounds) {
          clearInterval(timer);
          phase.textContent = '完成 🎉';
          ball.style.transform = 'scale(1)';
          document.getElementById('stats').textContent = '';
          return;
        }
      }
      var name = parts[i], dur = parts[i + 1];
      if (dur > 0) {
        phase.textContent = name + ' · ' + dur + 's';
        document.getElementById('stats').textContent = '第 ' + (r + 1) + ' / ' + rounds + ' 轮';
        ball.style.transitionDuration = dur + 's';
        ball.style.transform = name === '吸气' ? 'scale(1.45)' : name === '呼气' ? 'scale(1)' : ball.style.transform;
      }
      i += 2;
      if (dur > 0) timer = setTimeout(step, dur * 1000);
      else step();
    }
    step();
  }
  document.getElementById('go').addEventListener('click', function () {
    var btn = this;
    if (timer) {
      clearInterval(timer); timer = null;
      btn.textContent = '▶ 开始';
      document.getElementById('phase').textContent = '已暂停';
      document.getElementById('ball').style.transform = 'scale(1)';
      return;
    }
    btn.textContent = '■ 暂停';
    run();
  });
})();""",
  "呼气比吸气长是激活副交感神经的关键；睡前做 4 轮 4-7-8 效果最好。")

t("mic-camera-test", "麦克风与摄像头自检",
  "检测麦克风与摄像头是否正常。",
  "本地测试麦克风（实时音量表）与摄像头（预览画面），排查会议软件前先确认设备权限与工作状态，画面与声音不上传。",
  "麦克风 摄像头 测试 设备 自检",
  "test-fun", "mic",
  """
<section class="tool-card">
  <h2>麦克风</h2>
  <div class="row">
    <button class="btn btn-primary" type="button" id="micBtn">开启麦克风测试</button>
    <span class="stats" id="micStats"></span>
  </div>
  <div style="height:1rem;border:1px solid var(--border);border-radius:99px;overflow:hidden;margin-top:0.6rem"><div id="meter" style="height:100%;width:0%;background:var(--ok);transition:width 0.08s"></div></div>
  <h2 style="margin-top:1.2rem">摄像头</h2>
  <div class="row">
    <button class="btn btn-primary" type="button" id="camBtn">开启摄像头测试</button>
    <span class="stats" id="camStats"></span>
  </div>
  <video id="video" autoplay playsinline muted style="width:100%;max-width:480px;margin-top:0.7rem;border-radius:10px;background:#000" hidden></video>
</section>
""",
  """(function () {
  'use strict';
  var micStream = null, camStream = null, actx = null, raf = null;
  document.getElementById('micBtn').addEventListener('click', function () {
    if (micStream) {
      micStream.getTracks().forEach(function (t) { t.stop(); });
      micStream = null;
      this.textContent = '开启麦克风测试';
      cancelAnimationFrame(raf);
      document.getElementById('meter').style.width = '0%';
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
      micStream = s;
      document.getElementById('micBtn').textContent = '停止测试';
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      var src = actx.createMediaStreamSource(s);
      var an = actx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      var d = new Uint8Array(an.fftSize);
      (function frame() {
        raf = requestAnimationFrame(frame);
        an.getByteTimeDomainData(d);
        var peak = 0;
        for (var i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i] - 128));
        var pct = Math.min(100, peak / 64 * 100);
        document.getElementById('meter').style.width = pct + '%';
        document.getElementById('meter').style.background = pct > 85 ? '#c2554d' : pct > 4 ? 'var(--ok)' : 'var(--border)';
        document.getElementById('micStats').textContent = pct > 4 ? '检测到声音 ✓（音量 ' + Math.round(pct) + '%）' : '没有检测到声音';
      })();
    }).catch(function (e) {
      document.getElementById('micStats').textContent = '无法访问麦克风：' + e.name;
    });
  });
  document.getElementById('camBtn').addEventListener('click', function () {
    var v = document.getElementById('video');
    if (camStream) {
      camStream.getTracks().forEach(function (t) { t.stop(); });
      camStream = null; v.hidden = true;
      this.textContent = '开启摄像头测试';
      document.getElementById('camStats').textContent = '';
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { width: 640 } }).then(function (s) {
      camStream = s;
      v.srcObject = s; v.hidden = false;
      document.getElementById('camBtn').textContent = '停止测试';
      document.getElementById('camStats').textContent = '摄像头工作正常 ✓（' + s.getVideoTracks()[0].label + '）';
    }).catch(function (e) {
      document.getElementById('camStats').textContent = '无法访问摄像头：' + e.name;
    });
  });
})();""",
  "浏览器会先请求授权；NotReadableError 通常是摄像头被其他软件占用。")
