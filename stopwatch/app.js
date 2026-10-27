(function () {
  'use strict';
  var t0 = 0, acc = 0, timer = null, laps = [];
  var clock = document.getElementById('clock');
  function now() { return acc + (timer ? performance.now() - t0 : 0); }
  function fmt(ms) {
    var m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, c = Math.floor(ms / 10) % 100;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '.' + (c < 10 ? '0' : '') + c;
  }
  function render() { clock.textContent = fmt(now()); }
  document.getElementById('go').addEventListener('click', function () {
    if (timer) {
      acc += performance.now() - t0;
      clearInterval(timer); timer = null;
      this.textContent = '▶ 继续';
      document.getElementById('lap').disabled = true;
    } else {
      t0 = performance.now();
      timer = setInterval(render, 33);
      this.textContent = '⏸ 暂停';
      document.getElementById('lap').disabled = false;
    }
    document.getElementById('resetBtn').disabled = timer === null && now() === 0;
  });
  document.getElementById('lap').addEventListener('click', function () {
    laps.push(now());
    var el = document.getElementById('laps');
    el.innerHTML = laps.map(function (l, i) {
      var prev = i > 0 ? laps[i - 1] : 0;
      return '<li><b>#' + (i + 1) + '</b> <span style="float:right;font-variant-numeric:tabular-nums">+' + fmt(l - prev) + ' · 累计 ' + fmt(l) + '</span></li>';
    }).reverse().join('');
    document.getElementById('copy').disabled = false;
  });
  document.getElementById('resetBtn').addEventListener('click', function () {
    clearInterval(timer); timer = null; acc = 0; laps = [];
    document.getElementById('go').textContent = '▶ 开始';
    document.getElementById('lap').disabled = true;
    this.disabled = true; document.getElementById('copy').disabled = true;
    document.getElementById('laps').innerHTML = '';
    render();
  });
  document.getElementById('copy').addEventListener('click', function () {
    navigator.clipboard.writeText(laps.map(function (l, i) { return '#' + (i + 1) + '  ' + fmt(l); }).join('\n'));
  });
  render();
})();
