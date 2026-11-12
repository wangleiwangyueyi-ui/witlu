import assert from 'node:assert/strict';
import {readJSON} from './lib/upstream.mjs';
const snapshots=readJSON('snapshots'),registry=new Set(readJSON('polities').map(p=>p.key));
let features=0,holes=0;
for(const s of snapshots){
  const full=readJSON(s.file).features.filter(f=>f.properties.layer==='polity'),runtime=readJSON(`territories/${s.key}.geojson`);
  assert.deepEqual(runtime.features,full,`${s.key}: runtime polity data changed or lost features`);
  for(const f of runtime.features){
    assert(registry.has(f.properties.polityId),`${s.key}: unregistered polity ${f.properties.polityId}`);
    const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
    for(const polygon of polygons){holes+=polygon.length-1;for(const ring of polygon)assert(ring.length>=4&&ring.every(p=>p.length>=2&&p.every(Number.isFinite)),`${s.key}: invalid polygon ring`);}
  }
  features+=runtime.features.length;
}
console.log(`Morph parity: ${snapshots.length} snapshots, ${features} polity features, ${holes} interior rings; exact match to full geometry`);
