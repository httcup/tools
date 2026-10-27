# -*- coding: utf-8 -*-
"""批量工具定义：来自 takumikit / offbasetools 中与本站不重复的工具，
全部为本仓库原创的纯前端实现（不复制任何第三方代码）。
每个条目：slug / 分类 / 名称 / 卡片描述 / 搜索词 / 图标 / 页面主体 / app.js。
"""

ICONS = {
    "dedupe-lines": '<path d="M4 6h16"/><path d="M4 12h9"/><path d="M4 18h7"/><path d="m14 14 6 6"/><path d="m20 14-6 6"/>',
    "remove-line-breaks": '<path d="M4 5h16"/><path d="M4 10h8"/><path d="m12 8 3 2-3 2"/><path d="M4 19h16"/>',
    "sort-lines": '<path d="M7 4v16"/><path d="m4 17 3 3 3-3"/><path d="M14 6h7"/><path d="M14 11h5"/><path d="M14 16h3"/>',
    "random-picker": '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.1"/><circle cx="15" cy="9" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="9" cy="15" r="1.1"/><circle cx="15" cy="15" r="1.1"/>',
    "bmi": '<path d="M12 21s-7.2-4.7-9.4-9.2A5.5 5.5 0 0 1 12 6.2a5.5 5.5 0 0 1 9.4 5.6C19.2 16.3 12 21 12 21Z"/>',
    "loan": '<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    "percentage": '<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
    "compound-interest": '<path d="M4 20V4"/><path d="M4 20h16"/><path d="m6 15 4-4 3 3 5-6"/><path d="M15 8h3v3"/>',
    "date-diff": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M3 10h18"/><path d="m9 15 2 2 4-4"/>',
    "age": '<rect x="4" y="10" width="16" height="10" rx="1.5"/><path d="M4 14h16"/><path d="M12 10v10"/><path d="M12 8c-1.6-2.8-5.8-2.4-5.8 0 0 1.4 2.9 1.8 5.8 0Z"/><path d="M12 8c1.6-2.8 5.8-2.4 5.8 0 0 1.4-2.9 1.8-5.8 0Z"/>',
    "discount": '<path d="M20.6 13.4 12 22 2 12V4a2 2 0 0 1 2-2h8l8.6 8.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
    "unit-converter": '<path d="M4 8h13"/><path d="m14 4 4 4-4 4"/><path d="M20 16H7"/><path d="m10 12-4 4 4 4"/>',
    "timezone-converter": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/>',
    "text-to-speech": '<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9.5 9.5 0 0 1 0 13"/>',
    "voice-recorder": '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
    "image-format-converter": '<rect x="3" y="5" width="13" height="13" rx="2"/><circle cx="7.5" cy="9.5" r="1.4"/><path d="m3 16 4.5-4.5 3.5 3.5"/><path d="M17 8h4"/><path d="m19 6 2 2-2 2"/>',
}

CAT_CALC = "calc-utility"
CAT_IMAGE = "images"
CAT_TEXT = "text-codes-and-passwords"

