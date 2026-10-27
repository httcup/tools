(function () {
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
})();
