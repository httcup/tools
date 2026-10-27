(function () {
  'use strict';
  var KEEP = { p: [], h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], strong: [], b: [], em: [], i: [], u: [], s: [],
    ul: [], ol: [], li: [], blockquote: [], hr: [], br: [], div: [] };
  var ATTRS = {};
  function cleanNode(node, doc, opts) {
    if (node.nodeType === 3) return doc.createTextNode(node.nodeValue);
    if (node.nodeType !== 1) return null;
    var tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object' || tag === 'embed') return null;
    if (tag === 'span' || tag === 'font' || tag === 'section' || tag === 'article') {
      var frag = doc.createDocumentFragment();
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        var out = cleanNode(c, doc, opts);
        if (out) frag.appendChild(out);
      });
      return frag;
    }
    var allow = KEEP[tag] !== undefined;
    if (!allow && tag === 'a' && opts.links) allow = true;
    if (!allow && tag === 'img' && opts.imgs) allow = true;
    if (!allow && /^t[drh]$/.test(tag) && opts.table) allow = true;
    if (!allow && (tag === 'table' || tag === 'thead' || tag === 'tbody') && opts.table) allow = true;
    if (!allow) {
      var frag2 = doc.createDocumentFragment();
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        var out = cleanNode(c, doc, opts);
        if (out) frag2.appendChild(out);
      });
      return frag2;
    }
    var el = doc.createElement(tag);
    var ok = ATTRS[tag] || [];
    Array.prototype.slice.call(node.attributes).forEach(function (a) {
      if (ok.indexOf(a.name) >= 0 && String(a.value).indexOf('javascript:') !== 0) el.setAttribute(a.name, a.value);
    });
    if (tag === 'a' && el.getAttribute('href') && opts.nofollow !== false) el.setAttribute('rel', 'noopener');
    Array.prototype.slice.call(node.childNodes).forEach(function (c) {
      var out = cleanNode(c, doc, opts);
      if (out) el.appendChild(out);
    });
    return el;
  }
  function run() {
    var src = document.getElementById('htmlIn').value;
    var out = document.getElementById('htmlOut');
    if (!src.trim()) { out.value = ''; document.getElementById('outStats').textContent = ''; return; }
    document.getElementById('inStats').textContent = src.length + ' 字符';
    var doc = new DOMParser().parseFromString('<div id="root">' + src + '</div>', 'text/html');
    var root = doc.getElementById('root');
    var opts = { imgs: document.getElementById('optKeepImg').checked,
      links: document.getElementById('optKeepLinks').checked,
      table: document.getElementById('optKeepTable').checked };
    var frag = doc.createDocumentFragment();
    Array.prototype.slice.call(root.childNodes).forEach(function (c) {
      var o = cleanNode(c, doc, opts);
      if (o) frag.appendChild(o);
    });
    var tmp = doc.createElement('div');
    tmp.appendChild(frag);
    var html = tmp.innerHTML.replace(/\n\s*\n/g, '\n');
    out.value = html;
    document.getElementById('outStats').textContent = html.length + ' 字符（原 ' + src.length + '）';
  }
  document.getElementById('runBtn').addEventListener('click', run);
  document.getElementById('htmlIn').addEventListener('input', run);
  run();
})();
