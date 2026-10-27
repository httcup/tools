#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ToolKnit 批次定义（二）：文本工具（摩斯、花体字、占位文本、emoji、字幕、ASCII、Markdown 编辑器）。"""

TOOLS = []


def t(slug, name, desc, long, keys, cat, icon, body, js, note=""):
    TOOLS.append(dict(slug=slug, name=name, desc=desc, long=long, keys=keys,
                      cat=cat, icon=icon, note=note, body=body, js=js))


t("morse-code-translator", "摩斯电码互译",
  "文本与摩斯电码双向转换并播放。",
  "在文本与摩斯电码之间双向转换，支持字母、数字与常用标点，可按可调速度播放电码音。",
  "摩斯电码 morse 电报",
  "text-codes-and-passwords", "link",
  """
<section class="tool-card">
  <div class="card-head"><h2>输入（自动识别方向）</h2><span class="stats" id="stats"></span></div>
  <textarea id="txtIn" class="in" rows="4" placeholder="输入文本或摩斯电码（用 . - 和空格）…"></textarea>
  <div class="row">
    <button class="btn btn-primary" type="button" id="playBtn">▶ 播放电码</button>
    <button class="btn" type="button" id="stopBtn">停止</button>
    <label class="field"><span>速度（WPM）</span><input type="number" id="wpm" value="15" min="5" max="40"></label>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>转换结果</h2><button class="btn btn-ghost" type="button" data-copy-target="#txtOut">复制</button></div>
  <textarea id="txtOut" class="out" rows="4" readonly></textarea>
  <p class="note">支持 A–Z、0–9 与常用标点；无法识别的字符原样保留。播放使用 Web Audio 本地合成，无网络请求。</p>
</section>
""",
  """(function () {
  'use strict';
  var M = { A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....', I:'..', J:'.---',
    K:'-.-', L:'.-..', M:'--', N:'-.', O:'---', P:'.--.', Q:'--.-', R:'.-.', S:'...', T:'-',
    U:'..-', V:'...-', W:'.--', X:'-..-', Y:'-.--', Z:'--..',
    '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',
    '.':'.-.-.-', ',':'--..--', '?':'..--..', '!':'-.-.--', '/':'-..-.', '@':'.--.-.', '-':'-....-' };
  var R = {};
  Object.keys(M).forEach(function (k) { R[M[k]] = k; });
  var ctx = null, stopFlag = false;
  function toMorse(s) {
    return s.toUpperCase().split(/\\s+/).map(function (w) {
      return w.split('').map(function (c) { return M[c] || c; }).join(' ');
    }).join(' / ');
  }
  function fromMorse(s) {
    return s.split(/\\s*\\/\\s*/).map(function (w) {
      return w.trim().split(/\\s+/).map(function (c) { return R[c] !== undefined ? R[c] : c; }).join('');
    }).join(' ');
  }
  function render() {
    var v = document.getElementById('txtIn').value;
    var out = document.getElementById('txtOut');
    if (!v.trim()) { out.value = ''; document.getElementById('stats').textContent = ''; return; }
    var isMorse = /^[.\\-/\\s]+$/.test(v);
    out.value = isMorse ? fromMorse(v) : toMorse(v);
    document.getElementById('stats').textContent = isMorse ? '识别为摩斯电码 → 文本' : '识别为文本 → 摩斯电码';
  }
  function play() {
    var code = toMorse(document.getElementById('txtIn').value).replace(/\\//g, '');
    var unit = 1.2 / (parseFloat(document.getElementById('wpm').value) || 15);
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    var t0 = ctx.currentTime + 0.1, gain = ctx.createGain();
    gain.gain.value = 0; gain.connect(ctx.destination);
    var osc = ctx.createOscillator();
    osc.frequency.value = 600; osc.connect(gain);
    stopFlag = false;
    code.split('').forEach(function (ch) {
      if (stopFlag) return;
      if (ch === '.') { beep(gain, t0, unit); t0 += unit * 2; }
      else if (ch === '-') { beep(gain, t0, unit * 3); t0 += unit * 4; }
      else if (ch === ' ') t0 += unit * 3;
    });
    osc.start(t0 - 0.5); osc.stop(t0 + 0.2);
  }
  function beep(gain, t, dur) {
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.setValueAtTime(0, t + dur);
  }
  document.getElementById('txtIn').addEventListener('input', render);
  document.getElementById('playBtn').addEventListener('click', play);
  document.getElementById('stopBtn').addEventListener('click', function () { stopFlag = true; });
})();""",
  "播放时保持页面在前台；SOS 是 ... --- ...，先试试它。")


