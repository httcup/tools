#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ToolKnit 批次定义（五）：创作与设计（取色器、渐变、图表、发票、签名、白板）。"""

TOOLS = []


def t(slug, name, desc, long, keys, cat, icon, body, js, note=""):
    TOOLS.append(dict(slug=slug, name=name, desc=desc, long=long, keys=keys,
                      cat=cat, icon=icon, note=note, body=body, js=js))


t("color-picker", "取色器与颜色转换",
  "屏幕取色、HEX/RGB/HSL 互转。",
  "用 EyeDropper API 从屏幕任意位置取色，或输入 HEX / RGB / HSL 互相转换，附常用色卡，点击复制。",
  "取色器 颜色 hex rgb hsl color picker",
  "creative-design", "palette",
  """
<section class="tool-card">
  <div class="row">
    <button class="btn btn-primary" type="button" id="pickBtn">💧 从屏幕取色</button>
    <input type="color" id="cIn" value="#2b6cb0" style="width:3.4rem;height:42px;border:1px solid var(--border);border-radius:7px;background:var(--surface)">
    <div id="swatch" style="width:4.5rem;height:42px;border-radius:7px;border:1px solid var(--border);background:#2b6cb0"></div>
    <span class="stats">点任意色值行可复制</span>
  </div>
</section>
<section class="tool-card">
  <dl class="kv" id="vals"></dl>
</section>
<section class="tool-card">
  <h2>色阶与常用色</h2>
  <div id="shades" style="display:flex;gap:0.2rem;height:2rem;border-radius:7px;overflow:hidden"></div>
  <div id="pallette" style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.8rem"></div>
</section>
""",
  """(function () {
  'use strict';
  var cur = { r: 43, g: 108, b: 176 };
  var PAL = { '黑': '#111111', '白': '#FFFFFF', '红': '#E05252', '橙': '#E8873A', '黄': '#E8C547', '绿': '#4CAF7D', '青': '#3BAFAF', '蓝': '#2B6CB0', '紫': '#805AD5', '粉': '#ED8DBE', '灰': '#9AA3AE', '棕': '#9C6B4A' };
  function toHex(c) { return '#' + [c.r, c.g, c.b].map(function (v) { return v.toString(16).padStart(2, '0'); }).join(''); }
  function toHsl(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) {
      var d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; };
    var a = s * Math.min(l, 1 - l);
    var f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
  }
  function render() {
    document.getElementById('swatch').style.background = toHex(cur);
    var hsl = toHsl(cur);
    var lum = (0.2126 * cur.r + 0.7152 * cur.g + 0.0722 * cur.b) / 255;
    var rows = [['HEX', toHex(cur).toUpperCase()], ['RGB', 'rgb(' + cur.r + ', ' + cur.g + ', ' + cur.b + ')'],
                ['HSL', 'hsl(' + hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%)'],
                ['亮度判断', lum > 0.55 ? '浅色（配深色文字）' : '深色（配浅色文字）']];
    document.getElementById('vals').innerHTML = rows.map(function (r) {
      return '<dt>' + r[0] + '</dt><dd class="cp" style="cursor:pointer" data-copy="' + TK.esc(r[1]) + '">' + TK.esc(r[1]) + '</dd>';
    }).join('');
    var shades = document.getElementById('shades');
    shades.innerHTML = [90, 75, 60, 45, 30, 20].map(function (l) {
      var c = hslToRgb(hsl[0], hsl[1], l);
      return '<div class="cp" title="' + toHex(c) + '" data-copy="' + toHex(c) + '" style="flex:1;background:' + toHex(c) + '"></div>';
    }).join('');
    document.getElementById('pallette').innerHTML = Object.keys(PAL).map(function (k) {
      return '<button type="button" data-c="' + PAL[k] + '" style="width:3rem;height:2.4rem;border:1px solid var(--border);border-radius:7px;background:' + PAL[k] + ';cursor:pointer" title="' + k + ' ' + PAL[k] + '"></button>';
    }).join('');
  }
  function setRgb(c) { cur = c; document.getElementById('cIn').value = toHex(c); render(); }
  document.getElementById('cIn').addEventListener('input', function () {
    var v = this.value;
    setRgb({ r: parseInt(v.slice(1, 3), 16), g: parseInt(v.slice(3, 5), 16), b: parseInt(v.slice(5, 7), 16) });
  });
  document.getElementById('pickBtn').addEventListener('click', function () {
    if (!window.EyeDropper) { alert('当前浏览器不支持屏幕取色（需要 Chrome/Edge 111+），可用左侧色板选色。'); return; }
    new EyeDropper().open().then(function (r) {
      var v = r.sRGBHex;
      setRgb({ r: parseInt(v.slice(1, 3), 16), g: parseInt(v.slice(3, 5), 16), b: parseInt(v.slice(5, 7), 16) });
    }).catch(function () {});
  });
  document.body.addEventListener('click', function (e) {
    var el = e.target.closest('[data-copy]');
    if (el && navigator.clipboard) navigator.clipboard.writeText(el.dataset.copy);
    var b = e.target.closest('[data-c]');
    if (b) {
      var v = b.dataset.c;
      setRgb({ r: parseInt(v.slice(1, 3), 16), g: parseInt(v.slice(3, 5), 16), b: parseInt(v.slice(5, 7), 16) });
    }
  });
  render();
})();""",
  "色阶行从浅到深各占一格，点击复制对应 HEX。")

