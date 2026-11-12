import fs from 'node:fs';
import path from 'node:path';
import intersects from '@turf/boolean-intersects';
import { ROOT, readJSON, readCache, writeJSON, report } from './lib/upstream.mjs';
import { feature, polygonal, areaKm2 } from './lib/geometry.mjs';
import { colorGraph } from './lib/coloring.mjs';
const tokens = fs.readFileSync(path.join(ROOT, 'packages/web/src/styles/tokens.css'), 'utf8');
const token = name => { const value = tokens.match(new RegExp(`--${name}:\\s*(#[a-fA-F0-9]{6})`))?.[1]; if (!value) throw new Error(`Missing token ${name}`); return value; };
const gold = token('polity-main'), palette = ['coral', 'jade', 'blue', 'purple'].map(c => token(`polity-${c}`));
const raw = readCache('snapshots-raw'), previous = {}, output = [], rows = [];
const registry = readJSON('polities');
for (const snapshot of readJSON('snapshots')) {
  const items = readJSON(snapshot.file).features.filter(f => f.properties.layer === 'polity');
  const rivals = items.filter(f => f.properties.role === 'rival');
  const ids = [...new Set(rivals.map(f => f.properties.polityId))];
  const edges = [];
  // Use unsimplified boundaries so simplification cannot erase adjacency evidence.
  for (let i = 0; i < rivals.length; i++) for (let j = i + 1; j < rivals.length; j++) {
    const a = rivals[i], b = rivals[j];
    const ai = a.properties.sourceIndex, bi = b.properties.sourceIndex;
    if (a.properties.polityId !== b.properties.polityId && intersects(feature(polygonal(raw[snapshot.key].polities[ai].shape)), feature(polygonal(raw[snapshot.key].polities[bi].shape)))) edges.push([a.properties.polityId, b.properties.polityId]);
  }
  let active = [...ids], assignment = colorGraph(active, edges, palette.slice(0, 3), previous);
  if (!assignment) assignment = colorGraph(active, edges, palette, previous);
  const outline = [];
  while (!assignment) {
    const smallest = [...active].sort((a, b) => {
      const sum = id => rivals.filter(f => f.properties.polityId === id).reduce((n, f) => n + areaKm2(f), 0);
      return sum(a) - sum(b) || a.localeCompare(b);
    })[0];
    outline.push(smallest); active = active.filter(id => id !== smallest);
    assignment = colorGraph(active, edges, palette, previous);
  }
  const main = items.find(f => f.properties.role === 'main')?.properties.polityId ?? null;
  const colors = items.map(f => {
    const { polityId, role = 'rival', title } = f.properties;
    let color = gold, fillOpacity = 0.4, pattern = null, parent = null;
    if (role === 'neighbor') { color = token('neighbor'); fillOpacity = 0; }
    else if (role === 'protectorate') { parent = main; color = gold; fillOpacity = 0.18; pattern = 'diagonal'; }
    else if (role !== 'main') { color = assignment[polityId] ?? previous[polityId] ?? palette[0]; if (outline.includes(polityId)) fillOpacity = 0; }
    return { featureId: f.properties.id, polityId, title, role, color, fill: fillOpacity ? color : null, fillOpacity, pattern, parent, strokeOnly: fillOpacity === 0 };
  });
  const separateModern = registry.find(p => p.occurrences.some(o => o.snapshot === snapshot.key && o.geometrySource === 'modern-provinces'));
  if (separateModern) colors.push({ polityId: separateModern.key, title: separateModern.zh, role: 'main', color: gold, fill: gold, fillOpacity: 0.4, pattern: null, parent: null, strokeOnly: false, geometrySource: 'modern-provinces', featureIds: readJSON('modern-provinces.geojson').features.map(f => f.properties.id) });
  const saturated = new Set(colors.filter(c => c.fill && c.role !== 'neighbor').map(c => c.color));
  if (saturated.size > 5) throw new Error(`Saturated color budget exceeded: ${snapshot.key}`);
  for (const [a, b] of edges) if (assignment[a] && assignment[b] && assignment[a] === assignment[b]) throw new Error(`Adjacent color collision ${snapshot.key}: ${a},${b}`);
  for (const c of colors) if (c.role === 'rival' && c.fill) previous[c.polityId] = c.color;
  output.push({ snapshot: snapshot.key, colors, adjacency: edges, saturatedColorCount: saturated.size, outlinePolities: outline });
  rows.push(`| ${snapshot.key} | ${ids.length} | ${edges.length} | ${saturated.size} | ${outline.join(', ') || '—'} |`);
}
writeJSON('polity-colors', output);
report('colors.md', `# 政权配色报告\n\n色值从 tokens.css 读取。main 统一金色；rival 使用 DSATUR 回溯优先尝试三色，必要时加入淡紫；以上个时间快照中的颜色为首选。邻接按原始面相交（含接触和重叠）保守判定。保护区继承当前主朝代，18% 填充、diagonal 纹理；neighbor 仅描边。\n\n金色 + 四种 rival 色天然不超过 5 种；若数据重叠导致图不可四色着色，按面积从小到大降为只描边，保留全部要素。所有相邻填色政权均检查无冲突。\n\n| 快照 | rivals | 邻接边 | 饱和填充色 | 只描边次要政权 |\n|---|---:|---:|---:|---|\n${rows.join('\n')}\n`);
console.log(`Colored ${output.length} snapshots, at most five saturated fills`);