TOOLS = [
    # ------------------------------------------------ 文本类
    dict(
        slug="dedupe-lines", cat=CAT_TEXT, icon="dedupe-lines",
        name="删除重复行",
        desc="粘贴名单，重复的行只留一条，可忽略大小写和首尾空格。",
        keys="去重 重复行 名单 列表 unique dedupe",
        long="名单、关键词、导出数据里常有重复行。贴进来立刻去重，保留第一次出现的顺序；要不要忽略大小写、首尾空格、空行，都由你定。",
        body=r"""
<section class="tool-card">
  <div class="card-head"><h2>输入</h2>
    <span class="checks">
      <label class="check"><input type="checkbox" id="ignore-case">忽略大小写</label>
      <label class="check"><input type="checkbox" id="trim" checked>忽略首尾空格</label>
      <label class="check"><input type="checkbox" id="skip-empty" checked>跳过空行</label>
    </span>
  </div>
  <textarea id="in" class="in" rows="9" placeholder="每行一条，粘贴名单、关键词或导出数据…" spellcheck="false"></textarea>
</section>
<section class="tool-card">
  <div class="card-head"><h2>结果</h2><span class="stats" id="stats"></span>
    <span class="acts"><button class="btn btn-ghost" id="copy">复制</button><button class="btn btn-ghost" id="dl">下载 .txt</button></span>
  </div>
  <textarea id="out" class="out" rows="9" readonly></textarea>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  var input=$('#in'), output=$('#out'), stats=$('#stats');

  function run(){
    var lines=input.value.split('\n');
    var ignoreCase=$('#ignore-case').checked;
    var trim=$('#trim').checked;
    var skipEmpty=$('#skip-empty').checked;
    var seen=new Set();
    var out=[];
    var dup=0, blanks=0;
    for(var i=0;i<lines.length;i++){
      var raw=lines[i];
      var key=raw;
      if(trim) key=key.trim();
      if(ignoreCase) key=key.toLowerCase();
      if(!key){ blanks++; if(skipEmpty) continue; if(out.length&&out[out.length-1]==='') continue; out.push(''); continue; }
      if(seen.has(key)){ dup++; continue; }
      seen.add(key);
      out.push(raw);
    }
    output.value=out.join('\n');
    var removed=lines.length-out.length-(skipEmpty?blanks:0);
    stats.textContent='原始 '+lines.length+' 行 · 保留 '+out.length+' 行 · 去掉重复 '+Math.max(0,removed)+' 行'+(skipEmpty&&blanks?' · 跳过空行 '+blanks+' 行':'');
    $('#copy').dataset.copyTarget='#out';
    $('#dl').dataset.name='去重结果.txt';
  }
  input.addEventListener('input', run);
  ['ignore-case','trim','skip-empty'].forEach(function(id){ $('#'+id).addEventListener('change', run); });
  $('#dl').addEventListener('click', function(){ TK.download($('#dl').dataset.name||'去重结果.txt', output.value); });
  TK.bindCopy($('#copy'));
  run();
})();
""",
    ),
    dict(
        slug="remove-line-breaks", cat=CAT_TEXT, icon="remove-line-breaks",
        name="删除换行",
        desc="修掉从 PDF 复制出来的断行，段落结构可以保留。",
        keys="换行 断行 PDF 复制 清理 line breaks",
        long="从 PDF 或聊天记录复制文字，每行都被硬切一刀。贴进来把断行接回去：空行仍然当段落分隔，中文之间不塞空格，英文之间保留空格。",
        body=r"""
<section class="tool-card">
  <div class="card-head"><h2>输入</h2>
    <span class="checks">
      <label class="check"><input type="checkbox" id="para" checked>按空行保留段落</label>
      <label class="check"><input type="checkbox" id="cjk" checked>中文之间不加空格</label>
    </span>
  </div>
  <textarea id="in" class="in" rows="9" placeholder="把从 PDF 复制的文字粘到这里…" spellcheck="false"></textarea>
</section>
<section class="tool-card">
  <div class="card-head"><h2>结果</h2><span class="stats" id="stats"></span>
    <span class="acts"><button class="btn btn-ghost" id="copy">复制</button></span>
  </div>
  <textarea id="out" class="out" rows="9" readonly></textarea>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  var cjk=/[\u2e80-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/;
  function join(a,b,smart){
    if(!smart) return a+' '+b;
    return (cjk.test(a.slice(-1))||cjk.test(b.charAt(0))) ? a+b : a+' '+b;
  }
  function run(){
    var keepPara=$('#para').checked, smart=$('#cjk').checked;
    var lines=input.value.replace(/\r\n?/g,'\n').split('\n');
    var paras=[[]];
    lines.forEach(function(l){ if(l.trim()==='') { if(paras[paras.length-1].length) paras.push([]); } else paras[paras.length-1].push(l.trim()); });
    var text=paras.filter(function(p){return p.length}).map(function(p){
      return p.reduce(function(acc,l){ return acc?join(acc,l,smart):l; },'');
    }).join(keepPara?'\n\n':'\n');
    output.value=text;
    stats.textContent='原始 '+lines.length+' 行 · 整理后 '+text.length+' 字符';
    $('#copy').dataset.copyTarget='#out';
  }
  var input=$('#in'), output=$('#out'), stats=$('#stats');
  input.addEventListener('input', run);
  ['para','cjk'].forEach(function(id){ $('#'+id).addEventListener('change', run); });
  TK.bindCopy($('#copy'));
  run();
})();
""",
    ),
    dict(
        slug="sort-lines", cat=CAT_TEXT, icon="sort-lines",
        name="文本排序",
        desc="按字母、拼音、长度排序，也能反转或随机打乱。",
        keys="排序 拼音 随机 打乱 反转 sort lines",
        long="多行文本按字母 / 拼音升序降序排，或按长度排；数字会按大小而不是字符排（10 排在 9 后面）。也能一键反转、去重或随机打乱。",
        body=r"""
<section class="tool-card">
  <div class="card-head"><h2>输入</h2>
    <span class="checks">
      <select id="mode" class="sel">
        <option value="alpha">字母 / 拼音顺序</option>
        <option value="length">按长度</option>
        <option value="shuffle">随机打乱</option>
        <option value="reverse">倒序（反转）</option>
      </select>
      <select id="dir" class="sel"><option value="asc">升序</option><option value="desc">降序</option></select>
    </span>
  </div>
  <div class="card-head card-sub">
    <span class="checks">
      <label class="check"><input type="checkbox" id="natural" checked>数字按大小</label>
      <label class="check"><input type="checkbox" id="dedupe">顺便去重</label>
      <label class="check"><input type="checkbox" id="skip-empty" checked>跳过空行</label>
    </span>
  </div>
  <textarea id="in" class="in" rows="8" placeholder="每行一条…" spellcheck="false"></textarea>
</section>
<section class="tool-card">
  <div class="card-head"><h2>结果</h2><span class="stats" id="stats"></span>
    <span class="acts"><button class="btn btn-ghost" id="copy">复制</button><button class="btn btn-ghost" id="dl">下载 .txt</button></span>
  </div>
  <textarea id="out" class="out" rows="8" readonly></textarea>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  var collator=new Intl.Collator('zh-Hans-CN',{numeric:true,sensitivity:'base'});
  function run(){
    var lines=$('#in').value.split('\n');
    if($('#skip-empty').checked) lines=lines.filter(function(l){return l.trim()!==''});
    if($('#dedupe').checked){
      var seen=new Set();
      lines=lines.filter(function(l){ var k=l.trim(); if(seen.has(k)) return false; seen.add(k); return true; });
    }
    var mode=$('#mode').value, dir=$('#dir').value==='desc'?-1:1;
    if(mode==='alpha') lines.sort(function(a,b){ return dir*collator.compare(a,b); });
    else if(mode==='length') lines.sort(function(a,b){ return dir*(a.length-b.length||collator.compare(a,b)); });
    else if(mode==='reverse') lines.reverse();
    else if(mode==='shuffle'){
      for(var i=lines.length-1;i>0;i--){
        var buf=new Uint32Array(1); crypto.getRandomValues(buf);
        var j=buf[0]%(i+1);
        var t=lines[i]; lines[i]=lines[j]; lines[j]=t;
      }
    }
    $('#out').value=lines.join('\n');
    $('#stats').textContent=lines.length+' 行';
    $('#copy').dataset.copyTarget='#out';
  }
  ['#in','#mode','#dir','#natural','#dedupe','#skip-empty'].forEach(function(s){ $(s).addEventListener('input', run); $(s).addEventListener('change', run); });
  $('#mode').addEventListener('change', function(){ var shuffle=$('#mode').value==='shuffle'||$('#mode').value==='reverse'; $('#dir').disabled=shuffle; });
  $('#dl').addEventListener('click', function(){ TK.download('排序结果.txt', $('#out').value); });
  TK.bindCopy($('#copy'));
  run();
})();
""",
    ),
    dict(
        slug="random-picker", cat=CAT_TEXT, icon="random-picker",
        name="随机抽签",
        desc="贴名单抽中奖者，加密级随机数，也能整队打乱。",
        keys="抽签 抽奖 随机 名单 分组 抽人 picker shuffle",
        long="粘贴名单（每行一个），填要抽的人数，用 crypto 级随机数公平抽出。也可以把整份名单随机排序，直接当分组依据。",
        body=r"""
<section class="tool-card">
  <div class="card-head"><h2>名单</h2><span class="stats" id="pool-stats"></span></div>
  <textarea id="pool" class="in" rows="8" placeholder="每行一个名字，或用逗号、顿号分隔…" spellcheck="false"></textarea>
  <div class="row">
    <label class="field"><span>抽取人数</span><input type="number" id="count" min="1" value="1"></label>
    <label class="check check-mid"><input type="checkbox" id="unique" checked>不重复</label>
    <button class="btn btn-primary" id="draw">抽签</button>
    <button class="btn" id="shuffle-all">整份打乱</button>
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>结果</h2><span class="stats" id="stats"></span></div>
  <ol id="result" class="result-list"></ol>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  function pool(){
    return $('#pool').value.split(/[\n,，、;；]+/).map(function(s){return s.trim()}).filter(Boolean);
  }
  function randInt(max){
    var buf=new Uint32Array(1);
    var limit=Math.floor(0x100000000/max)*max, v=0;
    do { crypto.getRandomValues(buf); v=buf[0]; } while(v>=limit);
    return v%max;
  }
  function shuffled(list){
    var a=list.slice();
    for(var i=a.length-1;i>0;i--){ var j=randInt(i+1); var t=a[i]; a[i]=a[j]; a[j]=t; }
    return a;
  }
  function refresh(){
    var p=pool();
    $('#pool-stats').textContent=p.length+' 人';
  }
  $('#pool').addEventListener('input', refresh);
  $('#draw').addEventListener('click', function(){
    var p=pool();
    if(!p.length){ $('#stats').textContent='先贴名单'; return; }
    var n=Math.max(1, parseInt($('#count').value,10)||1);
    var unique=$('#unique').checked;
    var picked=[];
    if(unique){
      shuffled(p).slice(0, Math.min(n,p.length)).forEach(function(name){ picked.push(name); });
    } else {
      for(var i=0;i<n;i++) picked.push(p[randInt(p.length)]);
    }
    $('#result').innerHTML=picked.map(function(name,i){ return '<li>'+(i+1)+'. '+TK.esc(name)+'</li>'; }).join('');
    $('#stats').textContent='抽了 '+picked.length+' 人 · 加密级随机';
  });
  $('#shuffle-all').addEventListener('click', function(){
    var s=shuffled(pool());
    $('#pool').value=s.join('\n');
    refresh();
    $('#stats').textContent='已随机打乱顺序';
  });
  refresh();
})();
""",
    ),
    # ------------------------------------------------ 计算与实用
    dict(
        slug="bmi", cat=CAT_CALC, icon="bmi",
        name="BMI 计算器",
        desc="身高体重一填，按中国成人标准给结论与健康体重范围。",
        keys="bmi 体重 身高 健康 肥胖 计算",
        long="按中国成人标准（BMI 18.5–23.9 为正常）判定偏瘦、正常、超重、肥胖，并给出对应的健康体重范围。全程本地计算。",
        body=r"""
<section class="tool-card">
  <div class="row">
    <label class="field"><span>身高（cm）</span><input type="number" id="h" min="80" max="250" step="0.1" placeholder="170"></label>
    <label class="field"><span>体重（kg）</span><input type="number" id="w" min="20" max="300" step="0.1" placeholder="65"></label>
  </div>
</section>
<section class="tool-card" id="res-card" hidden>
  <div class="bmi-top">
    <div><div class="big" id="bmi">—</div><div class="dim">BMI</div></div>
    <div><div class="tag" id="cat">—</div><div class="dim" id="hint"></div></div>
  </div>
  <div class="meter"><i id="marker"></i></div>
  <dl class="kv">
    <dt>健康体重范围</dt><dd id="range">—</dd>
    <dt>判定标准</dt><dd>中国成人标准：偏瘦 &lt;18.5 · 正常 18.5–23.9 · 超重 24–27.9 · 肥胖 ≥28</dd>
  </dl>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  function run(){
    var h=parseFloat($('#h').value)/100, w=parseFloat($('#w').value);
    if(!(h>0.5&&h<2.6&&w>10&&w<400)){ $('#res-card').hidden=true; return; }
    var bmi=w/(h*h);
    $('#res-card').hidden=false;
    $('#bmi').textContent=bmi.toFixed(1);
    var cat,cls;
    if(bmi<18.5){cat='偏瘦';cls='c-low';}
    else if(bmi<24){cat='正常';cls='c-ok';}
    else if(bmi<28){cat='超重';cls='c-warn';}
    else {cat='肥胖';cls='c-bad';}
    var tag=$('#cat'); tag.textContent=cat; tag.className='tag '+cls;
    $('#hint').textContent=bmi<18.5?'比健康范围下限还差 '+(18.5*h*h-w).toFixed(1)+' kg'
      :bmi>=28?'比健康范围上限超出 '+(w-23.9*h*h).toFixed(1)+' kg'
      :bmi>=24?'比健康范围上限超出 '+(w-23.9*h*h).toFixed(1)+' kg':'就在健康范围内';
    $('#range').textContent=TK.fmt(18.5*h*h,1)+' – '+TK.fmt(23.9*h*h,1)+' kg';
    var pct=Math.max(0,Math.min(100,(bmi-14)/(34-14)*100));
    $('#marker').style.left=pct+'%';
  }
  ['#h','#w'].forEach(function(s){ $(s).addEventListener('input', run); });
})();
""",
    ),
    dict(
        slug="loan", cat=CAT_CALC, icon="loan",
        name="房贷计算器",
        desc="等额本息或等额本金，月供、利息总额当场算清。",
        keys="房贷 月供 等额本息 等额本金 利息 贷款",
        long="填贷款金额、年利率和年限，选等额本息或等额本金：月供多少、利息总共多少、总共还多少，全部当场算完，不联网。",
        body=r"""
<section class="tool-card">
  <div class="row">
    <label class="field"><span>贷款金额（万元）</span><input type="number" id="amt" min="1" step="0.1" placeholder="100"></label>
    <label class="field"><span>年利率（%）</span><input type="number" id="rate" min="0.01" step="0.01" placeholder="3.6"></label>
    <label class="field"><span>期限（年）</span><input type="number" id="years" min="1" max="30" step="1" placeholder="30"></label>
    <label class="field"><span>还款方式</span>
      <select id="mode" class="sel"><option value="bx">等额本息</option><option value="bj">等额本金</option></select>
    </label>
  </div>
</section>
<section class="tool-card" id="res" hidden>
  <dl class="kv" id="kv"></dl>
  <p class="note">等额本息每月还款额固定；等额本金每月还的本金固定、利息递减，首月最高、逐月变少。结果为估算，以银行还款计划为准。</p>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  function row(k,v){ return '<dt>'+k+'</dt><dd>'+v+'</dd>'; }
  function run(){
    var P=parseFloat($('#amt').value)*10000;
    var r=parseFloat($('#rate').value)/100/12;
    var n=parseInt($('#years').value,10)*12;
    if(!(P>0&&r>0&&n>0)){ $('#res').hidden=true; return; }
    var kv='';
    if($('#mode').value==='bx'){
      var m=P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
      kv+=row('每月还款','¥ '+TK.fmt(m));
      kv+=row('利息总额','¥ '+TK.fmt(m*n-P));
      kv+=row('还款总额','¥ '+TK.fmt(m*n));
    } else {
      var base=P/n;
      var first=base+P*r;
      var last=base+(P-base*(n-1))*r;
      var total=P*r*(n+1)/2;
      kv+=row('首月还款','¥ '+TK.fmt(first));
      kv+=row('末月还款','¥ '+TK.fmt(last));
      kv+=row('每月递减','¥ '+TK.fmt(base*r));
      kv+=row('利息总额','¥ '+TK.fmt(total));
      kv+=row('还款总额','¥ '+TK.fmt(total+P));
    }
    kv+=row('还款月数',n+' 期');
    $('#kv').innerHTML=kv;
    $('#res').hidden=false;
  }
  ['#amt','#rate','#years','#mode'].forEach(function(s){ $(s).addEventListener('input', run); $(s).addEventListener('change', run); });
})();
""",
    ),
    dict(
        slug="percentage", cat=CAT_CALC, icon="percentage",
        name="百分比计算器",
        desc="占比、求百分之几、增减幅，三种问法都算。",
        keys="百分比 占比 比例 增长率 百分号",
        long="「X 的 15% 是多少」「X 占 Y 的百分之几」「从 X 涨到 Y 涨了多少」——三种最常见的百分比问法，各占一格，填数即出结果。",
        body=r"""
<section class="tool-card">
  <h2>X 的 Y% 是多少</h2>
  <div class="row">
    <input type="number" id="a1" step="any" placeholder="X">
    <span class="mid">的</span>
    <input type="number" id="a2" step="any" placeholder="Y">
    <span class="mid">%</span>
    <strong class="out-inline" id="ra">—</strong>
  </div>
</section>
<section class="tool-card">
  <h2>X 是 Y 的百分之几</h2>
  <div class="row">
    <input type="number" id="b1" step="any" placeholder="X">
    <span class="mid">/</span>
    <input type="number" id="b2" step="any" placeholder="Y">
    <strong class="out-inline" id="rb">—</strong>
  </div>
</section>
<section class="tool-card">
  <h2>从 X 到 Y 变化了多少</h2>
  <div class="row">
    <input type="number" id="c1" step="any" placeholder="X（原值）">
    <span class="mid">→</span>
    <input type="number" id="c2" step="any" placeholder="Y（新值）">
    <strong class="out-inline" id="rc">—</strong>
  </div>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  function num(s){ var v=parseFloat($(s).value); return isFinite(v)?v:null; }
  function show(id,v,suffix){
    var el=$(id);
    el.textContent=v==null?'—':(TK.fmt(v)+ (suffix||''));
    el.classList.toggle('neg', v!=null&&v<0);
  }
  function run(){
    var a1=num('#a1'), a2=num('#a2');
    show('#ra', (a1!=null&&a2!=null)?a1*a2/100:null);
    var b1=num('#b1'), b2=num('#b2');
    show('#rb', (b1!=null&&b2)?b1/b2*100:null, ' %');
    var c1=num('#c1'), c2=num('#c2');
    show('#rc', (c1!=null&&c1!==0&&c2!=null)?(c2-c1)/Math.abs(c1)*100:null, ' %');
  }
  ['#a1','#a2','#b1','#b2','#c1','#c2'].forEach(function(s){ $(s).addEventListener('input', run); });
})();
""",
    ),
    dict(
        slug="compound-interest", cat=CAT_CALC, icon="compound-interest",
        name="复利计算器",
        desc="本金加每月定投，按复利滚到未来值多少。",
        keys="复利 定投 投资 理财 终值 compound",
        long="一次投入加每月定投，按月复利滚存。给未来总值、累计投入和收益，每年一行看得见增长节奏。",
        body=r"""
<section class="tool-card">
  <div class="row">
    <label class="field"><span>期初本金（元）</span><input type="number" id="p" min="0" step="100" placeholder="10000"></label>
    <label class="field"><span>每月定投（元）</span><input type="number" id="pmt" min="0" step="100" placeholder="1000"></label>
    <label class="field"><span>年利率（%）</span><input type="number" id="rate" min="0" step="0.1" placeholder="3"></label>
    <label class="field"><span>年数</span><input type="number" id="years" min="1" max="60" step="1" placeholder="10"></label>
  </div>
</section>
<section class="tool-card" id="res" hidden>
  <dl class="kv" id="kv"></dl>
  <div class="scroll-x"><table class="tbl" id="tbl">
    <thead><tr><th>年末</th><th>累计投入</th><th>账户金额</th><th>其中收益</th></tr></thead>
    <tbody></tbody>
  </table></div>
  <p class="note">按月复利、月末定投估算；收益率为估算，不构成任何投资建议。</p>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  function run(){
    var p=parseFloat($('#p').value)||0;
    var pmt=parseFloat($('#pmt').value)||0;
    var rate=parseFloat($('#rate').value)||0;
    var years=parseInt($('#years').value,10)||0;
    if(years<=0){ $('#res').hidden=true; return; }
    var r=rate/100/12, bal=p, invested=p, rows=[];
    for(var m=1;m<=years*12;m++){
      bal=bal*(1+r)+pmt;
      invested+=pmt;
      if(m%12===0) rows.push([m/12, invested, bal]);
    }
    $('#kv').innerHTML=
      '<dt>期末金额</dt><dd>¥ '+TK.fmt(bal)+'</dd>'+
      '<dt>累计投入</dt><dd>¥ '+TK.fmt(invested)+'</dd>'+
      '<dt>其中收益</dt><dd>¥ '+TK.fmt(bal-invested)+'</dd>'+
      '<dt>收益率</dt><dd>'+(invested>0?TK.fmt((bal-invested)/invested*100):'0')+'%</dd>';
    $('#tbl tbody').innerHTML=rows.map(function(row){
      return '<tr><td>'+row[0]+'</td><td>¥ '+TK.fmt(row[1])+'</td><td>¥ '+TK.fmt(row[2])+'</td><td>¥ '+TK.fmt(row[2]-row[1])+'</td></tr>';
    }).join('');
    $('#res').hidden=false;
  }
  ['#p','#pmt','#rate','#years'].forEach(function(s){ $(s).addEventListener('input', run); });
})();
""",
    ),
    dict(
        slug="date-diff", cat=CAT_CALC, icon="date-diff",
        name="日期天数计算",
        desc="两个日期差几天、几周、几个工作日。",
        keys="日期 天数 工作日 倒计时 间隔",
        long="选两个日期：相差多少天、合几周几天、其中多少个工作日（周一到周五），起止各是星期几，一次算清。",
        body=r"""
<section class="tool-card">
  <div class="row">
    <label class="field"><span>开始日期</span><input type="date" id="d1"></label>
    <label class="field"><span>结束日期</span><input type="date" id="d2"></label>
  </div>
</section>
<section class="tool-card" id="res" hidden>
  <dl class="kv" id="kv"></dl>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  var WD=['日','一','二','三','四','五','六'];
  function parse(s){ var p=s.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
  function midnight(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
  function run(){
    var v1=$('#d1').value, v2=$('#d2').value;
    if(!v1||!v2){ $('#res').hidden=true; return; }
    var a=parse(v1), b=parse(v2);
    if(b<a){ var t=a; a=b; b=t; }
    var days=Math.round((midnight(b)-midnight(a))/86400000);
    var work=0;
    var cur=new Date(a);
    for(var i=0;i<days;i++){ cur.setDate(cur.getDate()+1); var w=cur.getDay(); if(w!==0&&w!==6) work++; }
    $('#kv').innerHTML=
      '<dt>相差天数</dt><dd>'+days+' 天</dd>'+
      '<dt>合几周</dt><dd>'+Math.floor(days/7)+' 周'+(days%7?' 又 '+(days%7)+' 天':'整')+'</dd>'+
      '<dt>其中工作日</dt><dd>'+work+' 天（周末 '+(days-work)+' 天）</dd>'+
      '<dt>开始那天</dt><dd>星期'+WD[a.getDay()]+'</dd>'+
      '<dt>结束那天</dt><dd>星期'+WD[b.getDay()]+'</dd>';
    $('#res').hidden=false;
  }
  ['#d1','#d2'].forEach(function(s){ $(s).addEventListener('input', run); $(s).addEventListener('change', run); });
  var today=new Date();
  $('#d1').value=today.toISOString().slice(0,10);
  run();
})();
""",
    ),
    dict(
        slug="age", cat=CAT_CALC, icon="age",
        name="年龄计算器",
        desc="生日填进去：精确周岁、活了多少天、生日倒计时。",
        keys="年龄 周岁 生日 天数 倒计时",
        long="输入生日算精确周岁（几年几月几天）、已经活过的总天数，以及下次生日还有多少天、是星期几。",
        body=r"""
<section class="tool-card">
  <label class="field"><span>生日</span><input type="date" id="b"></label>
</section>
<section class="tool-card" id="res" hidden>
  <dl class="kv" id="kv"></dl>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  var WD=['日','一','二','三','四','五','六'];
  function run(){
    var v=$('#b').value;
    if(!v){ $('#res').hidden=true; return; }
    var p=v.split('-');
    var birth=new Date(+p[0],+p[1]-1,+p[2]);
    var now=new Date();
    var t=now; now=new Date(t.getFullYear(),t.getMonth(),t.getDate());
    if(birth>now){ $('#kv').innerHTML='<dt>—</dt><dd>这个日子在将来</dd>'; $('#res').hidden=false; return; }
    var y=now.getFullYear()-birth.getFullYear();
    var m=now.getMonth()-birth.getMonth();
    var d=now.getDate()-birth.getDate();
    if(d<0){ m--; d+=new Date(now.getFullYear(),now.getMonth(),0).getDate(); }
    if(m<0){ y--; m+=12; }
    var totalDays=Math.floor((now-birth)/86400000);
    var next=new Date(now.getFullYear(),birth.getMonth(),birth.getDate());
    if(next<now) next.setFullYear(next.getFullYear()+1);
    var left=Math.round((next-now)/86400000);
    var isToday=now.getMonth()===birth.getMonth()&&now.getDate()===birth.getDate();
    $('#kv').innerHTML=
      '<dt>周岁</dt><dd>'+(y>0?y+' 岁 ':'')+m+' 个月'+(d?' 零 '+d+' 天':'')+'</dd>'+
      '<dt>已经活了</dt><dd>'+TK.fmt(totalDays,0)+' 天</dd>'+
      '<dt>下次生日</dt><dd>'+(isToday?'就是今天，生日快乐 🎂':left+' 天后（星期'+WD[next.getDay()]+'）')+'</dd>'+
      '<dt>出生那天</dt><dd>星期'+WD[birth.getDay()]+'</dd>';
    $('#res').hidden=false;
  }
  $('#b').addEventListener('input', run);
  $('#b').addEventListener('change', run);
})();
""",
    ),
    dict(
        slug="discount", cat=CAT_CALC, icon="discount",
        name="打折计算器",
        desc="「打 7.5 折」和「25% OFF」都认，折后价立省多少一秒出。",
        keys="打折 折扣 优惠 满减 off 价格",
        long="支持两种说法：「打 X 折」直接填 7.5；「% OFF」切换后填 25。原价一填，折后价和省下的钱立刻出来。",
        body=r"""
<section class="tool-card">
  <div class="row">
    <label class="field"><span>原价（元）</span><input type="number" id="price" min="0" step="0.01" placeholder="399"></label>
    <label class="field"><span>方式</span>
      <select id="mode" class="sel"><option value="zhe">打 X 折</option><option value="off">X% OFF</option></select>
    </label>
    <label class="field"><span id="vlabel">折扣（7.5 = 七五折）</span><input type="number" id="v" min="0" max="99" step="0.1" placeholder="7.5"></label>
  </div>
</section>
<section class="tool-card" id="res" hidden>
  <dl class="kv" id="kv"></dl>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  function run(){
    var price=parseFloat($('#price').value);
    var v=parseFloat($('#v').value);
    if(!(price>0)||!(v>=0)){ $('#res').hidden=true; return; }
    var pay, label;
    if($('#mode').value==='zhe'){
      if(v<=0||v>99){ $('#res').hidden=true; return; }
      pay=price*v/10; label=v+' 折';
    } else {
      if(v<0||v>=100){ $('#res').hidden=true; return; }
      pay=price*(1-v/100); label=v+'% OFF';
    }
    $('#kv').innerHTML=
      '<dt>折后应付</dt><dd class="pos">¥ '+TK.fmt(pay)+'</dd>'+
      '<dt>立省</dt><dd>¥ '+TK.fmt(price-pay)+'（'+label+'）</dd>';
    $('#res').hidden=false;
  }
  $('#mode').addEventListener('change', function(){
    $('#vlabel').textContent=$('#mode').value==='zhe'?'折扣（7.5 = 七五折）':'优惠（25 = 25% OFF）';
    $('#v').placeholder=$('#mode').value==='zhe'?'7.5':'25';
    run();
  });
  ['#price','#v'].forEach(function(s){ $(s).addEventListener('input', run); });
})();
""",
    ),
    dict(
        slug="unit-converter", cat=CAT_CALC, icon="unit-converter",
        name="单位换算",
        desc="长度、重量、温度、面积、数据体积，一个页面换完。",
        keys="单位 换算 长度 重量 温度 数据 面积 英寸 磅",
        long="长度、重量、温度、面积、数据体积五类常用单位，选类别填数字，所有单位的结果一起出来；温度换算单独处理，不是简单乘系数。",
        body=r"""
<section class="tool-card">
  <div class="row">
    <label class="field"><span>类别</span>
      <select id="cat" class="sel">
        <option value="len">长度</option><option value="weight">重量</option>
        <option value="temp">温度</option><option value="area">面积</option>
        <option value="data">数据体积</option>
      </select>
    </label>
    <label class="field"><span>数值</span><input type="number" id="v" step="any" value="1"></label>
    <label class="field"><span>从</span><select id="from" class="sel"></select></label>
    <label class="field"><span>到</span><select id="to" class="sel"></select></label>
  </div>
  <div class="big" id="result">—</div>
  <div class="scroll-x"><table class="tbl"><thead><tr><th>单位</th><th>结果</th></tr></thead><tbody id="all"></tbody></table></div>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  var DATA={
    len:{name:'长度',units:{'毫米 mm':0.001,'厘米 cm':0.01,'米 m':1,'千米 km':1000,'英寸 in':0.0254,'英尺 ft':0.3048,'英里 mi':1609.344,'里（市里）':500}},
    weight:{name:'重量',units:{'克 g':0.001,'千克 kg':1,'吨 t':1000,'盎司 oz':0.0283495231,'磅 lb':0.45359237,'斤（市斤）':0.5,'两':0.05}},
    area:{name:'面积',units:{'平方米 m²':1,'平方公里 km²':1000000,'公顷 ha':10000,'亩':666.6667,'平方英尺 ft²':0.09290304,'坪':3.305785124}},
    data:{name:'数据体积',units:{'B':1,'KB':1024,'MB':1048576,'GB':1073741824,'TB':1099511627776}},
    temp:{name:'温度',units:{'摄氏度 °C':'C','华氏度 °F':'F','开尔文 K':'K'}}
  };
  function toC(v,u){ if(u==='C')return v; if(u==='F')return (v-32)*5/9; return v-273.15; }
  function fromC(v,u){ if(u==='C')return v; if(u==='F')return v*9/5+32; return v+273.15; }
  function convert(v,from,to){
    if(DATA.current==='temp') return fromC(toC(v,from),to);
    return v*DATA[DATA.current].units[from]/DATA[DATA.current].units[to];
  }
  function fill(){
    var cat=$('#cat').value; DATA.current=cat;
    var units=Object.keys(DATA[cat].units);
    $('#from').innerHTML=units.map(function(u){return '<option>'+u+'</option>'}).join('');
    $('#to').innerHTML=units.map(function(u){return '<option>'+u+'</option>'}).join('');
    $('#to').selectedIndex=Math.min(1,units.length-1);
  }
  function run(){
    var v=parseFloat($('#v').value);
    if(!isFinite(v)){ $('#result').textContent='—'; $('#all').innerHTML=''; return; }
    var from=$('#from').value, to=$('#to').value;
    $('#result').textContent=TK.fmt(convert(v,from,to),8)+' '+to;
    $('#all').innerHTML=Object.keys(DATA[DATA.current].units).map(function(u){
      return '<tr><td>'+u+'</td><td>'+TK.fmt(convert(v,from,u),8)+'</td></tr>';
    }).join('');
  }
  $('#cat').addEventListener('change', function(){ fill(); run(); });
  ['#v','#from','#to'].forEach(function(s){ $(s).addEventListener('input', run); $(s).addEventListener('change', run); });
  fill(); run();
})();
""",
    ),
    dict(
        slug="timezone-converter", cat=CAT_CALC, icon="timezone-converter",
        name="时区换算",
        desc="填一个时间，常用时区的对应时间一次排开。",
        keys="时区 时间 换算 utc 北京 纽约 伦敦 东京",
        long="填日期时间、选来源时区，下面把常用时区的对应时间一次排开，按与来源的时差排序。用浏览器内置的时区数据库计算，夏令时自动处理。",
        body=r"""
<section class="tool-card">
  <div class="row">
    <label class="field"><span>日期和时间</span><input type="datetime-local" id="t"></label>
    <label class="field"><span>这是哪个时区的时间</span><select id="from" class="sel"></select></label>
  </div>
</section>
<section class="tool-card">
  <div class="scroll-x"><table class="tbl" id="tbl">
    <thead><tr><th>时区</th><th>对应时间</th><th>时差</th></tr></thead>
    <tbody></tbody>
  </table></div>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  var ZONES=[
    ['Asia/Shanghai','中国北京'], ['Asia/Hong_Kong','中国香港'], ['Asia/Taipei','中国台北'],
    ['Asia/Tokyo','日本东京'], ['Asia/Seoul','韩国首尔'], ['Asia/Singapore','新加坡'],
    ['Asia/Dubai','迪拜'], ['Asia/Bangkok','泰国曼谷'], ['Europe/Moscow','俄罗斯莫斯科'],
    ['Europe/London','英国伦敦'], ['Europe/Paris','法国巴黎'], ['Europe/Berlin','德国柏林'],
    ['America/New_York','美国纽约'], ['America/Chicago','美国芝加哥'], ['America/Los_Angeles','美国洛杉矶'],
    ['Australia/Sydney','澳大利亚悉尼'], ['Pacific/Auckland','新西兰奥克兰'], ['UTC','UTC']
  ];
  function parts(ts, zone){
    var f=new Intl.DateTimeFormat('zh-CN',{timeZone:zone,hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
    var map={};
    f.formatToParts(new Date(ts)).forEach(function(p){ map[p.type]=p.value; });
    if(map.hour==='24') map.hour='00';
    return map;
  }
  function offsetMin(ts, zone){
    var m=parts(ts,zone);
    var asUTC=Date.UTC(+m.year,+m.month-1,+m.day,+m.hour,+m.minute,0);
    return Math.round((asUTC-ts)/60000);
  }
  function zonedToTs(wall, zone){
    var asUTC=Date.parse(wall+':00Z');
    var ts=asUTC;
    for(var i=0;i<2;i++) ts=asUTC-offsetMin(ts,zone)*60000;
    return ts;
  }
  function fmt(ts,zone){
    var m=parts(ts,zone);
    return m.year+'-'+m.month+'-'+m.day+' '+m.hour+':'+m.minute;
  }
  function run(){
    var wall=$('#t').value;
    if(!wall) return;
    var from=$('#from').value;
    var ts=zonedToTs(wall,from);
    var rows=ZONES.map(function(z){
      return {z:z, off:offsetMin(ts,z[0])};
    }).sort(function(a,b){ return a.off-b.off; });
    $('#tbl tbody').innerHTML=rows.map(function(r){
      var off=r.off-offsetMin(ts,from);
      var offText=off===0?'同源时区':(off>0?'+':'−')+Math.floor(Math.abs(off)/60)+'小时'+(Math.abs(off)%60?''+(Math.abs(off)%60)+'分':'');
      return '<tr><td>'+r.z[1]+'<span class="dim2">'+r.z[0]+'</span></td><td class="mono">'+fmt(ts,r.z[0])+'</td><td>'+offText+'</td></tr>';
    }).join('');
  }
  var opts=ZONES.map(function(z){ return '<option value="'+z[0]+'">'+z[1]+'</option>'; }).join('');
  $('#from').innerHTML=opts;
  try{
    var local=Intl.DateTimeFormat().resolvedOptions().timeZone;
    if(ZONES.some(function(z){return z[0]===local})) $('#from').value=local;
  }catch(e){}
  var now=new Date();
  $('#t').value=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
  ['#t','#from'].forEach(function(s){ $(s).addEventListener('input', run); $(s).addEventListener('change', run); });
  run();
})();
""",
    ),
    dict(
        slug="text-to-speech", cat=CAT_CALC, icon="text-to-speech",
        name="文字转语音",
        desc="用系统自带语音朗读文本，调语速音调，中文英文都行。",
        keys="tts 朗读 语音 文字转语音 语音合成 配音",
        long="输入文字，选系统里装好的语音（中文、英文、日文都有），调语速和音调后播放。用浏览器自带的语音合成能力，文本不离开这台设备。能否导出音频取决于系统，页面提供的是播放。",
        body=r"""
<section class="tool-card">
  <textarea id="text" class="in" rows="7" placeholder="输入要朗读的文字…" spellcheck="false"></textarea>
  <div class="row">
    <label class="field"><span>语音</span><select id="voice" class="sel"></select></label>
    <label class="field"><span>语速 <b id="rv">1.0</b></span><input type="range" id="rate" min="0.5" max="2" step="0.1" value="1"></label>
    <label class="field"><span>音调 <b id="pv">1.0</b></span><input type="range" id="pitch" min="0.5" max="2" step="0.1" value="1"></label>
  </div>
  <div class="row">
    <button class="btn btn-primary" id="play">▶ 播放</button>
    <button class="btn" id="pause">⏸ 暂停</button>
    <button class="btn" id="stop">⏹ 停止</button>
    <span class="stats" id="stats"></span>
  </div>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  var synth=window.speechSynthesis;
  if(!synth){ $('#stats').textContent='这个浏览器不支持语音合成'; $('#play').disabled=true; return; }
  var voices=[];
  function load(){
    voices=synth.getVoices();
    if(!voices.length) return;
    var sorted=voices.slice().sort(function(a,b){
      var pa=/^zh/i.test(a.lang)?0:1, pb=/^zh/i.test(b.lang)?0:1;
      return pa-pb||a.lang.localeCompare(b.lang);
    });
    $('#voice').innerHTML=sorted.map(function(v,i){
      return '<option value="'+i+'">'+v.name+'（'+v.lang+'）</option>';
    }).join('');
    $('#stats').textContent='找到 '+voices.length+' 个系统语音';
  }
  load();
  synth.onvoiceschanged=load;
  $('#rate').addEventListener('input', function(){ $('#rv').textContent=parseFloat($('#rate').value).toFixed(1); });
  $('#pitch').addEventListener('input', function(){ $('#pv').textContent=parseFloat($('#pitch').value).toFixed(1); });
  $('#play').addEventListener('click', function(){
    synth.cancel();
    var u=new SpeechSynthesisUtterance($('#text').value||'请先输入文字');
    var v=voices[parseInt($('#voice').value,10)];
    if(v) u.voice=v;
    u.rate=parseFloat($('#rate').value);
    u.pitch=parseFloat($('#pitch').value);
    u.onend=function(){ $('#stats').textContent='读完了'; };
    $('#stats').textContent='正在朗读…';
    synth.speak(u);
  });
  $('#pause').addEventListener('click', function(){
    if(synth.speaking&&!synth.paused){ synth.pause(); $('#stats').textContent='已暂停'; }
    else if(synth.paused){ synth.resume(); $('#stats').textContent='继续朗读…'; }
  });
  $('#stop').addEventListener('click', function(){ synth.cancel(); $('#stats').textContent='已停止'; });
})();
""",
    ),
    dict(
        slug="voice-recorder", cat=CAT_CALC, icon="voice-recorder",
        name="在线录音",
        desc="浏览器直接录音，录完试听、下载，不经过服务器。",
        keys="录音 麦克风 录音机 voice recorder audio",
        long="点开始、授权麦克风，直接在浏览器里录音，录完试听并下载。音频只存在于这个页面里，关闭即消失。首次使用会请求麦克风权限。",
        body=r"""
<section class="tool-card">
  <div class="row">
    <button class="btn btn-primary" id="toggle">● 开始录音</button>
    <span class="big" id="timer">00:00</span>
    <span class="stats" id="stats">麦克风默认不开启，点开始才会请求授权。</span>
  </div>
  <div id="player" hidden>
    <audio id="audio" controls></audio>
    <div class="row"><a class="btn btn-primary" id="dl" download="录音.webm">下载录音</a></div>
  </div>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  var recorder=null, chunks=[], timer=null, seconds=0, stream=null;
  function tick(){
    seconds++;
    var m=String(Math.floor(seconds/60)).padStart(2,'0');
    var s=String(seconds%60).padStart(2,'0');
    $('#timer').textContent=m+':'+s;
  }
  $('#toggle').addEventListener('click', function(){
    if(recorder&&recorder.state==='recording'){
      recorder.stop();
      return;
    }
    if(!navigator.mediaDevices||!window.MediaRecorder){
      $('#stats').textContent='这个浏览器不支持录音（MediaRecorder 不可用）';
      return;
    }
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){
      stream=s;
      chunks=[];
      var mime=MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':(MediaRecorder.isTypeSupported('audio/mp4')?'audio/mp4':'');
      recorder=mime?new MediaRecorder(s,{mimeType:mime}):new MediaRecorder(s);
      recorder.ondataavailable=function(e){ if(e.data.size) chunks.push(e.data); };
      recorder.onstop=function(){
        stream.getTracks().forEach(function(t){t.stop()});
        clearInterval(timer);
        $('#toggle').textContent='● 开始录音';
        $('#toggle').classList.add('btn-primary');
        var blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});
        var url=URL.createObjectURL(blob);
        $('#audio').src=url;
        var ext=/mp4/.test(recorder.mimeType||'')?'m4a':'webm';
        var dl=$('#dl'); dl.href=url; dl.download='录音.'+ext;
        $('#player').hidden=false;
        $('#stats').textContent='录了 '+seconds+' 秒 · '+Math.round(blob.size/1024)+' KB';
      };
      recorder.start();
      seconds=0; $('#timer').textContent='00:00';
      timer=setInterval(tick,1000);
      $('#toggle').textContent='■ 停止录音';
      $('#toggle').classList.remove('btn-primary');
      $('#stats').textContent='录音中…';
    }).catch(function(err){
      $('#stats').textContent='拿不到麦克风：'+(err&&err.name==='NotAllowedError'?'授权被拒绝':'设备不可用');
    });
  });
})();
""",
    ),
    dict(
        slug="image-format-converter", cat=CAT_IMAGE, icon="image-format-converter",
        name="图片格式转换",
        desc="JPG、PNG、WebP 互转，批量处理，透明背景可选填色。",
        keys="图片 转换 jpg png webp 格式 converter",
        long="JPG、PNG、WebP 互相转换，可一次拖多张。转 JPG 时透明背景自动填白（可换色），转 WebP 可调质量压体积。全部用画布在本机转，原图不上传。",
        body=r"""
<section class="tool-card">
  <div class="drop" id="drop">
    <p><strong>把图片拖到这里</strong>，或</p>
    <label class="btn btn-primary" for="files">选择图片</label>
    <input type="file" id="files" accept="image/*" multiple hidden>
    <p class="dim">支持多选。JPG / PNG / WebP / GIF 首帧 / BMP</p>
  </div>
  <div class="row">
    <label class="field"><span>目标格式</span>
      <select id="fmt" class="sel">
        <option value="image/jpeg">JPG</option>
        <option value="image/png">PNG</option>
        <option value="image/webp">WebP</option>
      </select>
    </label>
    <label class="field" id="q-field"><span>质量 <b id="qv">85</b>%</span><input type="range" id="q" min="10" max="100" value="85"></label>
    <label class="field" id="bg-field"><span>透明底填充</span><input type="color" id="bg" value="#ffffff"></label>
  </div>
</section>
<section class="tool-card" id="res" hidden>
  <div class="card-head"><h2>转换结果</h2>
    <span class="acts"><button class="btn btn-ghost" id="dl-all">逐个下载全部</button></span>
  </div>
  <ul class="files" id="list"></ul>
</section>
""",
        js=r"""
(function(){
  var $=TK.$;
  var queue=[];
  function fmtName(){ return {'image/jpeg':'JPG','image/png':'PNG','image/webp':'WebP'}[$('#fmt').value]; }
  function ext(){ return {'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[$('#fmt').value]; }
  function syncUI(){
    var f=$('#fmt').value;
    $('#q-field').style.display=f==='image/png'?'none':'';
    $('#bg-field').style.display=f==='image/jpeg'?'':'none';
  }
  $('#fmt').addEventListener('change', syncUI);
  $('#q').addEventListener('input', function(){ $('#qv').textContent=$('#q').value; });
  function addFiles(files){
    Array.prototype.forEach.call(files, function(file){
      if(!/^image\//.test(file.type)) return;
      queue.push(file);
    });
    process();
  }
  function process(){
    if(!queue.length) return;
    var file=queue.shift();
    var img=new Image();
    var url=URL.createObjectURL(file);
    img.onload=function(){
      var canvas=document.createElement('canvas');
      canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
      var ctx=canvas.getContext('2d');
      var target=$('#fmt').value;
      if(target==='image/jpeg'){
        ctx.fillStyle=$('#bg').value;
        ctx.fillRect(0,0,canvas.width,canvas.height);
      }
      ctx.drawImage(img,0,0);
      var q=parseInt($('#q').value,10)/100;
      canvas.toBlob(function(blob){
        URL.revokeObjectURL(url);
        if(!blob){ $('#stats')&&0; process(); return; }
        var li=document.createElement('li');
        var base=file.name.replace(/\.[^.]+$/,'');
        var saved=file.size?Math.round((1-blob.size/file.size)*100):0;
        li.innerHTML='<span class="fname">'+TK.esc(base+ext())+'</span>'+
          '<span class="dim">'+TK.fmt(file.size/1024,0)+' KB → '+TK.fmt(blob.size/1024,0)+' KB '+
          (saved>0?'<b class="pos">−'+saved+'%</b>':(saved<0?'<b class="neg">+'+(-saved)+'%</b>':''))+'</span>';
        var btn=document.createElement('button');
        btn.className='btn btn-ghost'; btn.textContent='下载';
        btn.addEventListener('click', function(){ TK.downloadBlob(base+ext(), blob); });
        li.appendChild(btn);
        $('#list').appendChild(li);
        $('#res').hidden=false;
        process();
      }, target, target==='image/png'?undefined:q);
    };
    img.onerror=function(){ URL.revokeObjectURL(url); process(); };
    img.src=url;
  }
  $('#files').addEventListener('change', function(e){ addFiles(e.target.files); e.target.value=''; });
  var drop=$('#drop');
  ['dragenter','dragover'].forEach(function(t){ drop.addEventListener(t, function(e){ e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave','drop'].forEach(function(t){ drop.addEventListener(t, function(e){ e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function(e){ addFiles(e.dataTransfer.files); });
  $('#dl-all').addEventListener('click', function(){
    var btns=$('#list').querySelectorAll('button');
    var i=0;
    (function next(){
      if(i>=btns.length) return;
      btns[i++].click();
      setTimeout(next, 350);
    })();
  });
  syncUI();
})();
""",
    ),
]

