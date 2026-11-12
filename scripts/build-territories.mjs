import {readJSON,writeJSON} from './lib/upstream.mjs';
// Lightweight runtime view; retain all full geometry and parity datasets.
for(const s of readJSON('snapshots')){const collection=readJSON(s.file);writeJSON(`territories/${s.key}.geojson`,{type:'FeatureCollection',features:collection.features.filter(f=>f.properties.layer==='polity'),metadata:s});}
console.log('Built lightweight polity views without CHGIS payloads');
