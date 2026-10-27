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
