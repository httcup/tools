(function(){
  var $=TK.$;
  var input=$('#in'), output=$('#out'), stats=$('#stats');

  function run(){
    var lines=input.value.split('\n');
    var ignoreCase=$('#ignore-case').checked;
    var trim=$('#trim').checked;
    var skipEmpty=$('#skip-empty').checked;
    var seen=new Set();
    var out=[];
    var dup=0, blanks=0;
    for(var i=0;i<lines.length;i++){
      var raw=lines[i];
      var key=raw;
      if(trim) key=key.trim();
      if(ignoreCase) key=key.toLowerCase();
      if(!key){ blanks++; if(skipEmpty) continue; if(out.length&&out[out.length-1]==='') continue; out.push(''); continue; }
      if(seen.has(key)){ dup++; continue; }
      seen.add(key);
      out.push(raw);
    }
    output.value=out.join('\n');
    var removed=lines.length-out.length-(skipEmpty?blanks:0);
    stats.textContent='原始 '+lines.length+' 行 · 保留 '+out.length+' 行 · 去掉重复 '+Math.max(0,removed)+' 行'+(skipEmpty&&blanks?' · 跳过空行 '+blanks+' 行':'');
    $('#copy').dataset.copyTarget='#out';
    $('#dl').dataset.name='去重结果.txt';
  }
  input.addEventListener('input', run);
  ['ignore-case','trim','skip-empty'].forEach(function(id){ $('#'+id).addEventListener('change', run); });
  $('#dl').addEventListener('click', function(){ TK.download($('#dl').dataset.name||'去重结果.txt', output.value); });
  TK.bindCopy($('#copy'));
  run();
})();
