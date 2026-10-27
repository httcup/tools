(function () {
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
})();