t("gradient-generator", "渐变生成器",
  "调线性与径向渐变，复制 CSS。",
  "选两种以上颜色与角度，实时预览线性 / 径向渐变，一键复制 CSS 代码，内置配色预设。",
  "渐变 gradient css 配色",
  "creative-design", "palette",
  """
<section class="tool-card">
  <div id="preview" style="height:11rem;border-radius:10px;border:1px solid var(--border)"></div>
  <div class="row">
    <label class="field"><span>类型</span><select id="type"><option value="linear">线性</option><option value="radial">径向</option></select></label>
    <label class="field"><span>角度（°）</span><input type="number" id="ang" value="135" min="0" max="360"></label>
    <label class="field"><span>颜色 1</span><input type="color" id="c1" value="#2b6cb0"></label>
    <label class="field"><span>颜色 2</span><input type="color" id="c2" value="#805ad5"></label>
    <label class="field"><span>颜色 3（可选）</span><input type="color" id="c3" value="#e9b53a"></label>
    <label class="check"><input type="checkbox" id="use3"> 启用第三色</label>
  </div>
  <div class="row">
    <span style="font-size:0.8rem;color:var(--text-dim)">预设：</span>
    <span id="presets"></span>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>CSS 代码</h2><button class="btn btn-ghost" type="button" data-copy-target="#gOut">复制</button></div>
  <textarea id="gOut" class="out" rows="3" readonly></textarea>
</section>
""",
  """(function () {
  'use strict';
  var PRE = [['海洋', '#2b6cb0', '#3bafaf', ''], ['晚霞', '#e05252', '#e8873a', '#e8c547'], ['薰衣草', '#805ad5', '#ed8dbe', ''], ['森林', '#1d5e4e', '#4caf7d', ''], ['极光', '#0f4c5c', '#5fb49c', '#e0f2e9']];
  function css() {
    var c1 = document.getElementById('c1').value, c2 = document.getElementById('c2').value;
    var use3 = document.getElementById('use3').checked;
    var c3 = document.getElementById('c3').value;
    var stops = use3 ? c1 + ', ' + c2 + ', ' + c3 : c1 + ', ' + c2;
    if (document.getElementById('type').value === 'radial') return 'radial-gradient(circle at 50% 50%, ' + stops + ')';
    return 'linear-gradient(' + (document.getElementById('ang').value || 135) + 'deg, ' + stops + ')';
  }
  function render() {
    var v = css();
    document.getElementById('preview').style.background = v;
    document.getElementById('gOut').value = 'background: ' + v + ';';
  }
  ['type', 'ang', 'c1', 'c2', 'c3', 'use3'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
  });
  document.getElementById('presets').innerHTML = PRE.map(function (p, i) {
    var bg = p[3] ? 'linear-gradient(135deg,' + p[1] + ',' + p[2] + ',' + p[3] + ')' : 'linear-gradient(135deg,' + p[1] + ',' + p[2] + ')';
    return '<button type="button" data-i="' + i + '" style="width:3rem;height:2.2rem;border-radius:7px;border:1px solid var(--border);cursor:pointer;background:' + bg + '"></button>';
  }).join('');
  document.getElementById('presets').addEventListener('click', function (e) {
    var b = e.target.closest('[data-i]');
    if (!b) return;
    var p = PRE[+b.dataset.i];
    document.getElementById('c1').value = p[1];
    document.getElementById('c2').value = p[2];
    document.getElementById('c3').value = p[3] || '#ffffff';
    document.getElementById('use3').checked = !!p[3];
    render();
  });
  render();
})();""",
  "角度 0° 向上、90° 向右；径向渐变忽略角度。")

