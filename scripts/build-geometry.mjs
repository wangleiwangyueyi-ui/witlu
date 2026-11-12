import mapshaper from 'mapshaper';
import { readJSON, readCache, writeJSON, report } from './lib/upstream.mjs';
import { polygonal, feature, contains, areaKm2, resolveProfile } from './lib/geometry.mjs';
const started = performance.now();
const snapshots = readCache('snapshots-raw'), phases = readJSON('phases'), dynasties = readJSON('dynasties'), profiles = readJSON('polity-profiles');
const registry = Object.fromEntries(profiles.map(p => [p.key, { ...p, occurrences: [] }]));
const gazetteer = readJSON('gazetteer');
const index = [], missingCapitals = [];
const snapshotKeys = Object.keys(snapshots).filter(k => k !== 'neighbors');
snapshotKeys.sort((a, b) => (phases.find(p => p.snapshot === a)?.from ?? Infinity) - (phases.find(p => p.snapshot === b)?.from ?? Infinity) || a.localeCompare(b));
for (const key of snapshotKeys) {
  const s = snapshots[key], uses = phases.filter(p => p.snapshot === key);
  const dynasty = dynasties.find(d => uses.some(p => p.dynastyKey === d.key)) ?? dynasties.find(d => key.startsWith(`s_${d.key}`));
  if (!dynasty) throw new Error(`Snapshot without dynasty: ${key}`);
  const from = uses.length ? Math.min(...uses.map(p => p.from)) : dynasty.fromYear;
  const to = uses.length ? Math.max(...uses.map(p => p.to)) : dynasty.toYear;
  const raw = [];
  for (const [field, layer] of [['polities', 'polity'], ['regions', 'region'], ['prefectures', 'prefecture']]) {
    for (const [i, item] of (s[field] ?? []).entries()) {
      const { shape, tint, ...properties } = item;
      const geometry = polygonal(shape);
      if (layer === 'polity') {
        const profile = resolveProfile(item.title, from, to, profiles);
        const polityId = profile?.key ?? `unprofiled:${dynasty.key}:${item.title}`;
        properties.polityId = polityId;
        const record = registry[polityId] ??= { key: polityId, zh: item.title, titles: [item.title], from, to, occurrences: [] };
        if (!profile) { record.from = Math.min(record.from, from); record.to = Math.max(record.to, to); }
        // Never substitute a map label anchor for a historical capital.
        const capitals = dynasty.settlements.filter(c => c.isCapital &&
          (!c.capitalPeriods || c.capitalPeriods.some(([a, b]) => a <= to && b >= from)) &&
          (c.appear == null || c.appear <= to) && (c.vanish == null || c.vanish > from) && contains(c.coord, geometry))
          .map(c => ({ name: c.ancient, coord: c.coord, periods: c.capitalPeriods ?? [[from, to]], source: 'upstream:settlement', certainty: c.capitalPeriods ? 'dated' : 'period-capital-candidate' }));
        // Some minor polities have seats in POLITY_PROFILES but no isCapital marker.
        // Keep these explicitly as candidates when the upstream gives no migration date.
        if (profile?.seatZh) {
          const places = [
            ...dynasty.settlements.map(c => ({ name: c.ancient, aliases: [c.modern, ...(c.aliases ?? [])], coord: c.coord, periods: c.capitalPeriods })),
            ...gazetteer.map(c => ({ name: c.name, aliases: [c.modern, ...(c.aliases ?? [])], coord: c.coord })),
            // A seat may have a coordinate only in another period's settlement list.
            // Its capital dates from that other dynasty are deliberately not reused.
            ...(!capitals.length ? dynasties.filter(d => d.key !== dynasty.key).flatMap(d => d.settlements.map(c => ({ name: c.ancient, aliases: [c.modern, ...(c.aliases ?? [])], coord: c.coord }))) : [])
          ];
          for (const place of places) {
            const names = [place.name, ...place.aliases].filter(n => n?.length >= 2);
            if (!names.some(n => profile.seatZh.includes(n)) || !place.coord ||
              capitals.some(c => c.coord[0] === place.coord[0] && c.coord[1] === place.coord[1])) continue;
            const periods = place.periods?.filter(([a, b]) => a <= to && b >= from);
            if (place.periods && !periods.length) continue;
            capitals.push({ name: place.name, coord: place.coord, periods: periods ?? [[from, to]], source: 'upstream:POLITY_PROFILES.seatZh+place', certainty: periods ? 'dated' : 'seat-candidate', seatText: profile.seatZh });
          }
        }
        const occurrence = record.occurrences.find(o => o.snapshot === key);
        if (occurrence) {
          occurrence.areaKm2 += areaKm2(geometry);
          for (const c of capitals) if (!occurrence.capitals.some(p => p.coord[0] === c.coord[0] && p.coord[1] === c.coord[1])) occurrence.capitals.push(c);
        } else record.occurrences.push({ snapshot: key, title: item.title, role: item.role ?? 'rival', from, to, capitals, areaKm2: areaKm2(geometry) });
        properties.capitals = capitals;
        if (item.role !== 'neighbor' && !capitals.length) missingCapitals.push(`${key} / ${polityId} / ${item.title}`);
      }
      raw.push(feature(geometry, { ...properties, id: `${key}:${layer}:${i}`, layer, sourceIndex: i, sourceTint: tint }));
    }
  }
  const collection = { type: 'FeatureCollection', features: raw };
  // All features are imported together, so shared arcs are simplified once.
  const result = await mapshaper.applyCommands('-i input.geojson -simplify weighted 30% keep-shapes -o output.geojson format=geojson geojson-type=FeatureCollection', { 'input.geojson': JSON.stringify(collection) });
  const simplified = JSON.parse(result['output.geojson']);
  if (simplified.features.length !== raw.length) throw new Error(`Simplification lost features: ${key}`);
  const entry = { key, dynastyKey: dynasty.key, from, to, uses, caption: s.caption, note: s.note, file: `snapshots/${key}.geojson`, counts: Object.fromEntries(['polity', 'region', 'prefecture'].map(layer => [layer, raw.filter(f => f.properties.layer === layer).length])) };
  writeJSON(entry.file, { ...simplified, name: key, license: 'CHGIS-derived prefecture layer: academic non-commercial use only; do not redistribute. Other layers GPL-3.0.', metadata: entry });
  index.push(entry);
}
writeJSON('snapshots', index);
// Upstream intentionally leaves s_prc empty and renders the separate DataV layer.
// Keep that boundary data separate; only derive its polity observation and area.
const modernProvinces = readJSON('modern-provinces');
const modernFeatures = modernProvinces.map(({ rings, ...p }) => feature(polygonal({ type: 'MultiPolygon', coordinates: rings }), { ...p, id: `modern-province:${p.code}` }));
const modernDynasty = dynasties.find(d => d.key === 'prc');
if (modernDynasty && index.some(s => s.key === 's_prc') && !(snapshots.s_prc.polities?.length)) {
  const key = `unprofiled:prc:${modernDynasty.title}`;
  registry[key] = { key, zh: modernDynasty.title, titles: [modernDynasty.title], from: modernDynasty.fromYear, to: modernDynasty.toYear,
    occurrences: [{ snapshot: 's_prc', title: modernDynasty.title, role: 'main', from: modernDynasty.fromYear, to: modernDynasty.toYear,
      areaKm2: modernFeatures.reduce((n, f) => n + areaKm2(f), 0), geometrySource: 'modern-provinces',
      capitals: modernDynasty.settlements.filter(c => c.isCapital).map(c => ({ name: c.ancient, coord: c.coord, periods: [[modernDynasty.fromYear, modernDynasty.toYear]], source: 'upstream:settlement', certainty: 'period-capital-candidate' })) }] };
}
writeJSON('polities', Object.values(registry));
writeJSON('neighbors.geojson', { type: 'FeatureCollection', features: snapshots.neighbors.map(({ shape, ...p }) => feature(polygonal(shape), { ...p, role: 'neighbor' })) });
writeJSON('modern-provinces.geojson', { type: 'FeatureCollection', license: 'DataV GeoAtlas terms apply', features: modernFeatures });
report('geometry.md', `# 几何导入\n\n${index.length} 个快照，mapshaper weighted 30% keep-shapes，共享弧保持拓扑。原始边界不改动；计数在简化后再次验证。面积使用简化前 WGS84 球面面积（km²）。\n\n本机生成耗时 ${((performance.now() - started) / 1000).toFixed(2)} 秒；进程最高 RSS ${(process.resourceUsage().maxRSS / 1024).toFixed(1)} MiB。\n\n所有 POLITY_PROFILES key 保留。同名以时间交集匹配；未收录政权使用 unprofiled:时期:名称。都城来自原始 isCapital / capitalPeriods 与政权档案 seatZh 的城池、地名录匹配；无迁都时间的记录标明 candidate，不把文字锚点当都城。无上游坐标证据的记录 capitals=[]，留待审校：\n\n${missingCapitals.map(x => `- ${x}`).join('\n')}\n`);
console.log(`Built ${index.length} topology-preserving snapshots; ${Object.keys(registry).length} polity records`);