t("fancy-text-generator", "花体字与特殊符号生成",
  "把文字变成花体、方框等特殊字符。",
  "把输入文字转换为花体、双线、方框、圆圈等 Unicode 风格字符，点击即可复制，适合昵称与标题装饰。",
  "花体字 特殊符号 字体 昵称 fancy text",
  "text-codes-and-passwords", "sparkle",
  """
<section class="tool-card">
  <div class="card-head"><h2>输入文字</h2></div>
  <input type="text" id="fIn" class="sel" style="width:100%;min-height:42px" value="ToolKnit 工具" placeholder="输入字母或数字…">
</section>
<section class="tool-card">
  <div class="card-head"><h2>生成结果（点击复制）</h2></div>
  <ul class="result-list" id="fOut"></ul>
  <p class="note">特殊样式仅覆盖拉丁字母与数字，中文与未映射字符会原样保留；部分平台可能显示为方块。</p>
</section>
""",
  """(function () {
  'use strict';
  function map(alpha, digits) {
    return function (s) {
      return s.split('').map(function (c) {
        var i = c.charCodeAt(0);
        if (i >= 65 && i <= 90) return alpha[i - 65][0] ? String.fromCodePoint(alpha[i - 65][0] + (alpha[i - 65][1] || 0)) : c;
        if (i >= 97 && i <= 122) return alpha[i - 97][0] ? String.fromCodePoint(alpha[i - 97][0] + (alpha[i - 97][1] || 0)) : c;
        if (i >= 48 && i <= 57 && digits) return String.fromCodePoint(digits[0] + (i - 48) * (digits[1] || 1));
        return c;
      }).join('');
    };
  }
  var styles = [
    ['花体（衬线粗体）', map(Array.from({length: 26}, function (_, i) { return [0x1D4D0 + i]; }), [0x1D7CE])],
    ['斜体粗体', map(Array.from({length: 26}, function (_, i) { return [0x1D468 + i]; }), [0x1D7CE])],
    ['双线体', map(Array.from({length: 26}, function (_, i) { return [0x1D538 + i]; }), [0x1D7D8])],
    ['圆圈体', function (s) {
      var circ = '⓪①②③④⑤⑥⑦⑧⑨';
      var up = map(Array.from({length: 26}, function (_, i) { return [0x24B6 + i]; }), null);
      return up(s).split('').map(function (c) {
        return (c >= '0' && c <= '9') ? circ[+c] : c;
      }).join('');
    }],
    ['方框体', map(Array.from({length: 26}, function (_, i) { return [0x1F130 + i]; }), null)],
    ['小型大写', function (s) {
      var m = { a:'ᴀ', b:'ʙ', c:'ᴄ', d:'ᴅ', e:'ᴇ', f:'ꜰ', g:'ɢ', h:'ʜ', i:'ɪ', j:'ᴊ', k:'ᴋ', l:'ʟ', m:'ᴍ', n:'ɴ', o:'ᴏ', p:'ᴘ', q:'ǫ', r:'ʀ', s:'ѕ', t:'ᴛ', u:'ᴜ', v:'ᴠ', w:'ᴡ', x:'x', y:'ʏ', z:'ᴢ' };
      return s.toLowerCase().split('').map(function (c) { return m[c] || c; }).join('');
    }],
    ['波浪删除线', function (s) { return s.split('').join('̶'); }]
  ];
  function render() {
    var s = document.getElementById('fIn').value;
    var out = document.getElementById('fOut');
    out.innerHTML = styles.map(function (st) {
      var v = '';
      try { v = st[1](s); } catch (e) { v = '（转换失败）'; }
      return '<li style="cursor:pointer" data-copy="' + TK.esc(v) + '"><b style="min-width:6.5rem;display:inline-block;color:var(--text-dim);font-weight:400">' + st[0] + '</b> ' + TK.esc(v) + '</li>';
    }).join('');
  }
  document.getElementById('fIn').addEventListener('input', render);
  document.getElementById('fOut').addEventListener('click', function (e) {
    var li = e.target.closest('[data-copy]');
    if (li && navigator.clipboard) navigator.clipboard.writeText(li.dataset.copy);
  });
  render();
})();""",
  "点击任意一行即复制；先贴到目标平台确认显示正常再使用。")


