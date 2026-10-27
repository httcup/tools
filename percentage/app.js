(function(){
  var $=TK.$;
  function num(s){ var v=parseFloat($(s).value); return isFinite(v)?v:null; }
  function show(id,v,suffix){
    var el=$(id);
    el.textContent=v==null?'—':(TK.fmt(v)+ (suffix||''));
    el.classList.toggle('neg', v!=null&&v<0);
  }
  function run(){
    var a1=num('#a1'), a2=num('#a2');
    show('#ra', (a1!=null&&a2!=null)?a1*a2/100:null);
    var b1=num('#b1'), b2=num('#b2');
    show('#rb', (b1!=null&&b2)?b1/b2*100:null, ' %');
    var c1=num('#c1'), c2=num('#c2');
    show('#rc', (c1!=null&&c1!==0&&c2!=null)?(c2-c1)/Math.abs(c1)*100:null, ' %');
  }
  ['#a1','#a2','#b1','#b2','#c1','#c2'].forEach(function(s){ $(s).addEventListener('input', run); });
})();
