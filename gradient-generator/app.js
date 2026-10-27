(function () {
  'use strict';
  var PRE = [['海洋', '#2b6cb0', '#3bafaf', ''], ['晚霞', '#e05252', '#e8873a', '#e8c547'], ['薰衣草', '#805ad5', '#ed8dbe', ''], ['森林', '#1d5e4e', '#4caf7d', ''], ['极光', '#0f4c5c', '#5fb49c', '#e0f2e9']];
  function css() {
    var c1 = document.getElementById('c1').value, c2 = document.getElementById('c2').value;
    var use3 = document.getElementById('use3').checked;
    var c3 = document.getElementById('c3').value;
    var stops = use3 ? c1 + ', ' + c2 + ', ' + c3 : c1 + ', ' + c2;
    if (document.getElementById('type').value === 'radial') return 'radial-gradient(circle at 50% 50%, ' + stops + ')';
    return 'linear-gradient(' + (document.getElementById('ang').value || 135) + 'deg, ' + stops + ')';
  }
  function render() {
    var v = css();
    document.getElementById('preview').style.background = v;
    document.getElementById('gOut').value = 'background: ' + v + ';';
  }
  ['type', 'ang', 'c1', 'c2', 'c3', 'use3'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
  });
  document.getElementById('presets').innerHTML = PRE.map(function (p, i) {
    var bg = p[3] ? 'linear-gradient(135deg,' + p[1] + ',' + p[2] + ',' + p[3] + ')' : 'linear-gradient(135deg,' + p[1] + ',' + p[2] + ')';
    return '<button type="button" data-i="' + i + '" style="width:3rem;height:2.2rem;border-radius:7px;border:1px solid var(--border);cursor:pointer;background:' + bg + '"></button>';
  }).join('');
  document.getElementById('presets').addEventListener('click', function (e) {
    var b = e.target.closest('[data-i]');
    if (!b) return;
    var p = PRE[+b.dataset.i];
    document.getElementById('c1').value = p[1];
    document.getElementById('c2').value = p[2];
    document.getElementById('c3').value = p[3] || '#ffffff';
    document.getElementById('use3').checked = !!p[3];
    render();
  });
  render();
})();
