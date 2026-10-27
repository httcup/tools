(function () {
  'use strict';
  var ROWS = ['` 1 2 3 4 5 6 7 8 9 0 - = ⌫', 'Tab Q W E R T Y U I O P [ ] \\', 'Caps A S D F G H J K L ; \' Enter', 'Shift Z X C V B N M , . / Shift', 'Space'];
  var kb = document.getElementById('kb'), counts = {}, els = {};
  ROWS.forEach(function (row) {
    var div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:0.25rem';
    row.split(' ').forEach(function (key) {
      var el = document.createElement('div');
      el.textContent = key;
      var w = { '⌫': 2, 'Tab': 1.6, '\\': 1.6, 'Caps': 1.9, 'Enter': 2.1, 'Shift': 2.4, 'Space': 8 }[key] || 1;
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
})();
