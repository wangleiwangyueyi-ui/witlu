import fs from 'node:fs/promises';
import https from 'node:https';
import http from 'node:http';
const output='docs/progress/performance/P11/live.json',results=[];
const request=url=>new Promise((resolve,reject)=>{const req=(url.startsWith('https:')?https:http).get(url,{timeout:12000,headers:{'User-Agent':'witlu-release-check/1.0'}},res=>{const socket=res.socket,tls=socket?.encrypted?{authorized:socket.authorized,protocol:socket.getProtocol?.()}:null;const chunks=[];let bytes=0;res.on('data',b=>{bytes+=b.length;if(bytes<1000000)chunks.push(b);});res.on('end',()=>resolve({status:res.statusCode,headers:Object.fromEntries(Object.entries(res.headers).filter(([key])=>['location','content-type','cache-control','strict-transport-security','server','etag','cf-cache-status','x-content-type-options'].includes(key))),body:Buffer.concat(chunks).toString(),tls}));});req.on('timeout',()=>req.destroy(Error('12 second request timeout')));req.on('error',reject);});
async function check(url,kind){let current=url,chain=[];try{for(let i=0;i<6;i++){const response=await request(current);chain.push({url:current,status:response.status,headers:response.headers,tls:response.tls});if(response.status>=300&&response.status<400&&response.headers.location){current=new URL(response.headers.location,current).href;continue;}
 const cache=String(response.headers['cache-control']??''),checks={status:response.status===200,https:current.startsWith('https:'),tls:response.tls?.authorized===true&&/^TLSv1\.[23]$/.test(response.tls?.protocol??''),query:new URL(current).search===new URL(url).search,cache:kind==='immutable'?/max-age=31536000/.test(cache)&&/immutable/.test(cache):kind==='data'?/must-revalidate|no-cache/.test(cache):/no-cache/.test(cache)};
 if(kind==='html')checks.application=response.body.includes('\u6c5f\u5c71')&&response.body.includes('witlu');
 results.push({url,kind,chain,checks,passed:Object.values(checks).every(Boolean)});return response;
 }throw Error('Too many redirects');}catch(e){results.push({url,kind,chain,passed:false,error:String(e)});return null;}}
for(const host of ['witlu.com','www.witlu.com']){
 for(const scheme of ['http','https'])await check(`${scheme}://${host}/`,'html');
 await check(`https://${host}/?year=230&lang=en`,'html');
 const release=await check(`https://${host}/release.json`,'data');
 try{const r=JSON.parse(release?.body??'');if(r.application!=='witlu')throw Error('Release identity mismatch');await check(`https://${host}${r.entry}`,'immutable');await check(`https://${host}${r.probeTile}`,'immutable');await check(`https://${host}/sw.js`,'data');await check(`https://${host}/topics/index.html`,'html');}catch(e){results.push({url:`https://${host}/release.json`,passed:false,error:String(e)});}
}
const report={date:new Date().toISOString(),passed:results.every(r=>r.passed),results};await fs.mkdir('docs/progress/performance/P11',{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(`${report.passed?'PASS':'FAIL'}: ${results.filter(r=>r.passed).length}/${results.length}; ${output}`);if(!report.passed)process.exitCode=1;
