/* 批量工具页共享小工具：选择器、格式化、复制、下载。无网络请求。 */
window.TK = (function () {
  'use strict';
  function $(sel, root) { return (root || document).querySelector(sel); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmt(n, digits) {
    if (!isFinite(n)) return '—';
    return n.toLocaleString('zh-CN', { maximumFractionDigits: digits == null ? 2 : digits });
  }
  function copyBtn(btn) {
    btn.addEventListener('click', function () {
      var target = btn.dataset.copyTarget ? document.querySelector(btn.dataset.copyTarget) : null;
      if (!target) return;
      var text = target.value != null ? target.value : target.textContent;
      navigator.clipboard.writeText(text || '').then(function () {
        var old = btn.textContent;
        btn.textContent = '已复制';
        setTimeout(function () { btn.textContent = old; }, 1200);
      });
    });
  }
  function downloadBlob(name, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function download(name, text) {
    downloadBlob(name, new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' }));
  }
  return { $: $, all: all, esc: esc, fmt: fmt, bindCopy: copyBtn, download: download, downloadBlob: downloadBlob };
})();
