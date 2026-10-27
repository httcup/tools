(function () {
  'use strict';
  var LATIN = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
  var ZH = '在设计文字排版时经常需要一些临时文本用来查看版式效果占位字符本身没有含义重点在于长短和节奏好的占位文本能帮你快速判断字号行距与栏宽是否合适'.split('');
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function sentence(lang, min, max) {
    var n = min + Math.floor(Math.random() * (max - min + 1));
    var words = [];
    if (lang === 'latin') { for (var i = 0; i < n; i++) words.push(pick(LATIN)); var s = words.join(' '); return s[0].toUpperCase() + s.slice(1) + '.'; }
    for (var j = 0; j < n; j++) words.push(pick(ZH));
    return words.join('') + '。';
  }
  function gen() {
    var paras = Math.min(20, Math.max(1, parseInt(document.getElementById('lParas').value) || 3));
    var sent = Math.min(20, Math.max(1, parseInt(document.getElementById('lSent').value) || 4));
    var lang = document.getElementById('lLang').value;
    var out = [];
    for (var p = 0; p < paras; p++) {
      var ss = [];
      for (var q = 0; q < sent; q++) ss.push(sentence(lang, 6, 14));
      out.push(ss.join(lang === 'latin' ? ' ' : ''));
    }
    var text = out.join('\n\n');
    document.getElementById('lOut').value = text;
    document.getElementById('lStats').textContent = text.length + ' 字符';
  }
  document.getElementById('lGen').addEventListener('click', gen);
  gen();
})();