t("lorem-ipsum-generator", "占位文本生成器",
  "生成拉丁或中文假文占位。",
  "生成指定段落数与长度的 Lorem Ipsum 拉丁占位文，或中文假文，用于排版与设计演示，一键复制。",
  "占位文本 lorem 假文 设计",
  "text-codes-and-passwords", "doc",
  """
<section class="tool-card">
  <h2>设置</h2>
  <div class="row">
    <label class="field"><span>段落数</span><input type="number" id="lParas" value="3" min="1" max="20"></label>
    <label class="field"><span>每段句数</span><input type="number" id="lSent" value="4" min="1" max="20"></label>
    <label class="field"><span>语言</span><select id="lLang"><option value="latin">拉丁（Lorem Ipsum）</option><option value="zh">中文假文</option></select></label>
    <button class="btn btn-primary" type="button" id="lGen">生成</button>
    <button class="btn" type="button" data-copy-target="#lOut">复制</button>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>结果</h2><span class="stats" id="lStats"></span></div>
  <textarea id="lOut" class="out" rows="10" readonly></textarea>
</section>
""",
  """(function () {
  'use strict';
  var LATIN = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
  var ZH = '在设计文字排版时经常需要一些临时文本用来查看版式效果占位字符本身没有含义重点在于长短和节奏好的占位文本能帮你快速判断字号行距与栏宽是否合适'.split('');
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function sentence(lang, min, max) {
    var n = min + Math.floor(Math.random() * (max - min + 1));
    var words = [];
    if (lang === 'latin') { for (var i = 0; i < n; i++) words.push(pick(LATIN)); var s = words.join(' '); return s[0].toUpperCase() + s.slice(1) + '.'; }
    for (var j = 0; j < n; j++) words.push(pick(ZH));
    return words.join('') + '。';
  }
  function gen() {
    var paras = Math.min(20, Math.max(1, parseInt(document.getElementById('lParas').value) || 3));
    var sent = Math.min(20, Math.max(1, parseInt(document.getElementById('lSent').value) || 4));
    var lang = document.getElementById('lLang').value;
    var out = [];
    for (var p = 0; p < paras; p++) {
      var ss = [];
      for (var q = 0; q < sent; q++) ss.push(sentence(lang, 6, 14));
      out.push(ss.join(lang === 'latin' ? ' ' : ''));
    }
    var text = out.join('\\n\\n');
    document.getElementById('lOut').value = text;
    document.getElementById('lStats').textContent = text.length + ' 字符';
  }
  document.getElementById('lGen').addEventListener('click', gen);
  gen();
})();""",
  "每次点「生成」都会重新随机。")


