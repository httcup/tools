(function () {
  'use strict';
  var E = [];
  function add(cat, arr) { arr.forEach(function (p) { E.push({ c: p[0], k: p[1], g: cat }); }); }
  add('笑脸', [['😀','笑 高兴'],['😂','笑哭'],['🥰','喜欢 恋爱'],['😎','酷 墨镜'],['😭','大哭'],['🤔','思考'],['😴','睡'],['🤯','爆炸 头'],['🥳','庆祝 派对'],['😤','生气 哼'],['🤝','合作'],['🙏','感谢 拜'],['👍','赞 好'],['👏','鼓掌'],['💪','加油 强']]);
  add('爱心', [['❤️','红心 爱'],['🧡','橙心'],['💛','黄心'],['💚','绿心'],['💙','蓝心'],['💜','紫心'],['🖤','黑心'],['💔','心碎 分手'],['💕','爱心 粉'],['💖','闪亮 心'],['💯','满分 一百'],['✨','闪光 亮'],['🔥','火 热门'],['⭐','星 五角'],['🌈','彩虹']]);
  add('食物', [['🍎','苹果'],['🍕','披萨'],['🍔','汉堡'],['🍜','面 拉面'],['🍚','米饭'],['🍣','寿司'],['🍦','冰淇淋'],['🎂','蛋糕 生日'],['☕','咖啡'],['🍺','啤酒'],['🍉','西瓜'],['🍓','草莓'],['🥟','饺子'],['🍖','肉'],['🥗','沙拉']]);
  add('动物', [['🐱','猫'],['🐶','狗'],['🐼','熊猫'],['🦊','狐狸'],['🐰','兔子'],['🐻','熊'],['🐯','虎'],['🦁','狮子'],['🐮','牛'],['🐷','猪'],['🐸','青蛙'],['🐧','企鹅'],['🦄','独角兽'],['🐢','龟'],['🐙','章鱼']]);
  add('天气与出行', [['☀️','晴 太阳'],['⛅','多云'],['🌧️','雨'],['⛈️','雷雨'],['❄️','雪 冷'],['🌪️','龙卷风'],['🌊','浪 海'],['✈️','飞机 旅行'],['🚗','汽车'],['🚄','高铁'],['🚲','自行车'],['🏝️','岛 度假'],['🌋','火山'],['🌙','月亮 夜'],['🌤️','晴间多云']]);
  add('物品与活动', [['⚽','足球'],['🏀','篮球'],['🎮','游戏'],['🎧','耳机 音乐'],['📷','拍照'],['💻','电脑'],['📱','手机'],['💡','想法 点子'],['📚','书 学习'],['✏️','写 笔'],['🎁','礼物'],['🏆','奖 第一'],['⏰','闹钟 时间'],['💰','钱 红包'],['🎉','庆祝 派对']]);
  var grid = document.getElementById('eGrid');
  function esc(s) { return TK.esc(s); }
  function render() {
    var q = document.getElementById('eQ').value.trim().toLowerCase();
    var list = q ? E.filter(function (e) { return e.k.indexOf(q) >= 0 || e.c === q || e.g.indexOf(q) >= 0; }) : E;
    document.getElementById('eStats').textContent = list.length + ' 个';
    grid.innerHTML = list.map(function (e) {
      return '<button type="button" title="' + esc(e.k) + '" style="font-size:1.5rem;background:none;border:0;cursor:pointer;padding:0.35rem;border-radius:8px">' + e.c + '</button>';
    }).join('');
  }
  grid.addEventListener('click', function (e) {
    if (e.target.tagName === 'BUTTON' && navigator.clipboard) {
      navigator.clipboard.writeText(e.target.textContent);
      var old = e.target.style.background;
      e.target.style.background = 'color-mix(in srgb, var(--accent) 18%, transparent)';
      setTimeout(function () { e.target.style.background = old; }, 400);
    }
  });
  document.getElementById('eQ').addEventListener('input', render);
  document.getElementById('eLucky').addEventListener('click', function () {
    document.getElementById('eQ').value = E[Math.floor(Math.random() * E.length)].c;
    render();
  });
  render();
})();