# 与既有 70 个工具重复（或在既有工具覆盖范围内），因此不搬运：
SKIPPED = [
    ("图片压缩 / Image Compressor", "已有 compress-image"),
    ("图片尺寸修改", "已有 resize-image"),
    ("图片转 Base64", "已有 image-to-data-uri"),
    ("图片转 WebP", "已有 png-to-webp（可转 WebP）"),
    ("HEIC 转 JPG", "已有 heic-to-jpg"),
    ("JPG 转 PDF", "已有 images-to-pdf（多图合成 PDF）"),
    ("Merge PDF / Compress PDF", "已有 merge-pdf / compress-pdf"),
    ("Passport Photo Maker", "已有 id-photo 证件照制作"),
    ("HEIC to JPG", "已有 heic-to-jpg"),
    ("JSON 格式化", "已有 json-formatter"),
    ("字数统计", "已有 quick 文本统计"),
    ("大小写转换", "已有 quick 大小写转换"),
    ("Base64 / URL 编解码", "已有 quick 与 base64、encode-text"),
    ("随机密码生成", "已有 password-generator"),
    ("二维码生成", "已有 qr-barcode"),
    ("视频格式转换", "已有 convert-to-mp4 等视频转码工具"),
    ("音频格式转换 / 转 WAV", "与 extract-audio-from-video、edit-audio 覆盖范围重叠，后续单独评估"),
]
