// Prerender the north-up fallback using the same snapshot bounds as the map.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {tileX,tileY,palette} from './lib/terrain.mjs';
const root=path.resolve(import.meta.dirname,'..'),publicDir=path.join(root,'packages/web/public'),out=path.join(publicDir,'fallback');
const read=async p=>JSON.parse(await fs.readFile(path.join(publicDir,'data',p),'utf8'));
const [snapshots,colors,tokens,frames]=await Promise.all([read('snapshots.json'),read('polity-colors.json'),palette(),read('map-frames.json')]);
const color=name=>'rgb('+tokens[name].join(',')+')';
const z=3,minX=5,minY=2,width=768,height=768;
const layers=[];for(let y=2;y<=4;y++)for(let x=5;x<=7;x++){const file=path.join(publicDir,`tiles/relief/${z}/${x}/${y}.webp`);try{await fs.access(file);layers.push({input:file,left:(x-minX)*256,top:(y-minY)*256});}catch{/* Outside baked bounds stays sea. */}}
const base=await sharp({create:{width,height,channels:3,background:color('sky')}}).composite(layers).png().toBuffer();
const xy=([lon,lat])=>[(tileX(lon,z)-minX)*256,(tileY(lat,z)-minY)*256];
await fs.mkdir(path.join(out,'images'),{recursive:true});const manifest=[];
for(const snapshot of snapshots){
 let geo=await read(`territories/${snapshot.key}.geojson`);const styles=colors.find(c=>c.snapshot===snapshot.key)?.colors??[];
 if(snapshot.key==='s_prc'&&!geo.features.length){geo=await read('modern-provinces.geojson');geo.features.forEach(f=>f.properties={...f.properties,polityId:styles[0]?.polityId});}
 const shapes=geo.features.map(f=>{const style=styles.find(c=>c.polityId===f.properties.polityId);if(!style||style.role==='neighbor')return '';const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 const d=polygons.map(p=>p.map(r=>r.map((c,i)=>`${i?'L':'M'}${xy(c).map(n=>n.toFixed(2)).join(' ')}`).join(' ')+'Z').join(' ')).join(' ');
 return `<path d="${d}" fill="${style.strokeOnly?'none':style.color}" fill-opacity=".4" fill-rule="evenodd" stroke="${style.color}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`;}).join('');
 const [west,south,east,north]=frames[snapshot.key]??[73.5,18,135,53.6];
 const [left,top]=xy([west,north]),[right,bottom]=xy([east,south]);
 const scale=.73*Math.min(1200/Math.max(60,right-left),800/Math.max(60,bottom-top));
 const tx=600-(left+right)*scale/2,ty=400-(top+bottom)*scale/2;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="${color('sky')}"/><g transform="translate(${tx},${ty}) scale(${scale})"><image href="data:image/png;base64,${base.toString('base64')}" width="${width}" height="${height}"/>${shapes}</g></svg>`;
 const bytes=await sharp(Buffer.from(svg)).webp({quality:78}).toBuffer(),hash=createHash('sha256').update(bytes).digest('hex').slice(0,12),file=`${snapshot.key}-${hash}.webp`;
 await fs.writeFile(path.join(out,'images',file),bytes);manifest.push({...snapshot,image:'/fallback/images/'+file});
}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest));
// Remove only previously generated snapshot images that this manifest cannot use.
const published=new Set(manifest.map(s=>path.basename(s.image)));
for(const entry of await fs.readdir(path.join(out,'images'),{withFileTypes:true})){
 if(entry.isFile()&&/^s_[a-z0-9_]+-[a-f0-9]{12}\.webp$/i.test(entry.name)&&!published.has(entry.name))await fs.unlink(path.join(out,'images',entry.name));
}
// A tiny default image can paint before JavaScript or the terrain engine arrive.
const defaultImage=manifest.find(s=>s.key==='s_sanguo')??manifest[0];
await fs.copyFile(path.join(publicDir,defaultImage.image),path.join(out,'initial.webp'));
console.log(`Prerendered ${manifest.length} static snapshots; no CHGIS administrative data included.`);
