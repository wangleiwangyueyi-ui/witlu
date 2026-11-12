import { describe, expect, it } from 'vitest';
import { colorGraph } from './coloring.mjs';
import { classifyMood } from './moods.mjs';
import { hydrateSnapshots, makePhases } from './upstream.mjs';
import { resolveProfile, contains } from './geometry.mjs';
import { hasHardcodedColor } from './style-rules.mjs';
describe('color token enforcement', () => {
  it.each(['color: #808080', 'color: gray', 'fill="black"', 'background: rgb(0 0 0)', 'color: oklch(50% 0 0)'])('rejects %s', text => expect(hasHardcodedColor(text)).toBe(true));
  it('allows tokens and inherited colors', () => expect(hasHardcodedColor('color: var(--text); fill: currentColor; background: transparent')).toBe(false));
});
describe('coloring', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const edges = ids.flatMap((a, i) => ids.slice(i + 1).map(b => [a, b]));
  it('uses a fourth color for K4 and rejects K5', () => {
    expect(colorGraph(ids, edges, ['1', '2', '3'])).toBeNull();
    expect(new Set(Object.values(colorGraph(ids, edges, ['1', '2', '3', '4']))).size).toBe(4);
    expect(colorGraph([...ids, 'e'], [...edges, ...ids.map(a => [a, 'e'])], ['1', '2', '3', '4'])).toBeNull();
  });
  it('retains previous assignments when possible', () => expect(colorGraph(['a', 'b'], [['a', 'b']], ['1', '2', '3'], { a: '3', b: '2' })).toEqual({ a: '3', b: '2' }));
});
describe('sensitive mood overrides', () => {
  it.each(['南京大屠杀', '旅顺屠杀后战役火攻', '重庆大轰炸', '某地惨案'])('%s remains solemn', title => expect(classifyMood({ title, year: 1937 }).mood).toBe('solemn'));
  it.each([['赤壁之战', 'fire'], ['长平之战', 'sorrow'], ['秦统一', 'glory'], ['黄河改道', 'disaster'], ['未知事件', 'none']])('%s → %s', (title, mood) => expect(classifyMood({ title, year: 200 }).mood).toBe(mood));
});
describe('upstream data semantics', () => {
  it('resolves chained references and detects cycles without mutation', () => {
    const a = { a: { prefectures: [1] }, b: { prefRef: 'a' }, c: { prefRef: 'b' } };
    expect(hydrateSnapshots(a).c.prefectures).toEqual([1]); expect(a.b.prefectures).toBeUndefined();
    expect(() => hydrateSnapshots({ a: { prefRef: 'b' }, b: { prefRef: 'a' } })).toThrow();
  });
  it('keeps same-named polities separate by historical interval', () => {
    const profiles = [{ key: 'early', titles: ['魏'], from: -400, to: -225 }, { key: 'late', titles: ['魏'], from: 220, to: 265 }];
    expect(resolveProfile('魏', 230, 240, profiles).key).toBe('late');
    expect(resolveProfile('魏', -300, -250, profiles).key).toBe('early');
    expect(resolveProfile('test', 1931, 1931, [{ key: 'extended', titles: ['test'], from: 1932, matchFrom: 1931, to: 1945 }]).key).toBe('extended');
  });
  it('includes the modern final period without a cutoff', () => {
    const phases = makePhases([{ key: 'a', fromYear: -1, toYear: 1, phases: [{ snap: 'a', until: 1 }] }, { key: 'b', fromYear: 1, toYear: 2026 }]);
    expect(phases[1]).toMatchObject({ from: 1, to: 2026, endExclusive: false });
  });
  it('respects polygon holes and multiple islands', () => {
    const shape = { type: 'MultiPolygon', coordinates: [[[[0,0],[4,0],[4,4],[0,4]], [[1,1],[2,1],[2,2],[1,2]]], [[[10,10],[11,10],[11,11],[10,11]]]] };
    expect(contains([1.5,1.5], shape)).toBe(false); expect(contains([10.5,10.5], shape)).toBe(true);
  });
});
