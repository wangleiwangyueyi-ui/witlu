import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const OUT = path.join(ROOT, 'packages/web/public/data');
export const PROGRESS = path.join(ROOT, 'docs/progress');
const CACHE = path.join(ROOT, '.cache');
export function writeCache(name, value) { fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(path.join(CACHE, `${name}.json`), JSON.stringify(value)); }
export const readCache = name => JSON.parse(fs.readFileSync(path.join(CACHE, `${name}.json`), 'utf8'));
export function writeJSON(name, value) {
  const target = path.join(OUT, name.endsWith('.json') || name.endsWith('.geojson') ? name : `${name}.json`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value) + '\n');
}
export const readJSON = name => JSON.parse(fs.readFileSync(path.join(OUT, name.endsWith('.json') || name.endsWith('.geojson') ? name : `${name}.json`), 'utf8'));
export function report(name, text) { fs.mkdirSync(PROGRESS, { recursive: true }); fs.writeFileSync(path.join(PROGRESS, name), text); }
export function loadUpstream() {
  const context = vm.createContext({ window: {} });
  for (const name of ['map_data', 'lore_core', 'lore_detail', 'i18n_dict', 'zh_hant', 'event_pinyin', 'china_geo_data', 'atlas_snapshots']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, `upstream/js/${name}.js`), 'utf8'), context, { filename: `${name}.js`, timeout: 30_000 });
  }
  // Materialize lazy geometry getters without changing the submodule or its JS objects.
  return JSON.parse(JSON.stringify(context.window));
}
export function upstreamCommit() { return execFileSync('git', ['-C', path.join(ROOT, 'upstream'), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
export function makePhases(dynasties) {
  return dynasties.flatMap((d, di) => (d.phases?.length ? d.phases : [{ until: d.toYear, snap: `s_${d.key}` }]).map((p, i, all) => ({
    ...p, id: `${d.key}:${i}`, dynastyKey: d.key, snapshot: p.snap,
    from: i ? all[i - 1].until : d.fromYear,
    to: i === all.length - 1 ? (dynasties[di + 1]?.fromYear ?? d.toYear) : p.until,
    endExclusive: i < all.length - 1 || di < dynasties.length - 1
  })));
}
export function hydrateSnapshots(snapshots) {
  const result = structuredClone(snapshots);
  const resolve = (key, field, ref, chain = new Set()) => {
    if (chain.has(key)) throw new Error(`Circular ${ref}: ${key}`);
    const s = result[key];
    if (!s) throw new Error(`Missing snapshot reference: ${key}`);
    if (!s[field]?.length && s[ref]) { chain.add(key); s[field] = resolve(s[ref], field, ref, chain); }
    return s[field] ?? [];
  };
  for (const key of Object.keys(result).filter(k => k !== 'neighbors')) {
    for (const [field, ref] of [['prefectures', 'prefRef'], ['regions', 'regionRef']]) result[key][field] = resolve(key, field, ref);
  }
  return result;
}
export function listFiles(folder, suffix) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(f => f.isDirectory() ? listFiles(path.join(folder, f.name), suffix) : f.name.endsWith(suffix) ? [path.join(folder, f.name)] : []);
}
export const count = x => Object.keys(x ?? {}).length;
export function sourceCounts(w) {
  const l = w.ATLAS_LORE_DATA, s = hydrateSnapshots(w.ATLAS_SNAPSHOTS);
  return {
    '快照': Object.keys(s).length - 1, '时期': w.DYNASTY_DATA.length,
    '阶段': makePhases(w.DYNASTY_DATA).length,
    '大事': w.DYNASTY_DATA.reduce((n, d) => n + d.milestones.length, 0),
    '城池': w.DYNASTY_DATA.reduce((n, d) => n + d.settlements.length, 0),
    '走廊': w.CORRIDOR_DATA.length, '人物': l.PERSON_PROFILES.length,
    '人物详情': count(l.PERSON_DETAILS), '行迹': l.HISTORICAL_JOURNEYS.length,
    '行迹站点': l.HISTORICAL_JOURNEYS.reduce((n, j) => n + j.stops.length, 0),
    '雄关': l.STRATEGIC_PASSES.length, '名胜': l.PLACE_GAZETTEER.length,
    '名城题记': l.CITY_LORE.length, '政权小传': count(l.POLITY_SUMMARIES),
    '政权档案': l.POLITY_PROFILES.length, '定点大事': l.PLACE_LANDMARK_EVENTS.length,
    '年号': l.CHINESE_ERA_SPANS.length + l.REGIONAL_ERA_TRACKS.reduce((n, t) => n + t.spans.length, 0),
    '专题页': listFiles(path.join(ROOT, 'upstream/topics'), '.html').length,
    '郡州府要素': Object.entries(s).filter(([k]) => k !== 'neighbors').reduce((n, [, s]) => n + s.prefectures.length, 0),
    '一级政区要素': Object.entries(s).filter(([k]) => k !== 'neighbors').reduce((n, [, s]) => n + s.regions.length, 0),
    '政权要素': Object.entries(s).filter(([k]) => k !== 'neighbors').reduce((n, [, s]) => n + s.polities.length, 0),
    '现代省界': w.PROVINCE_OUTLINES.length, '河流': w.HYDRO_DATA.rivers.length,
    '湖泊': w.HYDRO_DATA.lakes.length, '古海岸线': w.HYDRO_DATA.paleoSea.length,
    '古琴': l.GUQIN_TRACKS.length
  };
}