t("emoji-finder", "Emoji 搜索与复制",
  "按关键词找 emoji，点击复制。",
  "内置按类别整理的 emoji 库，支持关键词搜索与随机推荐，点击任意 emoji 即复制到剪贴板。",
  "emoji 表情 符号 搜索",
  "text-codes-and-passwords", "sparkle",
  """
<section class="tool-card">
  <div class="row">
    <input type="text" id="eQ" class="sel" style="flex:1;min-height:42px" placeholder="搜索：笑、爱心、食物、动物、天气…">
    <button class="btn" type="button" id="eLucky">🎲 随机</button>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>结果</h2><span class="stats" id="eStats"></span></div>
  <div id="eGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(3.2rem,1fr));gap:0.3rem"></div>
  <p class="note">点击即复制；emoji 的显示效果由你的系统决定。</p>
</section>
""",
  """(function () {
  'use strict';
  var E = [];
  function add(cat, arr) { arr.forEach(function (p) { E.push({ c: p[0], k: p[1], g: cat }); }); }
  add('笑脸', [['😀','笑 高兴'],['😂','笑哭'],['🥰','喜欢 恋爱'],['😎','酷 墨镜'],['😭','大哭'],['🤔','思考'],['😴','睡'],['🤯','爆炸 头'],['🥳','庆祝 派对'],['😤','生气 哼'],['🤝','合作'],['🙏','感谢 拜'],['👍','赞 好'],['👏','鼓掌'],['💪','加油 强']]);
  add('爱心', [['❤️','红心 爱'],['🧡','橙心'],['💛','黄心'],['💚','绿心'],['💙','蓝心'],['💜','紫心'],['🖤','黑心'],['💔','心碎 分手'],['💕','爱心 粉'],['💖','闪亮 心'],['💯','满分 一百'],['✨','闪光 亮'],['🔥','火 热门'],['⭐','星 五角'],['🌈','彩虹']]);
  add('食物', [['🍎','苹果'],['🍕','披萨'],['🍔','汉堡'],['🍜','面 拉面'],['🍚','米饭'],['🍣','寿司'],['🍦','冰淇淋'],['🎂','蛋糕 生日'],['☕','咖啡'],['🍺','啤酒'],['🍉','西瓜'],['🍓','草莓'],['🥟','饺子'],['🍖','肉'],['🥗','沙拉']]);
  add('动物', [['🐱','猫'],['🐶','狗'],['🐼','熊猫'],['🦊','狐狸'],['🐰','兔子'],['🐻','熊'],['🐯','虎'],['🦁','狮子'],['🐮','牛'],['🐷','猪'],['🐸','青蛙'],['🐧','企鹅'],['🦄','独角兽'],['🐢','龟'],['🐙','章鱼']]);
  add('天气与出行', [['☀️','晴 太阳'],['⛅','多云'],['🌧️','雨'],['⛈️','雷雨'],['❄️','雪 冷'],['🌪️','龙卷风'],['🌊','浪 海'],['✈️','飞机 旅行'],['🚗','汽车'],['🚄','高铁'],['🚲','自行车'],['🏝️','岛 度假'],['🌋','火山'],['🌙','月亮 夜'],['🌤️','晴间多云']]);
  add('物品与活动', [['⚽','足球'],['🏀','篮球'],['🎮','游戏'],['🎧','耳机 音乐'],['📷','拍照'],['💻','电脑'],['📱','手机'],['💡','想法 点子'],['📚','书 学习'],['✏️','写 笔'],['🎁','礼物'],['🏆','奖 第一'],['⏰','闹钟 时间'],['💰','钱 红包'],['🎉','庆祝 派对']]);
  var grid = document.getElementById('eGrid');
  function esc(s) { return TK.esc(s); }
  function render() {
    var q = document.getElementById('eQ').value.trim().toLowerCase();
    var list = q ? E.filter(function (e) { return e.k.indexOf(q) >= 0 || e.c === q || e.g.indexOf(q) >= 0; }) : E;
    document.getElementById('eStats').textContent = list.length + ' 个';
    grid.innerHTML = list.map(function (e) {
      return '<button type="button" title="' + esc(e.k) + '" style="font-size:1.5rem;background:none;border:0;cursor:pointer;padding:0.35rem;border-radius:8px">' + e.c + '</button>';
    }).join('');
  }
  grid.addEventListener('click', function (e) {
    if (e.target.tagName === 'BUTTON' && navigator.clipboard) {
      navigator.clipboard.writeText(e.target.textContent);
      var old = e.target.style.background;
      e.target.style.background = 'color-mix(in srgb, var(--accent) 18%, transparent)';
      setTimeout(function () { e.target.style.background = old; }, 400);
    }
  });
  document.getElementById('eQ').addEventListener('input', render);
  document.getElementById('eLucky').addEventListener('click', function () {
    document.getElementById('eQ').value = E[Math.floor(Math.random() * E.length)].c;
    render();
  });
  render();
})();""",
  "搜索支持中文关键词与 emoji 本身。")


