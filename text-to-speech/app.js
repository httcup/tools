(function(){
  var $=TK.$;
  var synth=window.speechSynthesis;
  if(!synth){ $('#stats').textContent='这个浏览器不支持语音合成'; $('#play').disabled=true; return; }
  var voices=[];
  function load(){
    voices=synth.getVoices();
    if(!voices.length) return;
    var sorted=voices.slice().sort(function(a,b){
      var pa=/^zh/i.test(a.lang)?0:1, pb=/^zh/i.test(b.lang)?0:1;
      return pa-pb||a.lang.localeCompare(b.lang);
    });
    $('#voice').innerHTML=sorted.map(function(v,i){
      return '<option value="'+i+'">'+v.name+'（'+v.lang+'）</option>';
    }).join('');
    $('#stats').textContent='找到 '+voices.length+' 个系统语音';
  }
  load();
  synth.onvoiceschanged=load;
  $('#rate').addEventListener('input', function(){ $('#rv').textContent=parseFloat($('#rate').value).toFixed(1); });
  $('#pitch').addEventListener('input', function(){ $('#pv').textContent=parseFloat($('#pitch').value).toFixed(1); });
  $('#play').addEventListener('click', function(){
    synth.cancel();
    var u=new SpeechSynthesisUtterance($('#text').value||'请先输入文字');
    var v=voices[parseInt($('#voice').value,10)];
    if(v) u.voice=v;
    u.rate=parseFloat($('#rate').value);
    u.pitch=parseFloat($('#pitch').value);
    u.onend=function(){ $('#stats').textContent='读完了'; };
    $('#stats').textContent='正在朗读…';
    synth.speak(u);
  });
  $('#pause').addEventListener('click', function(){
    if(synth.speaking&&!synth.paused){ synth.pause(); $('#stats').textContent='已暂停'; }
    else if(synth.paused){ synth.resume(); $('#stats').textContent='继续朗读…'; }
  });
  $('#stop').addEventListener('click', function(){ synth.cancel(); $('#stats').textContent='已停止'; });
})();
