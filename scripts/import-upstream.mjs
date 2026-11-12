import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, loadUpstream, makePhases, hydrateSnapshots, upstreamCommit, sourceCounts, writeJSON, writeCache, listFiles } from './lib/upstream.mjs';
const w = loadUpstream(), lore = w.ATLAS_LORE_DATA;
const dynasties = w.DYNASTY_DATA;
writeJSON('dynasties', dynasties);
writeJSON('phases', makePhases(dynasties));
for (const name of ['milestones', 'settlements']) writeJSON(name, dynasties.flatMap(d => d[name].map((item, index) => ({ ...item, id: `${name}:${d.key}:${index}`, dynastyKey: d.key }))));
const names = { passes: 'STRATEGIC_PASSES', gazetteer: 'PLACE_GAZETTEER', persons: 'PERSON_PROFILES', journeys: 'HISTORICAL_JOURNEYS', 'polity-profiles': 'POLITY_PROFILES', 'polity-summaries': 'POLITY_SUMMARIES', 'landmark-events': 'PLACE_LANDMARK_EVENTS', 'person-details': 'PERSON_DETAILS', 'pass-details': 'PASS_DETAILS' };
for (const [name, key] of Object.entries(names)) writeJSON(name, lore[key]);
writeJSON('eras', { main: lore.CHINESE_ERA_SPANS, regional: lore.REGIONAL_ERA_TRACKS });
writeJSON('corridors', w.CORRIDOR_DATA);
writeJSON('rivers', w.HYDRO_DATA);
writeJSON('modern-provinces', w.PROVINCE_OUTLINES);
writeJSON('i18n', { en: w.EN_LOCALE, hant: w.ZH_HANT_CONV });
writeJSON('pinyin', w.ATLAS_EVENT_PINYIN);
const chunks = [];
for (let i = 0; i < lore.CITY_LORE.length; i += 24) {
  const file = `city-lore/${String(chunks.length).padStart(3, '0')}.json`;
  const items = lore.CITY_LORE.slice(i, i + 24);
  writeJSON(file, items); chunks.push({ file, count: items.length, cities: items.map(c => c.modern) });
}
writeJSON('city-lore/index', chunks);
const sources = {};
for (const file of listFiles(path.join(ROOT, 'upstream/data/sources'), '.json')) {
  const rel = path.relative(path.join(ROOT, 'upstream/data/sources'), file).replaceAll('\\', '/');
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  sources[rel] = value; writeJSON(`sources/${rel}`, value);
}
writeJSON('sources', sources);
const topics = listFiles(path.join(ROOT, 'upstream/topics'), '.html').map(file => {
  const html = fs.readFileSync(file, 'utf8');
  return { key: path.basename(file, '.html'), sourcePath: path.relative(path.join(ROOT, 'upstream'), file).replaceAll('\\', '/'), title: html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '', html };
});
// Preserve the complete topic content for the P10 restyle; these are data, not new routes yet.
writeJSON('topics', topics);
const audioDir = path.join(ROOT, 'packages/web/public/assets/audio');
fs.mkdirSync(audioDir, { recursive: true });
writeJSON('guqin', lore.GUQIN_TRACKS.map(track => {
  const source = path.join(ROOT, 'upstream', track.mp3);
  if (!fs.existsSync(source)) throw new Error(`Missing self-hosted audio: ${source}`);
  fs.copyFileSync(source, path.join(audioDir, path.basename(source)));
  const { ogg, ...rest } = track;
  return { ...rest, mp3: `/${track.mp3}`, sourceOgg: ogg };
}));
// Intermediate retains ALL layers, including snapshots unused by the current timeline.
writeCache('snapshots-raw', hydrateSnapshots(w.ATLAS_SNAPSHOTS));
// Migrate the intermediate from early P0 runs; it must not inflate the public build.
fs.rmSync(path.join(OUT, 'snapshots-raw.json'), { force: true });
writeJSON('manifest', { schemaVersion: 1, upstreamCommit: upstreamCommit(), counts: sourceCounts(w), disclaimer: '历史疆域为示意性近似，非测绘边界', license: 'GPL-3.0; CHGIS and DataV layers retain their own terms', withPrefectures: true });
console.log(`Imported all upstream datasets into ${OUT}`);
