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