t("chart-maker", "图表制作器",
  "输入数据生成柱状或折线图。",
  "粘贴或输入分类数据，实时生成柱状图 / 折线图 / 饼图，可改标题与配色，导出 PNG 图片。",
  "图表 柱状图 折线图 饼图 chart",
  "creative-design", "chart",
  """
<section class="tool-card">
  <div class="row">
    <label class="field"><span>图表类型</span><select id="ct"><option value="bar">柱状图</option><option value="line">折线图</option><option value="pie">饼图</option></select></label>
    <label class="field"><span>图表标题</span><input type="text" id="title" value="月度销量" style="min-width:12rem"></label>
    <label class="field"><span>配色</span><input type="color" id="color" value="#2b6cb0"></label>
    <button class="btn btn-primary" type="button" id="dlPng">导出 PNG</button>
  </div>
  <textarea id="data" class="in" rows="5">一月, 120
二月, 200
三月, 150
四月, 260
五月, 310
六月, 280</textarea>
  <p class="note">每行一条：名称, 数值。支持中文名。</p>
</section>
<section class="tool-card">
  <div style="text-align:center"><canvas id="cv" style="max-width:100%"></canvas></div>
</section>
""",
  """(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  function data() {
    return document.getElementById('data').value.split('\\n').map(function (l) {
      var m = l.split(/[,，]/);
      return { k: (m[0] || '').trim(), v: parseFloat((m[1] || '').trim()) };
    }).filter(function (d) { return d.k && isFinite(d.v); }).slice(0, 16);
  }
  function shade(hex, f) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    var m = function (v) { return Math.round(Math.max(0, Math.min(255, v * f))); };
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  function draw() {
    var d = data(), type = document.getElementById('ct').value;
    var W = 860, H = 480;
    cv.width = W; cv.height = H;
    var color = document.getElementById('color').value;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1a202c';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(document.getElementById('title').value || '', W / 2, 40);
    if (!d.length) { ctx.fillStyle = '#999'; ctx.font = '16px sans-serif'; ctx.fillText('请输入数据', W / 2, H / 2); return; }
    var mx = Math.max.apply(null, d.map(function (x) { return x.v; }));
    if (type === 'pie') {
      var total = d.reduce(function (s, x) { return s + x.v; }, 0);
      var cx = W / 2, cy = H / 2 + 20, r = 170, ang = -Math.PI / 2;
      d.forEach(function (x, i) {
        var a = x.v / total * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, ang, ang + a);
        ctx.closePath();
        ctx.fillStyle = shade(color, 0.55 + 0.45 * i / Math.max(1, d.length - 1));
        ctx.fill();
        var mid = ang + a / 2;
        ctx.fillStyle = '#fff'; ctx.font = '600 14px sans-serif';
        if (a > 0.25) ctx.fillText(Math.round(x.v / total * 100) + '%', cx + Math.cos(mid) * r * 0.65, cy + Math.sin(mid) * r * 0.65);
        ctx.fillStyle = '#1a202c'; ctx.textAlign = 'left';
        ctx.fillText(x.k + ' ' + x.v, 24, 84 + i * 26);
        ctx.fillStyle = shade(color, 0.55 + 0.45 * i / Math.max(1, d.length - 1));
        ctx.fillRect(8, 74 + i * 26, 12, 12);
        ctx.fillStyle = '#1a202c'; ctx.textAlign = 'center';
        ang += a;
      });
    } else {
      var pad = { l: 60, r: 30, t: 80, b: 50 };
      var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
      ctx.strokeStyle = '#e2e6eb';
      ctx.fillStyle = '#8a94a1';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      for (var g = 0; g <= 5; g++) {
        var y = pad.t + ih - ih * g / 5;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.fillText(Math.round(mx * g / 5), pad.l - 8, y + 4);
      }
      var bw = iw / d.length;
      d.forEach(function (x, i) {
        var cx = pad.l + bw * i + bw / 2;
        ctx.fillStyle = '#5a6472';
        ctx.textAlign = 'center';
        ctx.fillText(x.k, cx, H - pad.b + 20);
        var vh = x.v / mx * ih;
        ctx.fillStyle = shade(color, 0.6 + 0.4 * i / Math.max(1, d.length - 1));
        if (type === 'bar') {
          ctx.fillRect(cx - bw * 0.3, pad.t + ih - vh, bw * 0.6, vh);
          ctx.fillText(x.v, cx, pad.t + ih - vh - 6);
        } else {
          var px = pad.l + bw * i + bw / 2;
          var py = pad.t + ih - vh;
          if (i > 0) {
            var prev = d[i - 1].v / mx * ih;
            ctx.strokeStyle = color; ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(pad.l + bw * (i - 1) + bw / 2, pad.t + ih - prev);
            ctx.lineTo(px, py);
            ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillText(x.v, px, py - 8);
        }
      });
    }
    document.getElementById('dlPng').onclick = function () {
      var a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = 'chart.png';
      a.click();
    };
  }
  ['ct', 'title', 'color', 'data'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', draw);
  });
  draw();
})();""",
  "导出的 PNG 为 860×480 白底图，可直接插入文档或聊天。")

