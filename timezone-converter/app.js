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
