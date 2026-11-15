import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const messages=[{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05'}},{jsonrpc:'2.0',method:'notifications/initialized'},{jsonrpc:'2.0',id:2,method:'tools/list'},...[
 ['inspect_place',{year:1102,place:'浔阳'}],['inspect_person',{person:'sushi',stop:2}],['search_atlas',{query:'蓝关',limit:4}]
].map(([name,args],i)=>({jsonrpc:'2.0',id:i+3,method:'tools/call',params:{name,arguments:args}}))];
const result=spawnSync(process.execPath,['scripts/mcp-server.mjs'],{input:messages.map(m=>JSON.stringify(m)).join('\n')+'\n',encoding:'utf8',timeout:60000,maxBuffer:8e6});
assert.equal(result.status,0,result.stderr);const replies=result.stdout.trim().split('\n').map(s=>JSON.parse(s));assert.equal(replies.length,5);assert.equal(replies[1].result.tools.length,3);
for(const reply of replies){assert.ok(!reply.error);assert.ok(!reply.result.isError);}
assert.match(replies[2].result.content[0].text,/https:\/\/witlu.com\//);assert.ok(!result.stdout.includes('deanchen.me'));
await fs.mkdir('docs/progress/performance/P10',{recursive:true});await fs.writeFile('docs/progress/performance/P10/mcp.json',JSON.stringify({passed:true,tools:replies[1].result.tools.map(t=>t.name),place:JSON.parse(replies[2].result.content[0].text),queryCount:3},null,2));console.log('MCP initialize, notifications, tool discovery and all three tools passed');