t("invoice-generator", "简易收据生成器",
  "生成可打印的收据或报价单。",
  "填写商家与客户信息、明细行与税率，实时预览 A5 收据版式，直接打印或另存为 PDF。",
  "收据 发票 报价单 invoice 打印",
  "creative-design", "invoice",
  """
<section class="tool-card">
  <h2>信息</h2>
  <div class="row">
    <label class="field"><span>出单方</span><input type="text" id="from" value="示例工作室"></label>
    <label class="field"><span>客户</span><input type="text" id="to" value="张先生"></label>
    <label class="field"><span>单号</span><input type="text" id="no" value="INV-2026-001"></label>
    <label class="field"><span>日期</span><input type="date" id="date"></label>
  </div>
  <textarea id="items" class="in" rows="4" style="margin-top:0.7rem">品牌官网设计, 1, 8000
小程序开发, 1, 12000
维护服务（年）, 1, 3000</textarea>
  <p class="note">明细每行：项目, 数量, 单价（元）。</p>
  <div class="row">
    <label class="field"><span>税率（%）</span><input type="number" id="tax" value="0" min="0" max="30"></label>
    <label class="field"><span>备注</span><input type="text" id="memo" value="收款后 3 个工作日内交付"></label>
    <button class="btn btn-primary" type="button" id="printBtn">🖨 打印 / 存为 PDF</button>
  </div>
</section>
<section class="tool-card" style="background:#fff">
  <div id="paper" style="color:#111;font-family:Georgia,'Songti SC',serif"></div>
</section>
""",
  """(function () {
  'use strict';
  function render() {
    var items = document.getElementById('items').value.split('\\n').map(function (l) {
      var m = l.split(/[,，]/);
      return { k: (m[0] || '').trim(), q: parseFloat(m[1]) || 1, p: parseFloat(m[2]) || 0 };
    }).filter(function (x) { return x.k; });
    var sub = items.reduce(function (s, x) { return s + x.q * x.p; }, 0);
    var tax = sub * (parseFloat(document.getElementById('tax').value) || 0) / 100;
    var money = function (n) { return '¥ ' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    var d = document.getElementById('date').value || new Date().toISOString().slice(0, 10);
    document.getElementById('paper').innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #111;padding-bottom:0.6rem">' +
      '<h2 style="margin:0;font-size:1.5rem">' + TK.esc(document.getElementById('from').value) + '</h2>' +
      '<div style="text-align:right"><b style="font-size:1.2rem">收据</b><br><span style="font-size:0.8rem">' + TK.esc(document.getElementById('no').value) + ' · ' + d + '</span></div></div>' +
      '<p style="margin:0.8rem 0 0.3rem;font-size:0.9rem">致：<b>' + TK.esc(document.getElementById('to').value) + '</b></p>' +
      '<table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin-top:0.5rem">' +
      '<tr style="border-bottom:1px solid #ccc;text-align:left"><th style="padding:0.35rem 0">项目</th><th>数量</th><th style="text-align:right">单价</th><th style="text-align:right">小计</th></tr>' +
      items.map(function (x) {
        return '<tr style="border-bottom:1px dashed #ddd"><td style="padding:0.4rem 0">' + TK.esc(x.k) + '</td><td style="text-align:center">' + x.q + '</td><td style="text-align:right">' + money(x.p) + '</td><td style="text-align:right">' + money(x.q * x.p) + '</td></tr>';
      }).join('') +
      '<tr><td colspan="3" style="text-align:right;padding-top:0.5rem">小计</td><td style="text-align:right"><b>' + money(sub) + '</b></td></tr>' +
      (tax > 0 ? '<tr><td colspan="3" style="text-align:right">税</td><td style="text-align:right">' + money(tax) + '</td></tr>' : '') +
      '<tr><td colspan="3" style="text-align:right;font-size:1.05rem;padding-top:0.3rem">合计</td><td style="text-align:right;font-size:1.15rem"><b>' + money(sub + tax) + '</b></td></tr></table>' +
      '<p style="font-size:0.8rem;color:#555;margin-top:0.8rem">' + TK.esc(document.getElementById('memo').value) + '</p>';
  }
  document.getElementById('printBtn').addEventListener('click', function () { window.print(); });
  ['from', 'to', 'no', 'date', 'items', 'tax', 'memo'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
  });
  document.getElementById('date').valueAsDate = new Date();
  render();
})();""",
  "打印时选择「另存为 PDF」即可得到 PDF 收据；此页打印样式已内置。")

