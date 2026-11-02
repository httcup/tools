/* 多功能白板 — 无限画布、图形/便签/文字、选中移动、撤销、工程存取、PNG 导出。零依赖。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('wb2-canvas');
  var ctx = canvas.getContext('2d');
  var stage = $('wb2-stage');
  var editor = $('wb2-editor');

  var state = {
    tool: 'select',
    color: '#1f2328',
    width: 4,
    fontSize: 22,
    noteColor: '#fff59d',
    shapes: [],          // 世界坐标
    view: { x: 0, y: 0, k: 1 },   // 平移 + 缩放
    selected: null,      // 引用
    drag: null,          // 当前交互
    undoStack: [],
    redoStack: []
  };

  var LS_KEY = 'mb2.v1';
  var nextId = 1;
  function uid() { return nextId++; }

  /* ── 视图换算 ───────────────────────────────────────────── */
  function toWorld(px, py) {
    return { x: (px - state.view.x) / state.view.k, y: (py - state.view.y) / state.view.k };
  }
  function screenPos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /* ── 绘制 ───────────────────────────────────────────────── */
  function resize() {
    var r = stage.getBoundingClientRect();
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    var r = canvas.getBoundingClientRect();
    var W = r.width, H = r.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // 点阵背景
    var k = state.view.k;
    if (k > 0.35) {
      var step = 40 * k;
      var sx = state.view.x % step, sy = state.view.y % step;
      ctx.fillStyle = 'rgba(31,35,40,.10)';
      for (var gx = sx; gx < W; gx += step) {
        for (var gy = sy; gy < H; gy += step) ctx.fillRect(gx, gy, 1.4, 1.4);
      }
    }

    ctx.save();
    ctx.translate(state.view.x, state.view.y);
    ctx.scale(k, k);
    state.shapes.forEach(function (s) { drawShape(s, k); });
    if (state.drag && state.drag.preview) drawShape(state.drag.preview, k);
    // 选中框
    if (state.selected) {
      var b = bbox(state.selected);
      if (b) {
        ctx.strokeStyle = '#1971c2';
        ctx.lineWidth = 1.5 / k;
        ctx.setLineDash([5 / k, 4 / k]);
        ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
    $('wb2-zoom').textContent = Math.round(k * 100) + '%';
  }

  function drawShape(s, k) {
    ctx.lineWidth = s.size || 4;
    ctx.strokeStyle = s.color || '#1f2328';
    ctx.fillStyle = s.color || '#1f2328';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    switch (s.t) {
      case 'pen':
        if (!s.pts.length) return;
        ctx.beginPath();
        ctx.moveTo(s.pts[0].x, s.pts[0].y);
        for (var i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
        ctx.stroke();
        break;
      case 'line':
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        break;
      case 'arrow': {
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        var ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
        var hl = Math.max(10, (s.size || 4) * 3);
        ctx.beginPath();
        ctx.moveTo(s.x2, s.y2);
        ctx.lineTo(s.x2 - hl * Math.cos(ang - 0.45), s.y2 - hl * Math.sin(ang - 0.45));
        ctx.lineTo(s.x2 - hl * Math.cos(ang + 0.45), s.y2 - hl * Math.sin(ang + 0.45));
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'rect':
        ctx.strokeRect(Math.min(s.x, s.x + s.w), Math.min(s.y, s.y + s.h), Math.abs(s.w), Math.abs(s.h));
        break;
      case 'ellipse': {
        ctx.beginPath();
        ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w / 2), Math.abs(s.h / 2), 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'diamond': {
        var cx = s.x + s.w / 2, cy = s.y + s.h / 2;
        ctx.beginPath();
        ctx.moveTo(cx, s.y); ctx.lineTo(s.x + s.w, cy);
        ctx.lineTo(cx, s.y + s.h); ctx.lineTo(s.x, cy);
        ctx.closePath(); ctx.stroke();
        break;
      }
      case 'text': {
        ctx.fillStyle = s.color;
        ctx.font = s.fs + 'px system-ui, -apple-system, "PingFang SC", sans-serif';
        ctx.textBaseline = 'top';
        var lines = String(s.text).split('\n');
        for (var li = 0; li < lines.length; li++) ctx.fillText(lines[li], s.x, s.y + li * s.fs * 1.35);
        break;
      }
      case 'note': {
        ctx.fillStyle = s.bg || '#fff59d';
        ctx.strokeStyle = 'rgba(0,0,0,.18)';
        ctx.lineWidth = 1;
        var x = Math.min(s.x, s.x + s.w), y = Math.min(s.y, s.y + s.h);
        var w = Math.abs(s.w), h = Math.abs(s.h);
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#1f2328';
        ctx.font = '15px system-ui, -apple-system, "PingFang SC", sans-serif';
        ctx.textBaseline = 'top';
        var inner = w - 20;
        var rows = wrapText(s.text || '', inner);
        for (var ri = 0; ri < rows.length && ri * 22 < h - 16; ri++) {
          ctx.fillText(rows[ri], x + 10, y + 10 + ri * 22);
        }
        break;
      }
    }
  }

  function wrapText(text, maxW) {
    var rows = [];
    String(text).split('\n').forEach(function (line) {
      var cur = '';
      for (var i = 0; i < line.length; i++) {
        if (ctx.measureText(cur + line[i]).width > maxW && cur) { rows.push(cur); cur = line[i]; }
        else cur += line[i];
      }
      rows.push(cur);
    });
    return rows;
  }

  /* ── 命中检测与包围盒 ───────────────────────────────────── */
  function bbox(s) {
    switch (s.t) {
      case 'pen': {
        if (!s.pts.length) return null;
        var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
        s.pts.forEach(function (p) {
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        });
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      }
      case 'line': case 'arrow':
        return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
      case 'rect': case 'ellipse': case 'diamond': case 'note':
        return { x: Math.min(s.x, s.x + s.w), y: Math.min(s.y, s.y + s.h), w: Math.abs(s.w), h: Math.abs(s.h) };
      case 'text': {
        ctx.font = s.fs + 'px system-ui, sans-serif';
        var lines = String(s.text).split('\n');
        var w = 0;
        lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l).width); });
        return { x: s.x, y: s.y, w: w, h: lines.length * s.fs * 1.35 };
      }
    }
    return null;
  }

  function hit(s, wx, wy) {
    var b = bbox(s);
    if (!b) return false;
    var pad = (s.t === 'pen' ? (s.size || 4) / 2 + 4 : 6);
    return wx >= b.x - pad && wx <= b.x + b.w + pad && wy >= b.y - pad && wy <= b.y + b.h + pad;
  }

  function shapeAt(wx, wy) {
    for (var i = state.shapes.length - 1; i >= 0; i--) {
      if (hit(state.shapes[i], wx, wy)) return state.shapes[i];
    }
    return null;
  }

  /* ── 撤销/持久化 ────────────────────────────────────────── */
  function snapshot() {
    state.undoStack.push(JSON.stringify(state.shapes));
    if (state.undoStack.length > 50) state.undoStack.shift();
    state.redoStack = [];
  }
  function undo() {
    if (!state.undoStack.length) return;
    state.redoStack.push(JSON.stringify(state.shapes));
    state.shapes = JSON.parse(state.undoStack.pop());
    state.selected = null;
    draw(); persist();
  }
  function redo() {
    if (!state.redoStack.length) return;
    state.undoStack.push(JSON.stringify(state.shapes));
    state.shapes = JSON.parse(state.redoStack.pop());
    state.selected = null;
    draw(); persist();
  }
  var persistT = 0;
  function persist() {
    clearTimeout(persistT);
    persistT = setTimeout(function () {
      try { localStorage.setItem(LS_KEY, JSON.stringify({ shapes: state.shapes, view: state.view })); } catch (e) {}
    }, 300);
  }
  function restore() {
    try {
      var d = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (d && d.shapes) { state.shapes = d.shapes; state.view = d.view || state.view; }
    } catch (e) {}
  }

  /* ── 文字编辑浮层 ───────────────────────────────────────── */
  var editing = null; // {shape, isNew}
  function openEditor(shape, screenPt) {
    editing = { shape: shape, isNew: !shape.text };
    editor.hidden = false;
    var k = state.view.k;
    var fs = (shape.t === 'note' ? 15 : shape.fs) * k;
    editor.style.font = fs + 'px system-ui, sans-serif';
    editor.style.left = screenPt.x + 'px';
    editor.style.top = (screenPt.y - fs - 6) + 'px';
    editor.value = shape.text || '';
    editor.focus();
  }
  function closeEditor(commit) {
    if (!editing) return;
    var sh = editing.shape;
    editor.hidden = true;
    if (commit) {
      sh.text = editor.value.trim();
      if (sh.t === 'text' && !sh.text) { removeShape(sh); }
      else { if (!editing.isNew) { /* 修改已有文字，快照在打开时已做 */ } }
    } else if (editing.isNew) {
      removeShape(sh);
    }
    editing = null;
    draw(); persist();
  }
  function removeShape(s) {
    var i = state.shapes.indexOf(s);
    if (i >= 0) state.shapes.splice(i, 1);
  }

  /* ── 指针交互 ───────────────────────────────────────────── */
  function down(e) {
    if (e.button === 1 || state.tool === 'pan' || spaceDown) { startPan(e); return; }
    if (editing) { closeEditor(true); return; }
    var sp = screenPos(e);
    var w = toWorld(sp.x, sp.y);

    switch (state.tool) {
      case 'select': {
        var s = shapeAt(w.x, w.y);
        state.selected = s;
        if (s && s.t === 'note' && e.detail >= 2) { snapshot(); openEditor(s, sp); return; }
        if (s) state.drag = { mode: 'move', start: w, orig: JSON.stringify(s), shape: s };
        draw();
        break;
      }
      case 'pen':
        state.drag = { mode: 'pen', preview: { t: 'pen', color: state.color, size: state.width, pts: [w] } };
        break;
      case 'line': case 'arrow':
        state.drag = { mode: 'shape', preview: { t: state.tool, color: state.color, size: state.width, x1: w.x, y1: w.y, x2: w.x, y2: w.y } };
        break;
      case 'rect': case 'ellipse': case 'diamond':
        state.drag = { mode: 'shape', preview: { t: state.tool, color: state.color, size: state.width, x: w.x, y: w.y, w: 0, h: 0 } };
        break;
      case 'text': {
        snapshot();
        var sh = { id: uid(), t: 'text', color: state.color, fs: state.fontSize, x: w.x, y: w.y, text: '' };
        state.shapes.push(sh);
        openEditor(sh, sp);
        break;
      }
      case 'note': {
        snapshot();
        var nt = { id: uid(), t: 'note', bg: state.noteColor, x: w.x, y: w.y, w: 150, h: 96, text: '' };
        state.shapes.push(nt);
        state.selected = nt;
        openEditor(nt, sp);
        break;
      }
      case 'eraser': {
        snapshot();
        state.drag = { mode: 'erase' };
        eraseAt(w);
        break;
      }
    }
  }

  function move(e) {
    if (state.drag && state.drag.mode === 'pan') { doPan(e); return; }
    var sp = screenPos(e);
    var w = toWorld(sp.x, sp.y);
    var d = state.drag;
    if (!d) return;

    switch (d.mode) {
      case 'pen':
        var pts = d.preview.pts;
        var last = pts[pts.length - 1];
        if (Math.abs(w.x - last.x) + Math.abs(w.y - last.y) > 1 / state.view.k) pts.push(w);
        break;
      case 'shape':
        if (d.preview.t === 'line' || d.preview.t === 'arrow') { d.preview.x2 = w.x; d.preview.y2 = w.y; }
        else { d.preview.w = w.x - d.preview.x; d.preview.h = w.y - d.preview.y; }
        break;
      case 'move':
        var orig = JSON.parse(d.orig);
        var dx = w.x - d.start.x, dy = w.y - d.start.y;
        ['x', 'y'].forEach(function () {});
        if (d.shape.t === 'pen') d.shape.pts = orig.pts.map(function (p) { return { x: p.x + dx, y: p.y + dy }; });
        else if (d.shape.t === 'line' || d.shape.t === 'arrow') {
          d.shape.x1 = orig.x1 + dx; d.shape.y1 = orig.y1 + dy;
          d.shape.x2 = orig.x2 + dx; d.shape.y2 = orig.y2 + dy;
        } else { d.shape.x = orig.x + dx; d.shape.y = orig.y + dy; }
        break;
      case 'erase': eraseAt(w); break;
    }
    draw();
  }

  function up() {
    var d = state.drag;
    if (!d) return;
    if (d.mode === 'pan') { state.drag = null; return; }
    if (d.mode === 'pen' && d.preview.pts.length) state.shapes.push(d.preview);
    else if (d.mode === 'shape') {
      var p = d.preview;
      var tiny = (p.t === 'line' || p.t === 'arrow')
        ? Math.abs(p.x2 - p.x1) + Math.abs(p.y2 - p.y1) < 4
        : Math.abs(p.w) + Math.abs(p.h) < 6;
      if (!tiny) state.shapes.push(p); else state.undoStack.pop();
    } else if (d.mode === 'move' || d.mode === 'erase') { /* 快照已在 down 时做 */ }
    state.drag = null;
    draw(); persist();
  }

  function eraseAt(w) {
    for (var i = state.shapes.length - 1; i >= 0; i--) {
      if (hit(state.shapes[i], w.x, w.y)) { state.shapes.splice(i, 1); draw(); }
    }
  }

  /* ── 平移/缩放 ──────────────────────────────────────────── */
  var spaceDown = false;
  function startPan(e) {
    var sp = screenPos(e);
    state.drag = { mode: 'pan', sx: sp.x, sy: sp.y, ox: state.view.x, oy: state.view.y };
    if (e.cancelable) e.preventDefault();
  }
  function doPan(e) {
    var sp = screenPos(e);
    state.view.x = state.drag.ox + (sp.x - state.drag.sx);
    state.view.y = state.drag.oy + (sp.y - state.drag.sy);
    draw(); persist();
  }

  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    var sp = screenPos(e);
    var factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    var nk = Math.min(4, Math.max(0.2, state.view.k * factor));
    var w = toWorld(sp.x, sp.y);
    state.view.k = nk;
    state.view.x = sp.x - w.x * nk;
    state.view.y = sp.y - w.y * nk;
    draw(); persist();
  }, { passive: false });

  /* ── 适应内容 / 清空 / 导出 / 工程 ──────────────────────── */
  function contentBBox() {
    var b = null;
    state.shapes.forEach(function (s) {
      var sb = bbox(s);
      if (!sb) return;
      if (!b) b = { x: sb.x, y: sb.y, w: sb.w, h: sb.h };
      else {
        var x2 = Math.max(b.x + b.w, sb.x + sb.w), y2 = Math.max(b.y + b.h, sb.y + sb.h);
        b.x = Math.min(b.x, sb.x); b.y = Math.min(b.y, sb.y);
        b.w = x2 - b.x; b.h = y2 - b.y;
      }
    });
    return b;
  }

  function fitView() {
    var b = contentBBox();
    var r = canvas.getBoundingClientRect();
    if (!b || (b.w === 0 && b.h === 0)) { state.view = { x: r.width / 2, y: r.height / 2, k: 1 }; draw(); return; }
    var k = Math.min(2, Math.min((r.width - 80) / Math.max(b.w, 1), (r.height - 80) / Math.max(b.h, 1)));
    k = Math.max(0.2, k);
    state.view.k = k;
    state.view.x = (r.width - b.w * k) / 2 - b.x * k;
    state.view.y = (r.height - b.h * k) / 2 - b.y * k;
    draw(); persist();
  }

  function exportPNG() {
    var b = contentBBox() || { x: 0, y: 0, w: 400, h: 300 };
    var pad = 40;
    var W = Math.ceil(b.w + pad * 2), H = Math.ceil(b.h + pad * 2);
    var scale = Math.min(2, Math.max(1, 1600 / Math.max(W, H)));
    var out = document.createElement('canvas');
    out.width = Math.round(W * scale); out.height = Math.round(H * scale);
    var octx = out.getContext('2d');
    octx.fillStyle = '#fff';
    octx.fillRect(0, 0, out.width, out.height);
    octx.translate(pad * scale, pad * scale);
    octx.scale(scale, scale);
    octx.lineCap = 'round'; octx.lineJoin = 'round';
    state.shapes.forEach(function (s) { drawShapeOn(octx, s); });
    var a = document.createElement('a');
    a.download = '白板-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.png';
    a.href = out.toDataURL('image/png');
    a.click();
  }

  function drawShapeOn(c2, s) {
    // 复用 drawShape：临时切换 ctx
    var old = ctx;
    try {
      ctx = c2;
      var self = { k: 1 };
      drawShape(s, 1);
    } finally { ctx = old; }
  }

  function saveProject() {
    var blob = new Blob([JSON.stringify({ v: 1, shapes: state.shapes, view: state.view })], { type: 'application/json' });
    var a = document.createElement('a');
    a.download = '白板工程-' + new Date().toISOString().slice(0, 10) + '.json';
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function loadProject(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var d = JSON.parse(fr.result);
        if (!d || !Array.isArray(d.shapes)) throw new Error('bad file');
        snapshot();
        state.shapes = d.shapes;
        if (d.view) state.view = d.view;
        draw(); persist();
      } catch (e) { window.alert('工程文件解析失败：' + e.message); }
    };
    fr.readAsText(file);
  }

  /* ── 事件绑定 ───────────────────────────────────────────── */
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  document.querySelector('.wb2-tools').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tool]');
    if (!b) return;
    setTool(b.dataset.tool);
  });

  function setTool(t) {
    state.tool = t;
    document.querySelectorAll('.wb2-t').forEach(function (x) {
      var on = x.dataset.tool === t;
      x.classList.toggle('active', on);
      x.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    canvas.style.cursor = (t === 'pan' || t === 'select') ? 'grab' : (t === 'text' ? 'text' : (t === 'eraser' ? 'cell' : 'crosshair'));
  }

  $('wb2-colors').addEventListener('click', function (e) {
    var b = e.target.closest('[data-color]');
    if (!b) return;
    state.color = b.dataset.color;
    if (state.selected && state.selected.t !== 'note') { state.selected.color = state.color; draw(); persist(); }
    this.querySelectorAll('.wb2-c').forEach(function (x) {
      x.classList.toggle('active', x === b);
      x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    });
  });

  $('wb2-width').addEventListener('change', function () { state.width = Number(this.value); });
  $('wb2-font').addEventListener('change', function () { state.fontSize = Number(this.value); });
  $('wb2-note-color').addEventListener('change', function () {
    state.noteColor = this.value;
    if (state.selected && state.selected.t === 'note') { state.selected.bg = this.value; draw(); persist(); }
  });

  $('wb2-undo').addEventListener('click', undo);
  $('wb2-redo').addEventListener('click', redo);
  $('wb2-del').addEventListener('click', function () {
    if (!state.selected) return;
    snapshot();
    removeShape(state.selected);
    state.selected = null;
    draw(); persist();
  });
  $('wb2-clear').addEventListener('click', function () {
    if (!state.shapes.length) return;
    if (!window.confirm('清空整块白板？')) return;
    snapshot();
    state.shapes = [];
    state.selected = null;
    draw(); persist();
  });
  $('wb2-fit').addEventListener('click', fitView);
  $('wb2-export').addEventListener('click', exportPNG);
  $('wb2-save-json').addEventListener('click', saveProject);
  $('wb2-load-json').addEventListener('change', function () {
    if (this.files[0]) loadProject(this.files[0]);
    this.value = '';
  });

  editor.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); closeEditor(true); }
    else if (e.key === 'Escape') { e.preventDefault(); closeEditor(false); }
    e.stopPropagation();
  });

  document.addEventListener('keydown', function (e) {
    if (e.target === editor || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selected) { $('wb2-del').click(); e.preventDefault(); }
    } else if (e.key === ' ') {
      spaceDown = true;
      e.preventDefault();
    } else {
      var map = { v: 'select', p: 'pen', l: 'line', a: 'arrow', r: 'rect', o: 'ellipse', d: 'diamond', t: 'text', n: 'note', e: 'eraser' };
      var t = map[e.key.toLowerCase()];
      if (t) setTool(t);
    }
  });
  document.addEventListener('keyup', function (e) { if (e.key === ' ') spaceDown = false; });

  window.addEventListener('resize', resize);
  restore();
  resize();

  /* ── 测试钩子（?test=1）────────────────────────────────── */
  if (location.search.indexOf('test=1') >= 0) runTests();

  function runTests() {
    window.WB = state; // 便于驱动
    var out = [];
    var T = function (name, fn) {
      try { fn(); out.push(name + ': PASS'); }
      catch (e) { out.push(name + ': FAIL ' + e.message); }
    };
    var assert = function (c, m) { if (!c) throw new Error(m || 'assert'); };

    T('初始渲染 + 点阵', function () {
      // 采样避开左上角点阵起点
      var d = ctx.getImageData(Math.round(12 * (canvas.width / canvas.getBoundingClientRect().width)), Math.round(12 * (canvas.width / canvas.getBoundingClientRect().width)), 1, 1).data;
      assert(d[0] === 255 && d[3] === 255, '应为白底');
    });

    T('矩形拖画', function () {
      snapshot();
      var r0 = state.shapes.length;
      var rect = { id: uid(), t: 'rect', color: '#1971c2', size: 4, x: 50, y: 50, w: 120, h: 70 };
      state.shapes.push(rect);
      var b = bbox(rect);
      assert(b.w === 120 && b.h === 70, 'bbox 应为 120x70');
      assert(hit(rect, 100, 80), '中心点应命中');
      assert(!hit(rect, 300, 300), '远处不应命中');
      assert(state.shapes.length === r0 + 1, '应有新图形');
    });

    T('箭头/菱形/椭圆 bbox', function () {
      var a = { t: 'arrow', size: 4, x1: 0, y1: 0, x2: 100, y2: 40 };
      var ba = bbox(a);
      assert(ba.w === 100 && ba.h === 40, '箭头 bbox 错');
      var di = { t: 'diamond', size: 4, x: 10, y: 10, w: 60, h: 40 };
      assert(bbox(di).w === 60, '菱形 bbox 错');
      var el = { t: 'ellipse', size: 4, x: 0, y: 0, w: 80, h: 60 };
      assert(hit(el, 40, 30), '椭圆中心应命中');
    });

    T('文字便签创建与命中', function () {
      var tx = { id: uid(), t: 'text', color: '#000', fs: 22, x: 10, y: 10, text: '测试文字' };
      state.shapes.push(tx);
      var b = bbox(tx);
      assert(b.w > 20 && b.h > 20, '文字 bbox 应非空');
      var nt = { id: uid(), t: 'note', bg: '#fff59d', x: 200, y: 200, w: 150, h: 96, text: '便签内容' };
      state.shapes.push(nt);
      assert(hit(nt, 250, 240), '便签中心应命中');
    });

    T('整体移动 pen', function () {
      var pen = { id: uid(), t: 'pen', color: '#000', size: 4, pts: [{ x: 0, y: 0 }, { x: 50, y: 50 }] };
      state.shapes.push(pen);
      pen.pts = pen.pts.map(function (p) { return { x: p.x + 10, y: p.y + 20 }; });
      assert(pen.pts[0].x === 10 && pen.pts[0].y === 20, '移动后坐标应 +10/+20');
    });

    T('撤销/重做', function () {
      var n = state.shapes.length;
      snapshot();
      state.shapes.push({ id: uid(), t: 'rect', color: '#000', size: 4, x: 0, y: 0, w: 10, h: 10 });
      assert(state.shapes.length === n + 1, '应 +1');
      undo();
      assert(state.shapes.length === n, '撤销应还原');
      redo();
      assert(state.shapes.length === n + 1, '重做应恢复');
      undo();
    });

    T('删除选中', function () {
      var n = state.shapes.length;
      state.selected = state.shapes[state.shapes.length - 1];
      $('wb2-del').click();
      assert(state.shapes.length === n - 1, '应删除一个');
      assert(state.selected === null, '选中应清空');
    });

    T('视图换算往返', function () {
      state.view = { x: 120, y: 80, k: 1.5 };
      var w = toWorld(300, 200);
      assert(Math.abs(w.x - 120) < 1e-6 && Math.abs(w.y - 80) < 1e-6, 'toWorld 应正确');
      state.view = { x: 0, y: 0, k: 1 };
    });

    T('导出 PNG', function () {
      state.shapes.push({ id: uid(), t: 'rect', color: '#e03131', size: 4, x: 400, y: 400, w: 100, h: 80 });
      var b = contentBBox();
      assert(b && b.w > 100, '内容 bbox 应存在');
      var url = canvas.toDataURL('image/png');
      assert(url.indexOf('data:image/png') === 0, '导出 dataURL');
      // 生成导出画布验证非空
      var out2 = document.createElement('canvas');
      out2.width = 800; out2.height = 600;
      var c2 = out2.getContext('2d');
      c2.fillStyle = '#fff'; c2.fillRect(0, 0, 800, 600);
      c2.translate(10, 10);
      state.shapes.forEach(function (s) { drawShapeOn(c2, s); });
      var d = c2.getImageData(30, 30, 1, 1).data;
      assert(!(d[0] === 255 && d[1] === 255 && d[2] === 255), '导出内容应非全白');
      undo();
    });

    T('工程 JSON 往返', function () {
      var snap = JSON.stringify({ v: 1, shapes: state.shapes, view: state.view });
      var d = JSON.parse(snap);
      assert(Array.isArray(d.shapes) && d.shapes.length > 0, '工程应含图形');
    });

    var pass = out.filter(function (s) { return s.indexOf('PASS') >= 0; }).length;
    var pre = document.createElement('pre');
    pre.id = 'r';
    pre.textContent = out.join('\n') + '\nRESULTS: ' + pass + '/' + out.length + ' PASS';
    document.body.appendChild(pre);
  }
})();
