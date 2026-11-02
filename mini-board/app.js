/* 极简白板 — 画笔、橡皮、撤销、清空、导出。零依赖。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('mb-canvas');
  var ctx = canvas.getContext('2d');
  var stage = $('mb-stage');

  var state = {
    color: '#1f2328',
    size: 6,
    eraser: false,
    drawing: false,
    strokes: [],   // [{color,size,points:[{x,y}]}]
    current: null
  };

  function resize() {
    var prev = canvas.width ? canvas.toDataURL() : null;
    var r = stage.getBoundingClientRect();
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
    if (prev && state.strokes.length === 0) {
      // 仅当没有可重放笔迹时（如刷新恢复失败）才尝试贴回位图
      var img = new Image();
      img.onload = function () { ctx.drawImage(img, 0, 0, r.width, r.height); };
      img.src = prev;
    }
  }

  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function redraw() {
    var r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, r.width, r.height);
    state.strokes.forEach(function (s) { drawStroke(s); });
    if (state.current) drawStroke(state.current);
  }

  function drawStroke(s) {
    if (!s.points.length) return;
    ctx.strokeStyle = s.eraser ? '#ffffff' : s.color;
    ctx.lineWidth = s.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    if (s.points.length === 1) {
      ctx.lineTo(s.points[0].x + 0.01, s.points[0].y + 0.01);
    } else {
      for (var i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    }
    ctx.stroke();
  }

  function down(e) {
    e.preventDefault();
    state.drawing = true;
    state.current = { color: state.color, size: state.size, eraser: state.eraser, points: [pos(e)] };
    redraw();
  }

  function move(e) {
    if (!state.drawing) return;
    e.preventDefault();
    var p = pos(e);
    var pts = state.current.points;
    var last = pts[pts.length - 1];
    if (Math.abs(p.x - last.x) + Math.abs(p.y - last.y) < 1.2) return;
    pts.push(p);
    if (state.eraser) {
      var half = state.size * 2;
      state.strokes = state.strokes.filter(function (s) {
        if (s.eraser) return true;
        for (var i = 0; i < s.points.length; i++) {
          if (Math.abs(s.points[i].x - p.x) < half + s.size / 2 &&
              Math.abs(s.points[i].y - p.y) < half + s.size / 2) return false;
        }
        return true;
      });
    } else {
      pts.push(p); pts.pop(); // noop 防误用
    }
    redraw();
  }

  function up() {
    if (!state.drawing) return;
    state.drawing = false;
    if (state.current && state.current.points.length) state.strokes.push(state.current);
    state.current = null;
    redraw();
  }

  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  // 工具栏
  $('mb-colors').addEventListener('click', function (e) {
    var b = e.target.closest('[data-color]');
    if (!b) return;
    state.color = b.dataset.color;
    state.eraser = false;
    $('mb-eraser').setAttribute('aria-pressed', 'false');
    stage.classList.remove('erasing');
    this.querySelectorAll('.mb-pen').forEach(function (x) {
      x.classList.toggle('active', x === b);
      x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    });
  });

  $('mb-sizes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-size]');
    if (!b) return;
    state.size = Number(b.dataset.size);
    this.querySelectorAll('.mb-size').forEach(function (x) {
      x.classList.toggle('active', x === b);
      x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    });
  });

  $('mb-eraser').addEventListener('click', function () {
    state.eraser = !state.eraser;
    this.setAttribute('aria-pressed', state.eraser ? 'true' : 'false');
    stage.classList.toggle('erasing', state.eraser);
  });

  $('mb-undo').addEventListener('click', function () {
    state.strokes.pop();
    redraw();
  });

  $('mb-clear').addEventListener('click', function () {
    if (!state.strokes.length) return;
    if (!window.confirm('清空整块白板？')) return;
    state.strokes = [];
    redraw();
  });

  $('mb-save').addEventListener('click', function () {
    var a = document.createElement('a');
    a.download = '白板-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      state.strokes.pop();
      redraw();
    } else if (e.key === 'e' || e.key === 'E') {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      $('mb-eraser').click();
    }
  });

  window.addEventListener('resize', resize);
  resize();

  // ── 测试钩子（?test=1 时自动运行）──────────────────────────────
  if (location.search.indexOf('test=1') >= 0) runTests();

  function runTests() {
    var out = [];
    var T = function (name, fn) {
      try { fn(); out.push(name + ': PASS'); }
      catch (e) { out.push(name + ': FAIL ' + e.message); }
    };
    var assert = function (c, m) { if (!c) throw new Error(m || 'assert'); };

    T('初始白底渲染', function () {
      var d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      assert(d[0] === 255 && d[1] === 255 && d[2] === 255 && d[3] === 255, '左上角应为白');
    });

    T('画笔落笔成迹', function () {
      state.strokes = [];
      state.current = { color: '#e03131', size: 6, eraser: false, points: [{ x: 50, y: 50 }, { x: 120, y: 80 }] };
      drawStroke(state.current);
      state.strokes.push(state.current); state.current = null;
      var r = canvas.getBoundingClientRect();
      var d = ctx.getImageData(Math.round(85 * (canvas.width / r.width)), Math.round(65 * (canvas.height / r.height)), 1, 1).data;
      assert(d[3] !== 255 || d[0] > 200, '红色笔迹中点应非白底: ' + d.join(','));
    });

    T('颜色与粗细切换', function () {
      var blue = document.querySelector('[data-color="#1971c2"]');
      blue.click();
      assert(state.color === '#1971c2', '颜色应切为蓝');
      var thick = document.querySelector('[data-size="3"]');
      thick.click();
      assert(state.size === 3, '粗细应切为 3');
      document.querySelector('[data-color="#1f2328"]').click();
      document.querySelector('[data-size="6"]').click();
    });

    T('撤销删除末笔', function () {
      var n = state.strokes.length;
      state.strokes.push({ color: '#000', size: 6, eraser: false, points: [{ x: 1, y: 1 }] });
      $('mb-undo').click();
      assert(state.strokes.length === n, '撤销后应回到 ' + n);
    });

    T('清空并确认', function () {
      window.confirm = function () { return true; };
      state.strokes.push({ color: '#000', size: 6, eraser: false, points: [{ x: 2, y: 2 }] });
      $('mb-clear').click();
      assert(state.strokes.length === 0, '清空后应为 0 笔');
    });

    T('导出 PNG 为 dataURL', function () {
      var url = canvas.toDataURL('image/png');
      assert(url.indexOf('data:image/png') === 0 && url.length > 1000, '导出应非空');
    });

    var pass = out.filter(function (s) { return s.indexOf('PASS') >= 0; }).length;
    var pre = document.createElement('pre');
    pre.id = 'r';
    pre.textContent = out.join('\n') + '\nRESULTS: ' + pass + '/' + out.length + ' PASS';
    document.body.appendChild(pre);
  }
})();
