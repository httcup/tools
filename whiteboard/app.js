/* 在线白板：压感画笔、橡皮、直线/矩形/椭圆/文字，撤销重做，导出白底 PNG。
 * 纯本地渲染，无网络请求。笔迹用「点 + 压力」记录成形状列表，撤销重做靠重绘，
 * 不存整张位图快照，画很久也不会吃内存。 */
(function () {
  'use strict';

  var COLORS = ['#000000', '#5b2d90', '#0069bf', '#f6630c', '#ab228b', '#b7b7b7',
    '#e3e3e3', '#e71224', '#d20078', '#02a556', '#c09e66', '#ffc114'];
  var WIDTHS = [3, 6, 11, 18];         // 4 档基础线宽
  var ERASE_RATIO = 3.2;               // 橡皮 = 当前档位 × 3.2
  var FONT_RATIO = 2.2;                // 文字字号 = 当前档位 × 2.2 + 12
  var MAX_HIST = 80;
  var FONT = '600 %spx "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, -apple-system, sans-serif';

  var cv = document.getElementById('cv');
  var ctx = cv.getContext('2d');
  var stage = document.getElementById('stage');
  var ring = document.getElementById('ring');
  var txtIn = document.getElementById('txtIn');
  var undoBtn = document.getElementById('undo');
  var redoBtn = document.getElementById('redo');

  var tool = 'pen';
  var color = COLORS[0];
  var wIdx = 0;
  var dpr = 1, W = 0, H = 0;

  var shapes = [];        // 已完成笔画
  var hist = [[]];        // 历史快照（每次操作后的形状数组）
  var hi = 0;

  var drawing = false;
  var cur = null;          // 正在画的笔画
  var snap = null;         // 图形预览用的底图
  var origin = null;       // 图形起点
  var penDown = false;     // 指针是否按在画布上

  /* ---------- 小工具 ---------- */
  function clamp(v, lo, up) { return v < lo ? lo : v > up ? up : v; }
  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  function base() { return WIDTHS[wIdx]; }
  function eraserW() { return Math.round(base() * ERASE_RATIO); }
  function penW(p) { return base() * clamp(p, 0.14, 1); }

  /* ---------- 画布尺寸 ---------- */
  function fit() {
    var r = cv.getBoundingClientRect();
    var w = Math.round(r.width), h = Math.round(r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (w === W && h === H && cv.width === Math.round(w * dpr)) return;
    W = w; H = h;
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
    redraw();
  }

  /* ---------- 绘制 ---------- */
  function setup() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
  }

  function dot(pt, w) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, Math.max(0.4, w / 2), 0, Math.PI * 2);
    ctx.fill();
  }

  function prep(s) {
    var erase = s.t === 'eraser';
    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = erase ? '#000' : s.color;
    ctx.fillStyle = ctx.strokeStyle;
  }

  /* 第 i 个点与前一点之间的二次曲线段（两侧走中点，跟手不抖） */
  function seg(s, i) {
    var pts = s.pts;
    var erase = s.t === 'eraser';
    var a = pts[i - 1], b = pts[i];
    var m1 = i > 1 ? mid(pts[i - 2], a) : a;
    var m2 = mid(a, b);
    prep(s);
    ctx.beginPath();
    ctx.moveTo(m1.x, m1.y);
    ctx.quadraticCurveTo(a.x, a.y, m2.x, m2.y);
    ctx.lineWidth = erase ? s.w : penW((a.p + b.p) / 2);
    ctx.stroke();
    return m2;
  }

  function paintStroke(s) {
    var pts = s.pts;
    if (!pts.length) return;
    var erase = s.t === 'eraser';
    prep(s);
    if (pts.length === 1) {
      ctx.lineWidth = erase ? s.w : penW(pts[0].p);
      dot(pts[0], ctx.lineWidth);
    } else {
      var last = null;
      for (var i = 1; i < pts.length; i++) last = seg(s, i);
      var end = pts[pts.length - 1];
      prep(s);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineWidth = erase ? s.w : penW(end.p);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function paintShape(s) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.w;
    ctx.beginPath();
    if (s.t === 'line') {
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
    } else if (s.t === 'rect') {
      ctx.rect(Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1));
    } else if (s.t === 'ellipse') {
      ctx.ellipse((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2,
        Math.abs(s.x2 - s.x1) / 2, Math.abs(s.y2 - s.y1) / 2, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  function paintText(s) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = s.color;
    ctx.font = FONT.replace('%s', s.fs);
    ctx.textBaseline = 'top';
    ctx.fillText(s.text, s.x, s.y);
  }

  function paint(s) {
    if (s.t === 'pen' || s.t === 'eraser') paintStroke(s);
    else if (s.t === 'text') paintText(s);
    else paintShape(s);
  }

  function redraw() {
    setup();
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < shapes.length; i++) paint(shapes[i]);
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- 历史 ---------- */
  function commit() {
    if (hi < hist.length - 1) hist = hist.slice(0, hi + 1);
    hist.push(shapes.slice());
    if (hist.length > MAX_HIST) hist.shift();
    hi = hist.length - 1;
    syncActs();
  }

  function undo() {
    if (hi <= 0) return;
    hi--;
    shapes = hist[hi].slice();
    redraw();
    syncActs();
  }

  function redo() {
    if (hi >= hist.length - 1) return;
    hi++;
    shapes = hist[hi].slice();
    redraw();
    syncActs();
  }

  function syncActs() {
    undoBtn.disabled = hi <= 0;
    redoBtn.disabled = hi >= hist.length - 1;
  }

  /* ---------- 拖拽工具 ---------- */
  function setTool(name) {
    tool = name;
    stage.setAttribute('data-tool', name);
    var btns = document.querySelectorAll('.wb-tool');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-tool') === name ? 'true' : 'false');
    }
    if (name !== 'eraser') ring.style.display = 'none';
  }

  function setWidth(i) {
    wIdx = i;
    var btns = document.querySelectorAll('.wb-w');
    for (var k = 0; k < btns.length; k++) {
      btns[k].setAttribute('aria-pressed', String(k) === String(i) ? 'true' : 'false');
    }
  }

  function setColor(hex, swatch) {
    color = hex;
    var btns = document.querySelectorAll('.wb-sw');
    for (var k = 0; k < btns.length; k++) btns[k].setAttribute('aria-pressed', btns[k] === swatch ? 'true' : 'false');
  }

  /* ---------- 调色板 ---------- */
  (function buildPalette() {
    var box = document.getElementById('palette');
    COLORS.forEach(function (hex, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wb-sw';
      b.style.background = hex;
      b.setAttribute('data-c', hex);
      b.setAttribute('aria-label', hex);
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        setColor(hex, b);
        txtIn.style.color = hex;
      });
      box.appendChild(b);
    });
    /* 自定义颜色：原生取色器藏在一个彩虹圆点里，点开就是系统调色板 */
    var wrap = document.createElement('label');
    wrap.className = 'wb-pick';
    var pick = document.createElement('input');
    pick.type = 'color';
    pick.value = COLORS[0];
    pick.setAttribute('aria-label', '自定义颜色');
    pick.addEventListener('input', function () { setColor(pick.value, null); txtIn.style.color = pick.value; });
    wrap.appendChild(pick);
    box.appendChild(wrap);
  })();

  /* ---------- 指针 ---------- */
  function pos(e) {
    var r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function point(e) {
    var p = pos(e);
    p.p = e.pointerType === 'pen' ? clamp(e.pressure || 0.5, 0.05, 1) : (e.pointerType === 'mouse' ? 1 : 0.85);
    return p;
  }

  function moveRing(e) {
    if (tool !== 'eraser') return;
    var r = stage.getBoundingClientRect();
    var s = eraserW();
    ring.style.display = 'block';
    ring.style.width = ring.style.height = s + 'px';
    ring.style.left = (e.clientX - r.left) + 'px';
    ring.style.top = (e.clientY - r.top) + 'px';
  }

  function down(e) {
    if (e.button !== undefined && e.button !== 0) return;
    /* 必须先挡掉默认动作：否则浏览器会把焦点挪到 body，刚 focus 的文字框立刻 blur */
    e.preventDefault();
    if (!txtIn.hidden) commitText();
    var p = point(e);
    penDown = true;

    if (tool === 'text') {
      openText(p);
      penDown = false;
      return;
    }
    cv.setPointerCapture(e.pointerId);
    setup();

    if (tool === 'pen' || tool === 'eraser') {
      cur = {
        t: tool,
        color: color,
        w: tool === 'eraser' ? eraserW() : base(),
        pts: [p]
      };
      paintStroke(cur);
      return;
    }
    origin = p;
    snap = ctx.getImageData(0, 0, cv.width, cv.height);
    cur = { t: tool, color: color, w: base(), x1: p.x, y1: p.y, x2: p.x, y2: p.y };
  }

  function move(e) {
    moveRing(e);
    if (!penDown || !cur) return;
    e.preventDefault();
    var events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    if (!events.length) events = [e];

    if (cur.t === 'pen' || cur.t === 'eraser') {
      var pts = cur.pts;
      for (var i = 0; i < events.length; i++) {
        var p = point(events[i]);
        var last = pts[pts.length - 1];
        if (Math.abs(p.x - last.x) < 0.35 && Math.abs(p.y - last.y) < 0.35) continue;
        pts.push(p);
        seg(cur, pts.length - 1);
      }
      return;
    }

    var q = point(e);
    cur.x2 = q.x;
    cur.y2 = q.y;
    ctx.putImageData(snap, 0, 0);
    setup();
    paintShape(cur);
  }

  function up(e) {
    moveRingHide(e);
    if (!penDown) return;
    penDown = false;
    if (!cur) return;
    if (cur.t === 'pen' || cur.t === 'eraser') {
      if (cur.pts.length) shapes.push(cur);
    } else {
      var moved = Math.abs(cur.x2 - cur.x1) > 2 || Math.abs(cur.y2 - cur.y1) > 2;
      if (moved) shapes.push(cur);
    }
    cur = null;
    snap = null;
    ctx.globalCompositeOperation = 'source-over';
    commit();
    /* 收笔后整幅重绘一次：实时画的最后一小段补上，图层顺序也保持一致 */
    redraw();
  }

  function moveRingHide(e) {
    if (e && e.pointerType !== 'mouse') ring.style.display = 'none';
  }

  function leave() {
    if (!penDown) ring.style.display = 'none';
  }

  /* ---------- 文字 ---------- */
  var textAt = null;

  function openText(p) {
    textAt = p;
    var fs = Math.round(base() * FONT_RATIO + 12);
    txtIn.style.left = p.x + 'px';
    txtIn.style.top = p.y + 'px';
    txtIn.style.fontSize = fs + 'px';
    txtIn.style.lineHeight = '1.25';
    txtIn.style.color = color;
    txtIn.value = '';
    txtIn.hidden = false;
    txtIn.focus();
  }

  function commitText() {
    if (txtIn.hidden) return;
    var v = txtIn.value.replace(/\s+$/, '');
    txtIn.hidden = true;
    if (v && textAt) {
      shapes.push({
        t: 'text', text: v, x: textAt.x, y: textAt.y, color: color,
        fs: Math.round(base() * FONT_RATIO + 12)
      });
      redraw();
      commit();
    }
    textAt = null;
  }

  txtIn.addEventListener('keydown', function (e) {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); commitText(); }
    if (e.key === 'Escape') { txtIn.hidden = true; textAt = null; }
  });
  txtIn.addEventListener('blur', commitText);

  /* ---------- 导出 ---------- */
  function save() {
    var out = document.createElement('canvas');
    out.width = cv.width;
    out.height = cv.height;
    var c = out.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, out.width, out.height);
    c.drawImage(cv, 0, 0);
    var d = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var name = 'whiteboard-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
      '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.png';
    out.toBlob(function (blob) {
      if (!blob) return;
      if (window.TK && TK.downloadBlob) TK.downloadBlob(name, blob);
      else {
        var a = document.createElement('a');
        var url = URL.createObjectURL(blob);
        a.href = url; a.download = name; a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      }
    }, 'image/png');
  }

  /* ---------- 事件绑定 ---------- */
  var tools = document.querySelectorAll('.wb-tool');
  for (var t = 0; t < tools.length; t++) {
    (function (btn) {
      btn.addEventListener('click', function () { setTool(btn.getAttribute('data-tool')); });
    })(tools[t]);
  }

  var widths = document.querySelectorAll('.wb-w');
  for (var wi = 0; wi < widths.length; wi++) {
    (function (btn, i) {
      btn.addEventListener('click', function () { setWidth(i); });
    })(widths[wi], wi);
  }

  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  document.getElementById('clear').addEventListener('click', function () {
    if (!shapes.length) return;
    shapes = [];
    redraw();
    commit();
  });
  document.getElementById('save').addEventListener('click', save);

  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', leave);
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.isComposing) return;
    var k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && k === 'y') { e.preventDefault(); redo(); return; }
    if ((e.metaKey || e.ctrlKey) && k === 's') { e.preventDefault(); save(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === 'b') { setTool('pen'); return; }
    if (k === 'e') setTool('eraser');
  });

  if (window.ResizeObserver) new ResizeObserver(function () { fit(); }).observe(cv);
  else window.addEventListener('resize', fit);

  fit();
  syncActs();
})();
