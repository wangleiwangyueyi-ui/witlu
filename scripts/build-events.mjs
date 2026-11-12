import { readJSON, readCache, writeJSON, report } from './lib/upstream.mjs';
import { contains, resolveProfile } from './lib/geometry.mjs';
const phases = readJSON('phases'), snapshots = readJSON('snapshots'), raw = readCache('snapshots-raw'), profiles = readJSON('polity-profiles');
const registry = readJSON('polities'), modern = readJSON('modern-provinces.geojson');
const geometry = new Map(snapshots.map(s => [s.key, readJSON(s.file).features.filter(f => f.properties.layer === 'polity')]));
const records = [
  ...readJSON('milestones').map(e => ({ ...e, kind: 'milestone', title: e.headline })),
  ...readJSON('landmark-events').map((e, i) => ({ ...e, id: `landmark:${e.id ?? i}:${i}`, upstreamId: e.id, kind: 'landmark', title: e.zh })),
  ...readJSON('journeys').flatMap(j => j.stops.map((s, i) => ({ ...s, id: `journey:${j.key}:${i}`, dynastyKey: j.dynastyKey, journeyKey: j.key, kind: 'journey', title: s.titleZh })))
];
let unresolved = 0;
for (const e of records) {
  const phase = phases.find(p => p.dynastyKey === e.dynastyKey && e.year >= p.from && (p.endExclusive ? e.year < p.to : e.year <= p.to)) ??
    [...phases].reverse().find(p => e.year >= p.from && (p.endExclusive ? e.year < p.to : e.year <= p.to));
  e.snapshot = phase?.snapshot ?? null;
  const features = geometry.get(e.snapshot) ?? [];
  const explicit = e.eraRegime && (profiles.find(p => p.key === e.eraRegime && p.from <= e.year && p.to >= e.year) ?? resolveProfile(e.eraRegime, e.year, e.year, profiles));
  const atPoint = f => contains(e.coord, raw[e.snapshot].polities[f.properties.sourceIndex].shape);
  const hit = explicit ? null : features.find(f => f.properties.role !== 'neighbor' && atPoint(f)) ?? features.find(atPoint);
  const modernPolity = !explicit && !hit && registry.find(p => p.occurrences.some(o => o.snapshot === e.snapshot && o.geometrySource === 'modern-provinces'));
  const modernHit = modernPolity && modern.features.some(f => contains(e.coord, f));
  e.regime = explicit?.key ?? hit?.properties.polityId ?? (modernHit ? modernPolity.key : null);
  e.regimeMethod = explicit ? 'eraRegime' : hit ? 'point-in-polygon' : modernHit ? 'modern-province-point-in-polygon' : 'unresolved';
  // Unknown attribution stays explicit, rather than pretending every event belongs to main.
  e.lane = e.regime ?? `unattributed:${e.dynastyKey ?? 'unknown'}`;
  e.importance = e.isMapChange || /统一|灭亡|建立|称帝|大屠杀|之变|之战/.test(e.title ?? '') ? 3 : e.kind === 'milestone' ? 2 : 1;
  if (!e.regime) unresolved++;
}
writeJSON('events', records);
writeJSON('coexistence', registry.map(p => {
  const observations = p.occurrences.map(o => ({ snapshot: o.snapshot, from: o.from, to: o.to, areaKm2: o.areaKm2, role: o.role, capitals: o.capitals, geometrySource: o.geometrySource ?? 'snapshot' }));
  const stages = phases.flatMap(phase => p.occurrences.filter(o => o.snapshot === phase.snapshot).map(o => ({ phase: phase.id, snapshot: phase.snapshot, from: phase.from, to: phase.to, endExclusive: phase.endExclusive, areaKm2: o.areaKm2, role: o.role, capitals: o.capitals, geometrySource: o.geometrySource ?? 'snapshot' })));
  return { key: p.key, title: p.zh, from: p.from, to: p.to, intervalSource: p.key.startsWith('unprofiled:') ? 'snapshot-observation' : 'POLITY_PROFILES', observations, stages };
}));
report('events.md', `# 事件归属\n\n全部 ${records.length} 条（大事、定点大事、行迹站点），优先 eraRegime，其次原始边界点面判断。未匹配 ${unresolved} 条，regime=null，使用独立待归属轨道，不猜测所属政权。importance 1–3：地图变化 / 一统 / 灭亡 / 建立 / 称帝 / 重大战变为 3，大事为 2，其余为 1。\n\n${records.filter(e => !e.regime).map(e => `- ${e.id} · ${e.year} · ${e.title}`).join('\n')}\n`);
console.log(`Attributed ${records.length} events (${unresolved} require review)`);
