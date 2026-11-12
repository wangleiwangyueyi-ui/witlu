import { describe, expect, it } from 'vitest';
import { addYears, createSnapshotTimeline, indexToYear, phaseAtYear, transitionPolicy, yearToIndex, yearToSnapshots } from './index';
describe('historical time without year zero', () => {
  it('round trips every covered integer year', () => {
    for (let y = -403; y <= 2026; y++) if (y) expect(indexToYear(yearToIndex(y))).toBe(y);
  });
  it('steps continuously across the era boundary in both directions', () => {
    expect(yearToIndex(-1)).toBe(0); expect(yearToIndex(1)).toBe(1);
    expect(addYears(-1, 1)).toBe(1); expect(addYears(1, -1)).toBe(-1);
    expect(addYears(-10, 20)).toBe(11);
  });
  it.each([0, 0.5, -0.5, NaN, Infinity, -Infinity])('rejects invalid year %s', y => expect(() => yearToIndex(y)).toThrow());
  it.each([NaN, Infinity, -Infinity, 0.5, -0.5])('rejects invalid calendar index %s', i => expect(() => indexToYear(i)).toThrow());
  it('validates step sizes', () => expect(() => addYears(1, 0.5)).toThrow());
});
describe('reversible snapshot interpolation', () => {
  const frames = [{ year: -2, snapshot: 'a' }, { year: 2, snapshot: 'b' }, { year: 10, snapshot: 'c' }];
  const lookup = createSnapshotTimeline(frames);
  it('clamps and assigns exact keyframes to the later snapshot', () => {
    expect(lookup(-100)).toEqual({ snapshotA: 'a', snapshotB: 'a', t: 0 });
    expect(yearToSnapshots(2, frames)).toEqual({ snapshotA: 'b', snapshotB: 'c', t: 0 });
    expect(lookup(100)).toEqual({ snapshotA: 'c', snapshotB: 'c', t: 0 });
  });
  it('counts three intervals between 2 BCE and 2 CE', () => {
    expect(yearToSnapshots(-1, frames).t).toBeCloseTo(1 / 3);
    expect(yearToSnapshots(1, frames).t).toBeCloseTo(2 / 3);
    expect(lookup(0.5).t).toBe(0.5);
  });
  it('supports fractional indices, reverse scrubbing, and repeated snapshots', () => {
    const values = [-1, 0, 0.2, 1, 2, 6, 10];
    expect([...values].reverse().map(lookup).reverse()).toEqual(values.map(lookup));
    expect(createSnapshotTimeline([{ year: 1, snapshot: 'a' }, { year: 2, snapshot: 'a' }])(1.5).t).toBe(0.5);
    expect(createSnapshotTimeline([{ year: 1, snapshot: 'a' }])(2)).toEqual({ snapshotA: 'a', snapshotB: 'a', t: 0 });
  });
  it('rejects empty, unsorted, duplicate, invalid input', () => {
    expect(() => createSnapshotTimeline([])).toThrow();
    expect(() => createSnapshotTimeline([...frames].reverse())).toThrow();
    expect(() => createSnapshotTimeline([frames[0]!, frames[0]!])).toThrow();
    expect(() => createSnapshotTimeline([{ year: 0, snapshot: 'x' }])).toThrow();
    expect(() => lookup(NaN)).toThrow();
  });
  it('keeps historical phase attribution discrete', () => {
    const p = [{ from: -10, to: 1, snapshot: 'a' }, { from: 1, to: 10, snapshot: 'b' }];
    expect(phaseAtYear(1, p)?.snapshot).toBe('b'); expect(phaseAtYear(-1, p)?.snapshot).toBe('a');
    expect(phaseAtYear(11, p)).toBeUndefined();
  });
});
describe('PLAN 6.5 transition policy', () => {
  it('provides drag, playback, jump, fast-drag and motion reduction policies', () => {
    expect(transitionPolicy(1, 2, 'drag')).toEqual({ effect: 'scrub', durationMs: 0 });
    expect(transitionPolicy(1, 2, 'drag', -301)).toEqual({ effect: 'crossfade', durationMs: 120 });
    expect(transitionPolicy(1, 301, 'jump')).toEqual({ effect: 'growth', durationMs: 1400 });
    expect(transitionPolicy(1, 302, 'jump').effect).toBe('cloud');
    expect(transitionPolicy(-1, 300, 'play').effect).toBe('growth');
    expect(transitionPolicy(1, 302, 'jump', 0, true).effect).toBe('crossfade');
    expect(transitionPolicy(1, 1, 'play').durationMs).toBe(900);
    expect(() => transitionPolicy(1, 2, 'drag', NaN)).toThrow();
  });
});
