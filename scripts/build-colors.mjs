import fs from 'node:fs';
import path from 'node:path';
import intersects from '@turf/boolean-intersects';
import { ROOT, readJSON, readCache, writeJSON, report } from './lib/upstream.mjs';
import { feature, polygonal, areaKm2 } from './lib/geometry.mjs';
import { colorGraph } from './lib/coloring.mjs';
import { lightness, minColorDistance, regimeTokens, separation } from './lib/regime-colors.mjs';

const palette = regimeTokens();
const tokens = fs.readFileSync(path.join(ROOT, 'packages/web/src/styles/tokens.css'), 'utf8');
const neighbor = tokens.match(/--neighbor:\s*(#[a-f0-9]{6})/i)[1];
const compatible = (a,b) => separation(a,b) >= minColorDistance;
const raw = readCache('snapshots-raw'), registry = readJSON('polities');
const previous = {caowei:palette[0], shuhan:palette[1], sunwu:palette[7], gongsun_liaodong:palette[2], jin_jurchen:palette[1], dali:palette[6]};
const output = [], rows = [], frames = {};
let minimum = Infinity;
for (const snapshot of readJSON('snapshots')) {
  const items = readJSON(snapshot.file).features.filter(f => f.properties.layer === 'polity');
  const main = items.find(f => f.properties.role === 'main')?.properties.polityId ?? null;
  const bounds = [Infinity,Infinity,-Infinity,-Infinity], boundsByPolity = new Map();
  for(const f of items.filter(f=>['main','rival'].includes(f.properties.role))) {
    const key=f.properties.polityId;
    const extent=boundsByPolity.get(key)??[Infinity,Infinity,-Infinity,-Infinity];
    boundsByPolity.set(key,extent);
    const g=f.geometry;
    const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;
    for(const poly of polygons) for(const [x,y] of poly[0]??[]) {
      for(const b of [bounds,extent]){
        b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);
        b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);
      }
    }
  }
  if(bounds.every(Number.isFinite)) frames[snapshot.key]=bounds.map(v=>Number(v.toFixed(4)));
  const districts = items.filter(f => f.properties.role !== 'neighbor').map(f => ({
    id: f.properties.polityId,
    colorId: (f.properties.role === 'protectorate' ? main : null) ?? f.properties.polityId,
    feature: feature(polygonal(raw[snapshot.key].polities[f.properties.sourceIndex].shape)),
    area: areaKm2(f),
  }));
  const ids = [...new Set(districts.map(d => d.colorId))], edges = [], adjacency = [];
  const seen = new Set();
  for (let i = 0; i < districts.length; i++) for (let j = i + 1; j < districts.length; j++) {
    const a = districts[i], b = districts[j];
    if (a.colorId === b.colorId || a.id === b.id || !intersects(a.feature,b.feature)) continue;
    const key = [a.id,b.id].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([a.colorId,b.colorId]);
    adjacency.push([a.id,b.id]);
  }
  // Give these recurring contemporaries distinct hues even where their
  // polygons do not touch. Physical adjacency is still reported separately.
  if (ids.includes('jin_jurchen') && ids.includes('dali')) edges.push(['jin_jurchen','dali']);
  if (ids.includes('gongsun_liaodong') && ids.includes('shuhan')) edges.push(['gongsun_liaodong','shuhan']);
  let active = ids.slice(), assignment = colorGraph(active,edges,palette,previous,compatible,5);
  const outline = [];
  while (!assignment) {
    const area = id => districts.filter(d => d.colorId === id).reduce((sum,d) => sum + d.area,0);
    const smallest = active.filter(id => id !== main).sort((a,b) => area(a)-area(b)||a.localeCompare(b))[0];
    if (!smallest) throw Error('Cannot assign a main regime color for '+snapshot.key);
    outline.push(smallest);
    active = active.filter(id => id !== smallest);
    assignment = colorGraph(active,edges,palette,previous,compatible,5);
  }
  const colors = items.map(f => {
    const { polityId, role = 'rival', title } = f.properties;
    const parent = role === 'protectorate' ? main : null, id = parent ?? polityId;
    const fillOpacity = role === 'neighbor' || outline.includes(id) ? 0 : role === 'protectorate' ? .18 : .4;
    const color = role === 'neighbor' ? neighbor : assignment[id] ?? previous[id] ?? palette[0];
    const extent=boundsByPolity.get(polityId);
    const bounds=extent?.every(Number.isFinite)?extent.map(v=>Number(v.toFixed(4))):undefined;
    return { featureId:f.properties.id, polityId, title, anchor:f.properties.anchor, bounds, role, color, fill:fillOpacity?color:null, fillOpacity, pattern:role==='protectorate'?'diagonal':null, parent, strokeOnly:fillOpacity===0 };
  });
  const separateModern = registry.find(p => p.occurrences.some(o => o.snapshot === snapshot.key && o.geometrySource === 'modern-provinces'));
  if (separateModern) {
    const color = previous[separateModern.key] ?? palette[0];
    colors.push({polityId:separateModern.key,title:separateModern.zh,role:'main',color,fill:color,fillOpacity:.4,pattern:null,parent:null,strokeOnly:false,geometrySource:'modern-provinces',featureIds:readJSON('modern-provinces.geojson').features.map(f=>f.properties.id)});
  }
  const used = new Set(colors.filter(c=>c.fill).map(c=>c.color));
  if (used.size > 5) throw Error('Simultaneous color limit: '+snapshot.key);
  for (const [a,b] of edges) if (assignment[a] && assignment[b]) {
    const distance = separation(assignment[a],assignment[b]);
    if (distance<minColorDistance) throw Error(`Color collision ${snapshot.key}: ${a}, ${b}`);
    minimum = Math.min(minimum,distance);
  }
  Object.assign(previous,assignment);
  output.push({snapshot:snapshot.key,colors,adjacency,saturatedColorCount:used.size,outlinePolities:outline});
  rows.push(`| ${snapshot.key} | ${ids.length} | ${adjacency.length} | ${used.size} | ${outline.join(', ')||'—'} |`);
}
writeJSON('polity-colors',output);
writeJSON('map-frames',frames);
const l = palette.map(lightness);
report('colors.md', `# v4 政权配色\n\n色板：${palette.join('、')}。CIELAB L* 为 ${Math.min(...l).toFixed(1)}–${Math.max(...l).toFixed(1)}。对原始相交边做约束着色，优先延续同一政权配色。普通视觉及三种全色盲模拟中的最小 CIELAB ΔE76 为 ${minimum.toFixed(2)}，门槛 ${minColorDistance}。保护区沿用所属朝代的斜线样式，邻国仅描边。\n\n| 快照 | 政权组 | 邻接 | 填色数量 | 仅描边组 |\n|---|---:|---:|---:|---|\n${rows.join('\n')}\n`);
console.log(`Colored ${output.length} snapshots; min simulated delta E ${minimum.toFixed(2)}`);
