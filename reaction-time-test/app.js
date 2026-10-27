(function () {
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
})();
