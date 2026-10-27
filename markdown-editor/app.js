(function () {
  'use strict';
  var ta = document.getElementById('mdIn');
  var out = document.getElementById('mdOut');
  function render() {
    try {
      if (window.AITW && AITW.parseMarkdown && AITW.renderPreview) {
        out.innerHTML = AITW.renderPreview(AITW.parseMarkdown(ta.value).blocks);
      } else {
        out.innerHTML = '<pre style="white-space:pre-wrap">' + TK.esc(ta.value) + '</pre>';
      }
    } catch (e) { out.innerHTML = '<p class="neg">解析出错：' + TK.esc(String(e)) + '</p>'; }
  }
  ta.addEventListener('input', render);
  render();
})();
