/* Built from https://github.com/httcup/tools by build.py. Verify with: python build.py --check */
var GA4_ID='G-Z11XSCYYNM';window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;
var notAVisit=navigator.webdriver||location.origin+'/'!=='https://139t.cn/';
if(notAVisit){
window['ga-disable-'+GA4_ID]=true;
}
var canonical=document.querySelector('link[rel="canonical"]');
var measurementPage=new URL(canonical?canonical.href:'https://139t.cn/404.html');
var campaign=new URLSearchParams(location.search);
['utm_source','utm_medium','utm_campaign','utm_id','utm_content','utm_term',
'gclid','dclid','gbraid','wbraid'].forEach(function(key){
var value=campaign.get(key);
if(value)measurementPage.searchParams.set(key,value);
});
var measurementReferrer='';
try{
var referrer=new URL(document.referrer);
if(referrer.protocol==='https:'||referrer.protocol==='http:'){
measurementReferrer=referrer.origin+'/';
}
}catch(err){}
if(!notAVisit){var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+GA4_ID;document.head.appendChild(s);}gtag('js',new Date());
gtag('config',GA4_ID,{
page_location:measurementPage.href,
page_title:document.title,
page_referrer:measurementReferrer,
});
(function(){
var panel=document.getElementById('feedback');
var slug=panel&&panel.getAttribute('data-tool');
if(!slug||!/^[a-z][a-z0-9-]*$/.test(slug))return;
var complete=false;
window.aboxToolComplete=function(){
if(complete)return;
try{
gtag('event','tool_complete',{
send_to:GA4_ID,
tool_slug:slug,
});
complete=true;
}catch(err){
}
};
try{
gtag('event','tool_view',{
send_to:GA4_ID,
tool_slug:slug,
});
}catch(err){}
if(['images-to-video','stack-images','gif-analyzer','split-gif'].indexOf(slug)===-1)return;
var stages={
input:'tool_input',
start:'tool_start',
ready:'tool_ready',
problem:'tool_problem',
cancel:'tool_cancel',
};
var reached=Object.create(null);
window.toolsToolJourney=function(step){
if(typeof step!=='string'||!Object.prototype.hasOwnProperty.call(stages,step)
||reached[step])return;
try{
gtag('event',stages[step],{
send_to:GA4_ID,
tool_slug:slug,
});
reached[step]=true;
}catch(err){}
};
}());
(function(){
try{
var sourceTag=document.querySelector('meta[name="tools-workflow-source"]');
var source=sourceTag&&sourceTag.content;
var validPage=/^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?$/;
if(!source||!validPage.test(source))return;
var targets=Object.create(null);
[
'gif-maker','gif-to-mp4','split-gif','images-to-video',
'stack-images','gif-analyzer','timelapse-video','resize-image','compress-image',
'guides/turn-images-into-a-video','guides/stack-photos-to-reduce-noise',
'guides/whats-inside-a-gif','guides/split-a-gif-into-frames',
'guides/edit-a-gif-frame-by-frame',
].forEach(function(id){targets[id]=true;});
document.querySelectorAll('meta[name="tools-workflow-target"]').forEach(function(tag){
if(validPage.test(tag.content))targets[tag.content]=true;
});
var selected=Object.create(null);
document.querySelectorAll('a[data-workflow-target]').forEach(function(link){
var target=link.getAttribute('data-workflow-target');
if(!targets[target]||target===source)return;
link.addEventListener('click',function(event){
if((event&&event.defaultPrevented)||selected[target])return;
try{
gtag('event','workflow_link',{
send_to:GA4_ID,
source_page:source,
target_page:target,
});
selected[target]=true;
}catch(err){}
});
});
}catch(err){}
}());

/* Baidu Tongji */
var _hmt=_hmt||[];(function(){var hm=document.createElement("script");hm.src="https://hm.baidu.com/hm.js?d05e52c39dd9224d6370ea9f1c9f2998";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(hm,s);})();