t("subtitle-repair", "字幕时间轴修复",
  "整体平移或缩放 SRT 字幕时间轴。",
  "粘贴 SRT 字幕，整体前移或后移指定秒数，或按首尾锚点线性缩放时间轴，修复不同片源的字幕不同步问题。",
  "字幕 srt 时间轴 同步 偏移",
  "text-codes-and-passwords", "doc",
  """
<section class="tool-card">
  <div class="card-head"><h2>粘贴 SRT 字幕</h2><span class="stats" id="sStats"></span></div>
  <textarea id="sIn" class="in" rows="7" placeholder="1&#10;00:00:01,000 --> 00:00:03,500&#10;你好"></textarea>
  <div class="row">
    <label class="field"><span>整体偏移（秒，正后移）</span><input type="number" id="sShift" value="0" step="0.1"></label>
    <label class="field"><span>缩放倍率（1 = 不变）</span><input type="number" id="sScale" value="1" step="0.001"></label>
    <button class="btn btn-primary" type="button" id="sRun">修复</button>
    <button class="btn" type="button" data-copy-target="#sOut">复制结果</button>
    <button class="btn" type="button" id="sDl">下载 .srt</button>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>修复结果</h2></div>
  <textarea id="sOut" class="out" rows="7" readonly></textarea>
</section>
""",
  """(function () {
  'use strict';
  function parseTs(s) {
    var m = s.trim().match(/(\\d{2}):(\\d{2}):(\\d{2})[,.](\\d{3})/);
    return m ? (+m[1]) * 3600000 + (+m[2]) * 60000 + (+m[3]) * 1000 + (+m[4]) : null;
  }
  function fmtTs(ms) {
    ms = Math.max(0, Math.round(ms));
    var h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, f = ms % 1000;
    var p = function (n, w) { return String(n).padStart(w, '0'); };
    return p(h, 2) + ':' + p(m, 2) + ':' + p(s, 2) + ',' + p(f, 3);
  }
  function run() {
    var src = document.getElementById('sIn').value;
    var shift = parseFloat(document.getElementById('sShift').value) * 1000 || 0;
    var scale = parseFloat(document.getElementById('sScale').value) || 1;
    var lines = src.split(/\\r?\\n/), out = [], n = 0;
    lines.forEach(function (line) {
      var m = line.match(/(\\d{2}:\\d{2}:\\d{2}[,.]\\d{3})\\s*-->\\s*(\\d{2}:\\d{2}:\\d{2}[,.]\\d{3})/);
      if (m) {
        var a = parseTs(m[1]), b = parseTs(m[2]);
        out.push(fmtTs(a * scale + shift) + ' --> ' + fmtTs(b * scale + shift));
        n++;
      } else out.push(line);
    });
    var text = out.join('\\n');
    document.getElementById('sOut').value = text;
    document.getElementById('sStats').textContent = n + ' 条字幕';
  }
  document.getElementById('sRun').addEventListener('click', run);
  document.getElementById('sIn').addEventListener('input', function () {
    document.getElementById('sStats').textContent = '';
  });
  document.getElementById('sDl').addEventListener('click', function () {
    TK.download('fixed.srt', document.getElementById('sOut').value);
  });
})();""",
  "字幕晚出现 = 负偏移；片源帧率不同（23.976 ↔ 25）时用缩放倍率约 0.959/1.042 试。")


