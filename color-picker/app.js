(function () {
  'use strict';
  var cur = { r: 43, g: 108, b: 176 };
  var PAL = { '黑': '#111111', '白': '#FFFFFF', '红': '#E05252', '橙': '#E8873A', '黄': '#E8C547', '绿': '#4CAF7D', '青': '#3BAFAF', '蓝': '#2B6CB0', '紫': '#805AD5', '粉': '#ED8DBE', '灰': '#9AA3AE', '棕': '#9C6B4A' };
  function toHex(c) { return '#' + [c.r, c.g, c.b].map(function (v) { return v.toString(16).padStart(2, '0'); }).join(''); }
  function toHsl(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) {
      var d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; };
    var a = s * Math.min(l, 1 - l);
    var f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
  }
  function render() {
    document.getElementById('swatch').style.background = toHex(cur);
    var hsl = toHsl(cur);
    var lum = (0.2126 * cur.r + 0.7152 * cur.g + 0.0722 * cur.b) / 255;
    var rows = [['HEX', toHex(cur).toUpperCase()], ['RGB', 'rgb(' + cur.r + ', ' + cur.g + ', ' + cur.b + ')'],
                ['HSL', 'hsl(' + hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%)'],
                ['亮度判断', lum > 0.55 ? '浅色（配深色文字）' : '深色（配浅色文字）']];
    document.getElementById('vals').innerHTML = rows.map(function (r) {
      return '<dt>' + r[0] + '</dt><dd class="cp" style="cursor:pointer" data-copy="' + TK.esc(r[1]) + '">' + TK.esc(r[1]) + '</dd>';
    }).join('');
    var shades = document.getElementById('shades');
    shades.innerHTML = [90, 75, 60, 45, 30, 20].map(function (l) {
      var c = hslToRgb(hsl[0], hsl[1], l);
      return '<div class="cp" title="' + toHex(c) + '" data-copy="' + toHex(c) + '" style="flex:1;background:' + toHex(c) + '"></div>';
    }).join('');
    document.getElementById('pallette').innerHTML = Object.keys(PAL).map(function (k) {
      return '<button type="button" data-c="' + PAL[k] + '" style="width:3rem;height:2.4rem;border:1px solid var(--border);border-radius:7px;background:' + PAL[k] + ';cursor:pointer" title="' + k + ' ' + PAL[k] + '"></button>';
    }).join('');
  }
  function setRgb(c) { cur = c; document.getElementById('cIn').value = toHex(c); render(); }
  document.getElementById('cIn').addEventListener('input', function () {
    var v = this.value;
    setRgb({ r: parseInt(v.slice(1, 3), 16), g: parseInt(v.slice(3, 5), 16), b: parseInt(v.slice(5, 7), 16) });
  });
  document.getElementById('pickBtn').addEventListener('click', function () {
    if (!window.EyeDropper) { alert('当前浏览器不支持屏幕取色（需要 Chrome/Edge 111+），可用左侧色板选色。'); return; }
    new EyeDropper().open().then(function (r) {
      var v = r.sRGBHex;
      setRgb({ r: parseInt(v.slice(1, 3), 16), g: parseInt(v.slice(3, 5), 16), b: parseInt(v.slice(5, 7), 16) });
    }).catch(function () {});
  });
  document.body.addEventListener('click', function (e) {
    var el = e.target.closest('[data-copy]');
    if (el && navigator.clipboard) navigator.clipboard.writeText(el.dataset.copy);
    var b = e.target.closest('[data-c]');
    if (b) {
      var v = b.dataset.c;
      setRgb({ r: parseInt(v.slice(1, 3), 16), g: parseInt(v.slice(3, 5), 16), b: parseInt(v.slice(5, 7), 16) });
    }
  });
  render();
})();
