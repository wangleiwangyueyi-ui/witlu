import fs from 'node:fs';
const links=new Map();
for(const source of fs.readdirSync('upstream').filter(n=>/^README.*\.md$/.test(n))){
 const text=fs.readFileSync('upstream/'+source,'utf8');
 for(const match of text.matchAll(/https:\/\/deanchen.me\/jiangshan-map\/\?[^\s)<>"`*[\]]+/g)){
  const query=new URL(match[0]).search;
  if(!links.has(query))links.set(query,new Set());links.get(query).add(source);
 }
}
fs.mkdirSync('docs/progress/performance/P9',{recursive:true});
fs.writeFileSync('docs/progress/performance/P9/readme-links.json',JSON.stringify([...links].map(([query,sources])=>({query,sources:[...sources]})),null,2)+'\n');
console.log(`${links.size} distinct upstream README links`);
