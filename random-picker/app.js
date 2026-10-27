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
