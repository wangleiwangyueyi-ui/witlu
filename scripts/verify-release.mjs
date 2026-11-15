import fs from 'node:fs/promises';
const base=process.env.P11_RELEASE_URL??'http://127.0.0.1:4181',results=[];
const release=await fetch(base+'/release.json').then(r=>r.json());
for(const [route,policy,type] of [['/','no-cache','text/html'],['/lab/terrain','no-cache','text/html'],['/topics/index.html','no-cache','text/html'],['/sw.js','no-cache','javascript'],['/release.json','no-cache','json'],[release.entry,'immutable','javascript'],[release.probeTile,'immutable','image/webp'],['/fallback/initial.webp','no-cache','image/webp'],['/data/phases.json','must-revalidate','json']]){
 const response=await fetch(base+route),cache=response.headers.get('cache-control')??'',contentType=response.headers.get('content-type')??'';await response.body?.cancel();results.push({route,status:response.status,cache,contentType,passed:response.status===200&&cache.includes(policy)&&contentType.includes(type)&&!(cache.includes('immutable')&&cache.includes('no-cache'))});
}
const sw=await fetch(base+'/sw.js').then(r=>r.text());const shell=JSON.parse(sw.match(/const SHELL=(\[[^;]+\]);/)[1]);results.push({name:'Debug bundles are not installed offline',passed:!shell.some(s=>s.includes('vconsole'))});
const manifest=await fetch(base+'/fallback/manifest.json').then(r=>r.json());results.push({name:'All 198 historical snapshot fallbacks',passed:manifest.length===198&&new Set(manifest.map(s=>s.key)).size===198});
const report={date:new Date().toISOString(),localFixture:true,base,passed:results.every(r=>r.passed),results};await fs.mkdir('docs/progress/performance/P11',{recursive:true});await fs.writeFile('docs/progress/performance/P11/release.json',JSON.stringify(report,null,2));console.log(`${report.passed?'PASS':'FAIL'}: ${results.length} release checks`);if(!report.passed)process.exitCode=1;
