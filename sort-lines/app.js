(function(){
  var $=TK.$;
  var collator=new Intl.Collator('zh-Hans-CN',{numeric:true,sensitivity:'base'});
  function run(){
    var lines=$('#in').value.split('\n');
    if($('#skip-empty').checked) lines=lines.filter(function(l){return l.trim()!==''});
    if($('#dedupe').checked){
      var seen=new Set();
      lines=lines.filter(function(l){ var k=l.trim(); if(seen.has(k)) return false; seen.add(k); return true; });
    }
    var mode=$('#mode').value, dir=$('#dir').value==='desc'?-1:1;
    if(mode==='alpha') lines.sort(function(a,b){ return dir*collator.compare(a,b); });
    else if(mode==='length') lines.sort(function(a,b){ return dir*(a.length-b.length||collator.compare(a,b)); });
    else if(mode==='reverse') lines.reverse();
    else if(mode==='shuffle'){
      for(var i=lines.length-1;i>0;i--){
        var buf=new Uint32Array(1); crypto.getRandomValues(buf);
        var j=buf[0]%(i+1);
        var t=lines[i]; lines[i]=lines[j]; lines[j]=t;
      }
    }
    $('#out').value=lines.join('\n');
    $('#stats').textContent=lines.length+' 行';
    $('#copy').dataset.copyTarget='#out';
  }
  ['#in','#mode','#dir','#natural','#dedupe','#skip-empty'].forEach(function(s){ $(s).addEventListener('input', run); $(s).addEventListener('change', run); });
  $('#mode').addEventListener('change', function(){ var shuffle=$('#mode').value==='shuffle'||$('#mode').value==='reverse'; $('#dir').disabled=shuffle; });
  $('#dl').addEventListener('click', function(){ TK.download('排序结果.txt', $('#out').value); });
  TK.bindCopy($('#copy'));
  run();
})();
