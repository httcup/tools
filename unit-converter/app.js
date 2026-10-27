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
