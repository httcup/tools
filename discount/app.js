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
