(function () {
  'use strict';
  var cards = [];
  try { cards = JSON.parse(localStorage.getItem('tk-flashcards') || '[]'); } catch (e) {}
  var deck = [], idx = 0, flipped = false;
  function save() { try { localStorage.setItem('tk-flashcards', JSON.stringify(cards)); } catch (e) {} updateStats(); }
  function updateStats() { document.getElementById('stats').textContent = cards.length + ' 张卡片'; }
  document.getElementById('addBtn').addEventListener('click', function () {
    var f = document.getElementById('front').value.trim(), b = document.getElementById('back').value.trim();
    if (!f || !b) return;
    cards.push({ f: f, b: b });
    save();
    document.getElementById('front').value = '';
    document.getElementById('back').value = '';
    document.getElementById('front').focus();
  });
  document.getElementById('studyBtn').addEventListener('click', function () {
    if (!cards.length) return;
    deck = cards.map(function (c, i) { return i; }).sort(function () { return Math.random() - 0.5; });
    idx = 0;
    document.getElementById('studyCard').hidden = false;
    show();
  });
  function show() {
    if (idx >= deck.length) {
      document.getElementById('side').textContent = '本轮完成 🎉';
      document.querySelector('#card .stats').textContent = '点击「开始复习」再来一轮';
      flipped = false;
      return;
    }
    flipped = false;
    document.getElementById('side').textContent = cards[deck[idx]].f;
    document.querySelector('#card .stats').textContent = '点击卡片翻面 · 第 ' + (idx + 1) + ' / ' + deck.length + ' 张';
  }
  document.getElementById('card').addEventListener('click', function () {
    if (idx >= deck.length) return;
    flipped = !flipped;
    document.getElementById('side').textContent = cards[deck[idx]][flipped ? 'b' : 'f'];
    document.querySelector('#card .stats').textContent = flipped ? '记住答案了吗？' : '点击卡片翻面';
  });
  function next(again) {
    if (again) deck.push(deck[idx]);
    idx++;
    show();
  }
  document.getElementById('okBtn').addEventListener('click', function () { next(false); });
  document.getElementById('againBtn').addEventListener('click', function () { next(true); });
  document.getElementById('exportBtn').addEventListener('click', function () {
    TK.download('flashcards.json', JSON.stringify(cards, null, 2));
  });
  document.getElementById('importFile').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var data = JSON.parse(r.result);
        if (Array.isArray(data)) { cards = cards.concat(data.filter(function (c) { return c.f && c.b; })); save(); }
      } catch (err) {}
    };
    r.readAsText(f);
  });
  document.getElementById('clearBtn').addEventListener('click', function () {
    if (!cards.length || !confirm('确定清空全部 ' + cards.length + ' 张卡片？')) return;
    cards = []; save();
    document.getElementById('studyCard').hidden = true;
  });
  updateStats();
})();
