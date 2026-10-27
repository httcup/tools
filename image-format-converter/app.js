(function(){
  var $=TK.$;
  var queue=[];
  function fmtName(){ return {'image/jpeg':'JPG','image/png':'PNG','image/webp':'WebP'}[$('#fmt').value]; }
  function ext(){ return {'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[$('#fmt').value]; }
  function syncUI(){
    var f=$('#fmt').value;
    $('#q-field').style.display=f==='image/png'?'none':'';
    $('#bg-field').style.display=f==='image/jpeg'?'':'none';
  }
  $('#fmt').addEventListener('change', syncUI);
  $('#q').addEventListener('input', function(){ $('#qv').textContent=$('#q').value; });
  function addFiles(files){
    Array.prototype.forEach.call(files, function(file){
      if(!/^image\//.test(file.type)) return;
      queue.push(file);
    });
    process();
  }
  function process(){
    if(!queue.length) return;
    var file=queue.shift();
    var img=new Image();
    var url=URL.createObjectURL(file);
    img.onload=function(){
      var canvas=document.createElement('canvas');
      canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
      var ctx=canvas.getContext('2d');
      var target=$('#fmt').value;
      if(target==='image/jpeg'){
        ctx.fillStyle=$('#bg').value;
        ctx.fillRect(0,0,canvas.width,canvas.height);
      }
      ctx.drawImage(img,0,0);
      var q=parseInt($('#q').value,10)/100;
      canvas.toBlob(function(blob){
        URL.revokeObjectURL(url);
        if(!blob){ $('#stats')&&0; process(); return; }
        var li=document.createElement('li');
        var base=file.name.replace(/\.[^.]+$/,'');
        var saved=file.size?Math.round((1-blob.size/file.size)*100):0;
        li.innerHTML='<span class="fname">'+TK.esc(base+ext())+'</span>'+
          '<span class="dim">'+TK.fmt(file.size/1024,0)+' KB → '+TK.fmt(blob.size/1024,0)+' KB '+
          (saved>0?'<b class="pos">−'+saved+'%</b>':(saved<0?'<b class="neg">+'+(-saved)+'%</b>':''))+'</span>';
        var btn=document.createElement('button');
        btn.className='btn btn-ghost'; btn.textContent='下载';
        btn.addEventListener('click', function(){ TK.downloadBlob(base+ext(), blob); });
        li.appendChild(btn);
        $('#list').appendChild(li);
        $('#res').hidden=false;
        process();
      }, target, target==='image/png'?undefined:q);
    };
    img.onerror=function(){ URL.revokeObjectURL(url); process(); };
    img.src=url;
  }
  $('#files').addEventListener('change', function(e){ addFiles(e.target.files); e.target.value=''; });
  var drop=$('#drop');
  ['dragenter','dragover'].forEach(function(t){ drop.addEventListener(t, function(e){ e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave','drop'].forEach(function(t){ drop.addEventListener(t, function(e){ e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function(e){ addFiles(e.dataTransfer.files); });
  $('#dl-all').addEventListener('click', function(){
    var btns=$('#list').querySelectorAll('button');
    var i=0;
    (function next(){
      if(i>=btns.length) return;
      btns[i++].click();
      setTimeout(next, 350);
    })();
  });
  syncUI();
})();
