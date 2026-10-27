(function(){
  var $=TK.$;
  var recorder=null, chunks=[], timer=null, seconds=0, stream=null;
  function tick(){
    seconds++;
    var m=String(Math.floor(seconds/60)).padStart(2,'0');
    var s=String(seconds%60).padStart(2,'0');
    $('#timer').textContent=m+':'+s;
  }
  $('#toggle').addEventListener('click', function(){
    if(recorder&&recorder.state==='recording'){
      recorder.stop();
      return;
    }
    if(!navigator.mediaDevices||!window.MediaRecorder){
      $('#stats').textContent='这个浏览器不支持录音（MediaRecorder 不可用）';
      return;
    }
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){
      stream=s;
      chunks=[];
      var mime=MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':(MediaRecorder.isTypeSupported('audio/mp4')?'audio/mp4':'');
      recorder=mime?new MediaRecorder(s,{mimeType:mime}):new MediaRecorder(s);
      recorder.ondataavailable=function(e){ if(e.data.size) chunks.push(e.data); };
      recorder.onstop=function(){
        stream.getTracks().forEach(function(t){t.stop()});
        clearInterval(timer);
        $('#toggle').textContent='● 开始录音';
        $('#toggle').classList.add('btn-primary');
        var blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});
        var url=URL.createObjectURL(blob);
        $('#audio').src=url;
        var ext=/mp4/.test(recorder.mimeType||'')?'m4a':'webm';
        var dl=$('#dl'); dl.href=url; dl.download='录音.'+ext;
        $('#player').hidden=false;
        $('#stats').textContent='录了 '+seconds+' 秒 · '+Math.round(blob.size/1024)+' KB';
      };
      recorder.start();
      seconds=0; $('#timer').textContent='00:00';
      timer=setInterval(tick,1000);
      $('#toggle').textContent='■ 停止录音';
      $('#toggle').classList.remove('btn-primary');
      $('#stats').textContent='录音中…';
    }).catch(function(err){
      $('#stats').textContent='拿不到麦克风：'+(err&&err.name==='NotAllowedError'?'授权被拒绝':'设备不可用');
    });
  });
})();
