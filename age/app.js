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
