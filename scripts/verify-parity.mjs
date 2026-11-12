import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { OUT, PROGRESS, loadUpstream, hydrateSnapshots, readJSON, sourceCounts, upstreamCommit, report } from './lib/upstream.mjs';
const w = loadUpstream(), source = sourceCounts(w), snapshots = readJSON('snapshots');
// Count actual output contents, never the importer's manifest counts.
const geometries = snapshots.map(s => readJSON(s.file));
const eras = readJSON('eras'), loreChunks = readJSON('city-lore/index');
const target = {
  '快照': snapshots.length, '时期': readJSON('dynasties').length, '阶段': readJSON('phases').length,
  '大事': readJSON('milestones').length, '城池': readJSON('settlements').length,
  '走廊': readJSON('corridors').length, '人物': readJSON('persons').length,
  '人物详情': Object.keys(readJSON('person-details')).length,
  '行迹': readJSON('journeys').length, '行迹站点': readJSON('journeys').reduce((n, j) => n + j.stops.length, 0),
  '雄关': readJSON('passes').length, '名胜': readJSON('gazetteer').length,
  '名城题记': loreChunks.reduce((n, c) => n + readJSON(c.file).length, 0),
  '政权小传': Object.keys(readJSON('polity-summaries')).length, '政权档案': readJSON('polity-profiles').length,
  '定点大事': readJSON('landmark-events').length,
  '年号': eras.main.length + eras.regional.reduce((n, t) => n + t.spans.length, 0),
  '专题页': readJSON('topics').filter(t => t.html && t.title && t.key).length,
  '郡州府要素': geometries.reduce((n, g) => n + g.features.filter(f => f.properties.layer === 'prefecture').length, 0),
  '一级政区要素': geometries.reduce((n, g) => n + g.features.filter(f => f.properties.layer === 'region').length, 0),
  '政权要素': geometries.reduce((n, g) => n + g.features.filter(f => f.properties.layer === 'polity').length, 0),
  '现代省界': readJSON('modern-provinces.geojson').features.length,
  '河流': readJSON('rivers').rivers.length, '湖泊': readJSON('rivers').lakes.length,
  '古海岸线': readJSON('rivers').paleoSea.length, '古琴': readJSON('guqin').length
};
const failures = [];
for (const [key, expected] of Object.entries(source)) if (!Number.isFinite(target[key]) || target[key] < expected) failures.push(`${key}: ${target[key]} < ${expected}`);
// Snapshot-by-snapshot guards prevent a duplicate from hiding a missing snapshot/layer.
const hydrated = hydrateSnapshots(w.ATLAS_SNAPSHOTS);
if (new Set(snapshots.map(s => s.key)).size !== snapshots.length) failures.push('Duplicate snapshot keys');
for (const [key, raw] of Object.entries(hydrated)) {
  if (key === 'neighbors') continue;
  const entry = snapshots.find(s => s.key === key);
  if (!entry) { failures.push(`Missing snapshot ${key}`); continue; }
  const g = readJSON(entry.file);
  for (const [field, layer] of [['polities', 'polity'], ['regions', 'region'], ['prefectures', 'prefecture']]) {
    if (g.features.filter(f => f.properties.layer === layer).length < (raw[field]?.length ?? 0)) failures.push(`${key}: missing ${layer}`);
  }
  for (const f of g.features) if (!f.geometry?.coordinates?.length) failures.push(`Empty geometry ${f.properties.id}`);
}
try {
  assert.equal(readJSON('manifest').upstreamCommit, upstreamCommit());
  for (const [name, original] of [['i18n', { en: w.EN_LOCALE, hant: w.ZH_HANT_CONV }], ['pinyin', w.ATLAS_EVENT_PINYIN]]) assert.deepEqual(readJSON(name), original);
  const events = readJSON('events'), moods = readJSON('moods');
  assert.equal(events.length, source['大事'] + source['定点大事'] + source['行迹站点']);
  assert.equal(new Set(events.map(e => e.id)).size, events.length);
  assert.equal(moods.length, events.length);
  assert(events.every(e => 'regime' in e && e.lane && [1, 2, 3].includes(e.importance) && e.mood));
  for (const t of readJSON('guqin')) assert(fs.statSync(path.join(OUT, '..', t.mp3)).size > 0);
  const colors = readJSON('polity-colors');
  assert.equal(colors.length, snapshots.length);
  for (const c of colors) {
    assert(c.saturatedColorCount <= 5);
    for (const item of c.colors) {
      if (item.role === 'main') assert.equal(item.color, '#F2C46D');
      if (item.role === 'neighbor') assert.equal(item.fill, null);
      if (item.role === 'protectorate') { assert.equal(item.fillOpacity, 0.18); assert.equal(item.pattern, 'diagonal'); }
    }
    for (const [a, b] of c.adjacency) {
      const ca = c.colors.find(x => x.polityId === a), cb = c.colors.find(x => x.polityId === b);
      if (ca.fill && cb.fill) assert.notEqual(ca.color, cb.color);
    }
  }
  for (const p of readJSON('polities')) assert.equal(new Set(p.occurrences.map(o => o.snapshot)).size, p.occurrences.length);
} catch (e) { failures.push(e.message); }
const table = `| 项目 | 固定上游 | 新站产物 | 结果 |\n|---|---:|---:|---|\n${Object.entries(source).map(([k, n]) => `| ${k} | ${n} | ${target[k]} | ${target[k] >= n ? '通过' : '失败'} |`).join('\n')}`;
const content = `# 数据完整性对照\n\n固定上游：\`${upstreamCommit()}\`。所有数量从固定上游与实际构建产物分别计算，按快照累计各图层（含 prefRef / regionRef 继承），无历史年份截断。专题页计数表示保留的完整 HTML 数据，路由重制属于 P10。\n\n${table}\n\n${failures.length ? `失败：\n${failures.map(f => `- ${f}`).join('\n')}` : 'PASS：计数全部不少于上游；附加逐快照完整性、事件、音频与颜色断言通过。'}\n`;
report('parity.md', content);
const p0Path = path.join(PROGRESS, 'P0.md');
const before = fs.existsSync(p0Path) ? fs.readFileSync(p0Path, 'utf8') : '# P0 · 工程与数据\n';
const block = `<!-- parity:start -->\n${table}\n<!-- parity:end -->`;
report('P0.md', before.includes('<!-- parity:start -->') ? before.replace(/<!-- parity:start -->[\s\S]*?<!-- parity:end -->/, block) : `${before}\n${block}\n`);
console.log(table);
if (failures.length) throw new Error(failures.join('\n'));
