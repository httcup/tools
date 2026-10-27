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
