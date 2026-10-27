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
