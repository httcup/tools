(function () {
  'use strict';
  var CITIES = [
    ['北京时间', 'Asia/Shanghai'], ['东京', 'Asia/Tokyo'], ['新加坡', 'Asia/Singapore'],
    ['伦敦', 'Europe/London'], ['巴黎', 'Europe/Paris'], ['纽约', 'America/New_York'],
    ['洛杉矶', 'America/Los_Angeles'], ['悉尼', 'Australia/Sydney']
  ];
  var grid = document.getElementById('grid');
  try { localStorage.getItem('tk-cities') && (CITIES = JSON.parse(localStorage.getItem('tk-cities'))); } catch (e) {}
  function fmt(tz) {
    try {
      var d = new Date();
      var time = d.toLocaleTimeString('zh-CN', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      var date = d.toLocaleDateString('zh-CN', { timeZone: tz, month: 'long', day: 'numeric', weekday: 'short' });
      var h = +d.toLocaleString('en', { timeZone: tz, hour: '2-digit', hour12: false });
      return { time: time, date: date, night: h < 6 || h >= 19 };
    } catch (e) { return null; }
  }
  function render() {
    grid.innerHTML = CITIES.map(function (c) {
      var f = fmt(c[1]);
      return '<div style="border:1px solid var(--border);border-radius:10px;padding:0.7rem 0.9rem">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:0.85rem">' + TK.esc(c[0]) + '</b><span>' + (f.night ? '🌙' : '☀️') + '</span></div>' +
        '<div style="font-size:1.5rem;font-weight:700;font-variant-numeric:tabular-nums">' + (f ? f.time : '—') + '</div>' +
        '<div style="font-size:0.72rem;color:var(--text-dim)">' + (f ? f.date : '无效时区') + '</div></div>';
    }).join('');
    document.getElementById('allOut').value = CITIES.map(function (c) {
      var f = fmt(c[1]);
      return c[0] + '  ' + (f ? f.time + ' ' + f.date : '无效时区');
    }).join('\n');
  }
  document.getElementById('add').addEventListener('click', function () {
    var tz = document.getElementById('tz').value.trim();
    if (!tz || CITIES.some(function (c) { return c[1] === tz; })) return;
    CITIES.push([tz.split('/').pop().replace(/_/g, ' '), tz]);
    try { localStorage.setItem('tk-cities', JSON.stringify(CITIES)); } catch (e) {}
    document.getElementById('tz').value = '';
    render();
  });
  setInterval(render, 1000);
  render();
})();
