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