t("signature-maker", "手写签名板",
  "鼠标或手指写出签名导出 PNG。",
  "在画板上用鼠标或触屏手写签名，可调笔迹粗细与颜色，导出透明背景 PNG，直接插入文档。",
  "签名 手写 电子签名 signature",
  "creative-design", "pen",
  """
<section class="tool-card">
  <div class="row">
    <label class="field"><span>笔迹粗细</span><input type="range" id="w" min="1" max="12" value="4"></label>
    <label class="field"><span>颜色</span><select id="col"><option value="#1a202c">黑</option><option value="#1d4fd7">蓝</option><option value="#c0392b">红</option></select></label>
    <label class="check"><input type="checkbox" id="smooth" checked> 平滑笔迹</label>
    <button class="btn" type="button" id="clear">清空</button>
    <button class="btn btn-primary" type="button" id="dl">下载透明 PNG</button>
  </div>
</section>
<section class="tool-card">
  <canvas id="cv" height="260" style="width:100%;touch-action:none;border:1px dashed var(--border);border-radius:10px;background:#fff;cursor:crosshair"></canvas>
</section>
""",
  """(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var drawing = false, last = null;
  function resize() {
    var w = cv.clientWidth;
    var data = cv.toDataURL();
    cv.width = w;
    ctx.lineCap = ctx.lineJoin = 'round';
    if (data.length > 200) { var im = new Image(); im.onload = function () { ctx.drawImage(im, 0, 0); }; im.src = data; }
  }
  function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  cv.addEventListener('pointerdown', function (e) {
    drawing = true; last = pos(e);
    ctx.beginPath(); ctx.arc(last.x, last.y, document.getElementById('w').value / 2, 0, Math.PI * 2);
    ctx.fillStyle = document.getElementById('col').value; ctx.fill();
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drawing) return;
    var p = pos(e);
    ctx.strokeStyle = document.getElementById('col').value;
    ctx.lineWidth = parseFloat(document.getElementById('w').value);
    ctx.beginPath();
    if (document.getElementById('smooth').checked) {
      ctx.moveTo(last.x, last.y);
      ctx.quadraticCurveTo(last.x, last.y, (last.x + p.x) / 2, (last.y + p.y) / 2);
      ctx.lineTo(p.x, p.y);
    } else { ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); }
    ctx.stroke();
    last = p;
  });
  window.addEventListener('pointerup', function () { drawing = false; });
  document.getElementById('clear').addEventListener('click', function () { ctx.clearRect(0, 0, cv.width, cv.height); });
  document.getElementById('dl').addEventListener('click', function () {
    var out = document.createElement('canvas');
    out.width = cv.width; out.height = cv.height;
    out.getContext('2d').drawImage(cv, 0, 0);
    var a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = 'signature.png';
    a.click();
  });
  window.addEventListener('resize', resize);
  resize();
})();""",
  "导出的 PNG 背景透明，可叠在 Word / PDF 上。")

