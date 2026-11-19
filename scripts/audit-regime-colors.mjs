import fs from 'node:fs/promises';
import sharp from 'sharp';
import {lightness,minColorDistance,regimeTokens,separation,simulatedColor} from './lib/regime-colors.mjs';

const read=async name=>JSON.parse(await fs.readFile(`packages/web/public/data/${name}.json`,'utf8'));
const [snapshots,phases]=await Promise.all([read('polity-colors'),read('phases')]);
const colors=regimeTokens(), modes=['normal','protanopia','deuteranopia','tritanopia'];
const samples=[-221,230,589,1127,1700].map(year=>({year,key:phases.slice().reverse().find(p=>p.from<=year).snapshot}));
const edges=[];
for(const snapshot of snapshots){
 const filled=new Map(snapshot.colors.filter(s=>s.fill).map(s=>[s.polityId,s.color]));
 for(const [a,b] of snapshot.adjacency){
  const ca=filled.get(a),cb=filled.get(b);
  if(ca&&cb)edges.push({snapshot:snapshot.snapshot,a,b,deltaE:separation(ca,cb)});
 }
}
edges.sort((a,b)=>a.deltaE-b.deltaE);
const minimum=edges[0], out='docs/progress/performance/R2';
await fs.mkdir(out,{recursive:true});
await fs.writeFile(`${out}/color-audit.json`,JSON.stringify({palette:colors.map(hex=>({hex,lightness:lightness(hex)})),modes,snapshots:snapshots.length,edges:edges.length,minimum,minColorDistance,passes:minimum.deltaE>=minColorDistance},null,2)+'\n');

const rows=[{title:'Complete palette',swatches:colors},...samples.map(({year,key})=>({title:String(year),swatches:[...new Set(snapshots.find(s=>s.snapshot===key).colors.filter(p=>p.fill).map(p=>p.color))]}))];
const width=1000,rowHeight=108,head=70,height=head+rowHeight*rows.length+16;
const headings=modes.map((mode,j)=>`<text x="${145+j*215}" y="52" class="heading">${mode}</text>`).join('');
const swatches=rows.map(({title,swatches},i)=>{
 const y=head+i*rowHeight;
 return `<text x="25" y="${y+20}">${title}</text>`+modes.map((mode,j)=>swatches.map((hex,k)=>{
  const x=145+j*215+k%5*39, top=y+Math.floor(k/5)*36;
  return `<rect x="${x}" y="${top}" width="32" height="28" rx="4" fill="${simulatedColor(hex,mode)}"/>`;
 }).join('')).join('');
}).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><style>text{font:15px sans-serif;fill:#FFFFFF}.heading{font-weight:700}</style><rect width="100%" height="100%" fill="#0A1830"/>${headings}${swatches}</svg>`;
await sharp(Buffer.from(svg)).webp({quality:92}).toFile(`${out}/vision-simulation.webp`);
console.log(`${edges.length} filled adjacencies; worst ΔE76 ${minimum.deltaE.toFixed(2)} in ${minimum.snapshot}`);
if(minimum.deltaE<minColorDistance)process.exitCode=1;
