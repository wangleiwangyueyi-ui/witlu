// Local HTTP fixture for compressed cold-start and cache-policy verification.
// Real Cloudflare/TLS validation is independently performed by check-live.mjs.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const root=path.resolve('packages/web/dist'),rules=[],cache=new Map();let current;
for(const line of (await fs.readFile(path.join(root,'_headers'),'utf8')).split(/\r?\n/)){if(!line.trim())continue;if(!line.startsWith(' ')){current={pattern:new RegExp('^'+line.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replaceAll('*','.*')+'$'),headers:{}};rules.push(current);}else{const i=line.indexOf(':');current.headers[line.slice(0,i).trim()]=line.slice(i+1).trim();}}
const types={'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.wasm':'application/wasm'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname),requested=path.resolve(root,'.'+pathname);if(!requested.startsWith(root+path.sep)&&requested!==root){res.writeHead(403).end();return;}let file=requested;
 try{const stat=await fs.stat(file);if(stat.isDirectory())file=path.join(file,'index.html');}catch{if(path.extname(pathname)){res.writeHead(404).end();return;}file=path.join(root,'index.html');}
 const stat=await fs.stat(file),old=cache.get(file);let entry=old;if(!entry||entry.mtime!==stat.mtimeMs){const body=await fs.readFile(file);entry={mtime:stat.mtimeMs,body,gzip:/\.(js|css|json|html|svg|txt)$/.test(file)?gzipSync(body):null};cache.set(file,entry);}
 const headers={'Content-Type':types[path.extname(file)]??'application/octet-stream','Vary':'Accept-Encoding'};for(const rule of rules)if(rule.pattern.test(pathname))Object.assign(headers,rule.headers);
 const compressed=entry.gzip&&/gzip/.test(req.headers['accept-encoding']??'');if(compressed)headers['Content-Encoding']='gzip';res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:compressed?entry.gzip:entry.body);
 }catch(e){res.writeHead(500).end(String(e));}}).listen(Number(process.env.PORT??4181),'127.0.0.1',()=>console.log('Compressed production fixture http://127.0.0.1:'+String(process.env.PORT??4181)));