t("whiteboard", "涂鸦白板",
  "随手画草图，导出 PNG。",
  "极简白板：自由画笔、直线、矩形、椭圆与文字，多色可调，适合随手画示意图，导出 PNG。",
  "白板 涂鸦 草图 画板 whiteboard",
  "creative-design", "board",
  """
<section class="tool-card">
  <div class="row">
    <label class="field"><span>工具</span><select id="tool"><option value="pen">画笔</option><option value="line">直线</option><option value="rect">矩形</option><option value="ellipse">椭圆</option><option value="text">文字</option></select></label>
    <input type="color" id="col" value="#1a202c" style="width:2.6rem;height:38px;border:1px solid var(--border);border-radius:7px">
    <label class="field"><span>粗细</span><input type="range" id="w" min="1" max="16" value="3"></label>
    <button class="btn" type="button" id="undo">↩ 撤销</button>
    <button class="btn" type="button" id="clear">清空</button>
    <button class="btn btn-primary" type="button" id="dl">导出 PNG</button>
  </div>
</section>
<section class="tool-card">
  <canvas id="cv" height="460" style="width:100%;touch-action:none;border:1px solid var(--border);border-radius:10px;background:#fff;cursor:crosshair"></canvas>
</section>
""",
  """(function () {
  'use strict';
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var undoStack = [], drawing = false, start = null, snapshot = null;
  function resize() {
    var w = cv.clientWidth;
    var data = cv.toDataURL();
    cv.width = w;
    if (data.length > 200) { var im = new Image(); im.onload = function () { ctx.drawImage(im, 0, 0); }; im.src = data; }
  }
  function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function styles() {
    ctx.strokeStyle = ctx.fillStyle = document.getElementById('col').value;
    ctx.lineWidth = parseFloat(document.getElementById('w').value);
    ctx.lineCap = ctx.lineJoin = 'round';
  }
  function save() { undoStack.push(cv.toDataURL()); if (undoStack.length > 30) undoStack.shift(); }
  cv.addEventListener('pointerdown', function (e) {
    drawing = true; start = pos(e);
    save();
    styles();
    if (document.getElementById('tool').value === 'text') {
      drawing = false;
      var txt = prompt('输入文字：');
      if (txt) {
        ctx.font = (parseFloat(document.getElementById('w').value) * 6 + 14) + 'px system-ui, sans-serif';
        ctx.fillText(txt, start.x, start.y);
      }
      return;
    }
    snapshot = ctx.getImageData(0, 0, cv.width, cv.height);
    if (document.getElementById('tool').value === 'pen') { ctx.beginPath(); ctx.moveTo(start.x, start.y); }
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drawing) return;
    var p = pos(e), tool = document.getElementById('tool').value;
    if (tool === 'pen') { ctx.lineTo(p.x, p.y); ctx.stroke(); return; }
    ctx.putImageData(snapshot, 0, 0);
    styles();
    ctx.beginPath();
    if (tool === 'line') { ctx.moveTo(start.x, start.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    if (tool === 'rect') ctx.strokeRect(Math.min(start.x, p.x), Math.min(start.y, p.y), Math.abs(p.x - start.x), Math.abs(p.y - start.y));
    if (tool === 'ellipse') {
      ctx.ellipse((start.x + p.x) / 2, (start.y + p.y) / 2, Math.abs(p.x - start.x) / 2, Math.abs(p.y - start.y) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  window.addEventListener('pointerup', function () { drawing = false; });
  document.getElementById('undo').addEventListener('click', function () {
    var d = undoStack.pop();
    if (!d) return;
    var im = new Image();
    im.onload = function () { ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(im, 0, 0); };
    im.src = d;
  });
  document.getElementById('clear').addEventListener('click', function () { save(); ctx.clearRect(0, 0, cv.width, cv.height); });
  document.getElementById('dl').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = 'whiteboard.png';
    a.click();
  });
  window.addEventListener('resize', resize);
  resize();
})();""",
  "支持 30 步撤销；文字工具点一下画布输入即可。")