t("ascii-art", "ASCII 横幅与艺术字",
  "把大写字母变成点阵横幅。",
  "把输入文字渲染成由字符组成的 ASCII 横幅，内置三种点阵字体风格，可复制到 README、注释或终端里用。",
  "ascii 艺术字 横幅 banner 终端",
  "text-codes-and-passwords", "code",
  """
<section class="tool-card">
  <div class="row">
    <input type="text" id="aIn" class="sel" style="flex:1;min-height:42px" value="HELLO" placeholder="输入 A–Z、0–9…">
    <label class="field"><span>字体</span><select id="aFont"><option value="block">方块（3×5）</option><option value="big">大字（5×7）</option><option value="shadow">重影</option></select></label>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>横幅预览</h2><button class="btn btn-ghost" type="button" data-copy-target="#aOut">复制</button></div>
  <textarea id="aOut" class="out" rows="10" readonly style="font-size:0.6rem;line-height:1.15"></textarea>
  <p class="note">小写会自动转大写；未收录的字符显示为空白列。</p>
</section>
""",
  """(function () {
  'use strict';
  var F35 = {
    A:'010111101111101', B:'110101110101110', C:'011100100100011', D:'110101101101110', E:'111100110100111',
    F:'111100110100100', G:'011100101101011', H:'101111101101101', I:'111010010010111', J:'001001001101010',
    K:'101101110101101', L:'100100100100111', M:'101111111101101', N:'110101101101101', O:'010101101101010',
    P:'110101110100100', Q:'010101101011001', R:'110101110101101', S:'011100010001110', T:'111010010010010',
    U:'101101101101111', V:'101101101101010', W:'101101111111101', X:'101101010101101', Y:'101101010010010',
    Z:'111001010100111', '0':'111101101101111','1':'110010010010111','2':'111001111100111','3':'111001111001111','4':'101101111001001',
    '5':'111100111001111','6':'111100111101111','7':'111001001010010','8':'111101111101111','9':'111101111001111', ' ':'000000000000000'
  };
  var F57 = {
    A:'01110100011000111111', B:'11110100011000011110', C:'01110100001000001110', D:'11110100011000111110', E:'11111100001100011111',
    F:'11111100001100010000', G:'01110100001011101111', H:'1000110001111111000110001', I:'1110001000100010111', J:'0011100010001100111',
    K:'1000110100110001100011000', L:'1000010000100001000011111', M:'1000111011101011000110001', N:'1000111001101011001110001', O:'0111010001100010111',
    P:'11110100011000011110', Q:'0111010001100110011101', R:'1111010001100011100110001', S:'01111100000111000011', T:'1111100100001000010000100',
    U:'1000110001100011000111110', V:'1000110001100010101000100', W:'1000110001101011101110001', X:'1000110001010101000110001', Y:'1000110001010000100000100',
    Z:'1111100010001000100011111', '0':'0111010011100110100111010','1':'0100110001000100010001110','2':'1111000011111000011111111','3':'1111000111110001100011110','4':'1001010011111100010000100',
    '5':'1111110001111000001111110','6':'0111110000111110001011110','7':'1111100001000100010001000','8':'0111010001011101000101110','9':'0111100001011110001011110', ' ':'000000000000000000000000000'
  };
  function render() {
    var s = (document.getElementById('aIn').value || '').toUpperCase();
    var font = document.getElementById('aFont').value;
    var out = document.getElementById('aOut');
    if (font === 'shadow') {
      var shadow = s.split('').map(function (c) { return '_|' }).join('');
      out.value = s + '\\n' + shadow.replace(/_\\|/g, '__');
      return;
    }
    var glyphs = s.split('').map(function (c) { return (font === 'block' ? F35 : F57)[c] || null; });
    if (!glyphs.length) { out.value = ''; return; }
    var rows = font === 'block' ? 5 : 7;
    var cols = font === 'block' ? 3 : 5;
    var lines = [];
    for (var r = 0; r < rows; r++) {
      var line = '';
      glyphs.forEach(function (g) {
        if (!g) { line += ' '.repeat(cols + 1); return; }
        for (var c = 0; c < cols; c++) {
          var on = g[r * cols + c] === '1';
          line += on ? (font === 'block' ? '██' : '█') : ' ';
        }
        line += ' ';
      });
      lines.push(line.replace(/\\s+$/, ''));
    }
    out.value = lines.join('\\n');
  }
  document.getElementById('aIn').addEventListener('input', render);
  document.getElementById('aFont').addEventListener('change', render);
  render();
})();""",
  "重影风格用下划线与竖线模拟阴影，适合代码注释。")


t("markdown-editor", "Markdown 编辑器",
  "左边写 Markdown，右边实时预览。",
  "分栏 Markdown 编辑器：左侧编辑、右侧实时预览，支持标题、列表、表格、代码块与 LaTeX 公式渲染，全部在本地完成。",
  "markdown 编辑器 预览 md",
  "text-codes-and-passwords", "code",
  """
<section class="tool-card" style="padding:0.6rem">
  <div class="row" style="margin-top:0;align-items:stretch;flex-wrap:nowrap">
    <textarea id="mdIn" class="in" style="flex:1;min-width:0;min-height:26rem" placeholder="# 在这里输入 Markdown…"># Hello

支持 **粗体**、*斜体*、`代码`、[链接](https://example.com)。

- 列表项
- 列表项

| 列 A | 列 B |
| --- | --- |
| 1 | 2 |

> 引用块
</textarea>
    <div id="mdOut" style="flex:1;min-width:0;min-height:26rem;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:0.9rem;background:var(--surface-2);font-size:0.9rem;line-height:1.7"></div>
  </div>
</section>
<script src="../md-to-word/js/markdown.js"></script>
<script src="../md-to-word/js/math.js"></script>
<script src="../md-to-word/js/docx-preview.js"></script>
""",
  """(function () {
  'use strict';
  var ta = document.getElementById('mdIn');
  var out = document.getElementById('mdOut');
  function render() {
    try {
      if (window.AITW && AITW.parseMarkdown && AITW.renderPreview) {
        out.innerHTML = AITW.renderPreview(AITW.parseMarkdown(ta.value).blocks);
      } else {
        out.innerHTML = '<pre style="white-space:pre-wrap">' + TK.esc(ta.value) + '</pre>';
      }
    } catch (e) { out.innerHTML = '<p class="neg">解析出错：' + TK.esc(String(e)) + '</p>'; }
  }
  ta.addEventListener('input', render);
  render();
})();""",
  "与「Markdown 转 Word」共用同一套解析器；公式用 $…$ 包裹。")
