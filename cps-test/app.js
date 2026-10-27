(function () {
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
})();
