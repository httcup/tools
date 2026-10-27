(function () {
  'use strict';
  var ZH = ['日出江花红胜火，春来江水绿如蓝。', '千里之行，始于足下。', '宝剑锋从磨砺出，梅花香自苦寒来。', '学而不思则罔，思而不学则殆。', '海内存知己，天涯若比邻。', '会当凌绝顶，一览众山小。', '纸上得来终觉浅，绝知此事要躬行。', '沉舟侧畔千帆过，病树前头万木春。'];
  var EN = ['the quick brown fox jumps over the lazy dog', 'practice makes perfect', 'actions speak louder than words', 'every cloud has a silver lining', 'a journey of a thousand miles begins with a single step'];
  var target = '', startAt = 0, timer = null, running = false;
  function pick() {
    var mode = document.getElementById('mode').value;
    var arr = mode === 'zh' ? ZH : EN;
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function render() {
    var v = document.getElementById('in').value;
    var el = document.getElementById('text');
    el.innerHTML = target.split('').map(function (c, i) {
      var state = i < v.length ? (v[i] === c ? 'ok' : 'bad') : 'todo';
      var bg = state === 'ok' ? 'color-mix(in srgb, var(--ok) 25%, transparent)' : state === 'bad' ? 'color-mix(in srgb, #c2554d 30%, transparent)' : 'transparent';
      return '<span style="background:' + bg + ';border-radius:3px;padding:0 1px">' + TK.esc(c) + '</span>';
    }).join('');
  }
  document.getElementById('start').addEventListener('click', function () {
    target = pick();
    running = true;
    startAt = Date.now();
    document.getElementById('in').value = '';
    document.getElementById('in').focus();
    render();
    clearInterval(timer);
    timer = setInterval(function () {
      var s = (Date.now() - startAt) / 1000;
      var v = document.getElementById('in').value;
      var correct = 0;
      for (var i = 0; i < Math.min(v.length, target.length); i++) if (v[i] === target[i]) correct++;
      var cpm = v.length / s * 60;
      document.getElementById('stats').textContent = s.toFixed(0) + ' s · ' +
        (document.getElementById('mode').value === 'zh' ? Math.round(cpm) + ' 字/分' : Math.round(cpm / 5) + ' WPM') +
        ' · 正确率 ' + (v.length ? Math.round(correct / v.length * 100) : 100) + '%';
    }, 300);
  });
  document.getElementById('in').addEventListener('input', function () {
    render();
    if (running && this.value.length >= target.length) {
      running = false;
      clearInterval(timer);
      document.getElementById('hint') && 0;
      this.blur();
    }
  });
  render();
})();
