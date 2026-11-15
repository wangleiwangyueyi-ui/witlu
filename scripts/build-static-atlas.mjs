// CPU-only prerender: existing territory polygons over the baked relief, tilted
// as a fixed oblique view. This is an image fallback, not an interactive 2D map.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {tileX,tileY,palette} from './lib/terrain.mjs';
const root=path.resolve(import.meta.dirname,'..'),publicDir=path.join(root,'packages/web/public'),out=path.join(publicDir,'fallback');
const read=async p=>JSON.parse(await fs.readFile(path.join(publicDir,'data',p),'utf8'));
const [snapshots,colors,tokens]=await Promise.all([read('snapshots.json'),read('polity-colors.json'),palette()]);
const color=name=>'rgb('+tokens[name].join(',')+')';
const z=3,minX=5,minY=2,width=768,height=768;
const layers=[];for(let y=2;y<=4;y++)for(let x=5;x<=7;x++){const file=path.join(publicDir,`tiles/relief/${z}/${x}/${y}.webp`);try{await fs.access(file);layers.push({input:file,left:(x-minX)*256,top:(y-minY)*256});}catch{/* Outside baked bounds stays sea. */}}
const base=await sharp({create:{width,height,channels:3,background:color('sea-deep')}}).composite(layers).png().toBuffer();
const xy=([lon,lat])=>[(tileX(lon,z)-minX)*256,(tileY(lat,z)-minY)*256];
await fs.mkdir(path.join(out,'images'),{recursive:true});const manifest=[];
for(const snapshot of snapshots){
 let geo=await read(`territories/${snapshot.key}.geojson`);const styles=colors.find(c=>c.snapshot===snapshot.key)?.colors??[];
 if(snapshot.key==='s_prc'&&!geo.features.length){geo=await read('modern-provinces.geojson');geo.features.forEach(f=>f.properties={...f.properties,polityId:styles[0]?.polityId});}
 const shapes=geo.features.map(f=>{const style=styles.find(c=>c.polityId===f.properties.polityId);if(!style||style.role==='neighbor')return '';const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 const d=polygons.map(p=>p.map(r=>r.map((c,i)=>`${i?'L':'M'}${xy(c).map(n=>n.toFixed(2)).join(' ')}`).join(' ')+'Z').join(' ')).join(' ');
 return `<path d="${d}" fill="${style.strokeOnly?'none':style.color}" fill-opacity=".4" fill-rule="evenodd" stroke="${style.color}" stroke-width=".7"/>`;}).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="${color('sky')}"/><g transform="translate(-260,-180) matrix(2.5,0,-.25,1.8,0,0)"><image href="data:image/png;base64,${base.toString('base64')}" width="${width}" height="${height}"/>${shapes}</g></svg>`;
 const bytes=await sharp(Buffer.from(svg)).webp({quality:78}).toBuffer(),hash=createHash('sha256').update(bytes).digest('hex').slice(0,12),file=`${snapshot.key}-${hash}.webp`;
 await fs.writeFile(path.join(out,'images',file),bytes);manifest.push({...snapshot,image:'/fallback/images/'+file});
}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest));
// A tiny default image can paint before JavaScript or the terrain engine arrive.
const defaultImage=manifest.find(s=>s.key==='s_sanguo')??manifest[0];
await fs.copyFile(path.join(publicDir,defaultImage.image),path.join(out,'initial.webp'));
console.log(`Prerendered ${manifest.length} static snapshots; no CHGIS administrative data included.`);
