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
      // 按页面当前语言排版日期，切到日语/法语时 "11月2日(日)" 自动变成对应写法
      var loc = (document.documentElement.lang || 'zh-CN');
      var time = d.toLocaleTimeString(loc, { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      var date = d.toLocaleDateString(loc, { timeZone: tz, month: 'long', day: 'numeric', weekday: 'short' });
      var h = +d.toLocaleString('en', { timeZone: tz, hour: '2-digit', hour12: false });
      return { time: time, date: date, night: h < 6 || h >= 19 };
    } catch (e) { return null; }
  }
  // 每秒只改时间/日期这几格；整块重建会让城市名每秒回到中文一帧
  function put(el, v) {
    if (el && el._raw !== v) { el._raw = v; el.textContent = v; }
  }
  function render() {
    if (grid.children.length !== CITIES.length) {
      grid.innerHTML = CITIES.map(function (c) {
        return '<div style="border:1px solid var(--border);border-radius:10px;padding:0.7rem 0.9rem">' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:0.85rem">' + TK.esc(c[0]) + '</b><span class="wc-mark"></span></div>' +
          '<div class="wc-time" style="font-size:1.5rem;font-weight:700;font-variant-numeric:tabular-nums"></div>' +
          '<div class="wc-date" style="font-size:0.72rem;color:var(--text-dim)"></div></div>';
      }).join('');
    }
    var out = [];
    for (var i = 0; i < CITIES.length; i++) {
      var c = CITIES[i], f = fmt(c[1]), card = grid.children[i];
      put(card.querySelector('.wc-mark'), f ? (f.night ? '🌙' : '☀️') : '');
      put(card.querySelector('.wc-time'), f ? f.time : '—');
      put(card.querySelector('.wc-date'), f ? f.date : '无效时区');
      out.push(c[0] + '  ' + (f ? f.time + ' ' + f.date : '无效时区'));
    }
    document.getElementById('allOut').value = out.join('\n');
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
