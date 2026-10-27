/* Built from https://github.com/httcup/tools by build.py. Verify with: python build.py --check */
const PRODUCTION='wss://rendezvous.example.invalid';
const DEVELOPMENT='wss://rendezvous-dev.example.invalid';
export function rendezvousEndpoint(href=globalThis.location?.href){
if(typeof href!=='string')return PRODUCTION;
try{
const url=new URL(href);
if(url.hostname==='localhost'||url.hostname==='127.0.0.1')return DEVELOPMENT;
if(url.protocol==='https:'&&(url.hostname==='abox-preview.pages.dev'
||url.hostname.endsWith('.abox-preview.pages.dev')))return DEVELOPMENT;
}catch{}
return PRODUCTION;
}
