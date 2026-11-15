import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const nativeRequire=createRequire(import.meta.url),cache=new Map();
// The upstream CommonJS files live under our ESM workspace; retain their own paths.
function commonJS(filename){
 if(cache.has(filename))return cache.get(filename).exports;
 const module={exports:{}};cache.set(filename,module);
 const require=name=>name.startsWith('.')?commonJS(path.resolve(path.dirname(filename),name.endsWith('.js')?name:name+'.js')):nativeRequire(name);
 const body=new vm.Script('(function(exports,require,module,__filename,__dirname){\n'+fs.readFileSync(filename,'utf8').replace(/^#![^\n]*\n/,'')+'\n})',{filename});
 body.runInThisContext()(module.exports,require,module,filename,path.dirname(filename));return module.exports;
}
export const upstreamMcp=commonJS(path.resolve(import.meta.dirname,'../../upstream/scripts/mcp_server.js'));
export function createRuntime(){const runtime=upstreamMcp.createMcpRuntime();runtime.sandbox.location.origin='https://witlu.com';runtime.sandbox.location.pathname='/';return runtime;}
