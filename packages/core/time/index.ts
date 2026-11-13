/** Historical years use -1, 1 at the BCE/CE boundary. Indices are continuous. */
export * from './chronology';
export * from './chapters';
export function yearToIndex(year: number): number {
  if (!Number.isInteger(year) || year === 0) throw new RangeError('Historical years must be nonzero integers; use an index for interpolation');
  return year < 0 ? year + 1 : year;
}
export function indexToYear(index: number): number {
  if (!Number.isInteger(index)) throw new RangeError('A calendar year requires an integer index; keep fractional indices for interpolation');
  return index <= 0 ? index - 1 : index;
}
export function addYears(year: number, delta: number): number {
  if (!Number.isInteger(delta)) throw new RangeError('Year steps must be integers');
  return indexToYear(yearToIndex(year) + delta);
}
export interface SnapshotKeyframe { snapshot: string; year: number }
export interface SnapshotBlend { snapshotA: string; snapshotB: string; t: number }
export function createSnapshotTimeline(frames: readonly SnapshotKeyframe[]) {
  if (!frames.length) throw new RangeError('At least one snapshot is required');
  const points = frames.map(f => ({ ...f, index: yearToIndex(f.year) }));
  for (let i = 1; i < points.length; i++) {
    if (points[i]!.index <= points[i - 1]!.index) throw new RangeError('Keyframes must be strictly ordered');
  }
  return (index: number): SnapshotBlend => {
    if (!Number.isFinite(index)) throw new RangeError('Index must be finite');
    const first = points[0]!, last = points[points.length - 1]!;
    if (index <= first.index) return { snapshotA: first.snapshot, snapshotB: first.snapshot, t: 0 };
    if (index >= last.index) return { snapshotA: last.snapshot, snapshotB: last.snapshot, t: 0 };
    let lo = 0, hi = points.length - 1;
    while (lo + 1 < hi) { const mid = (lo + hi) >>> 1; if (points[mid]!.index <= index) lo = mid; else hi = mid; }
    const a = points[lo]!, b = points[hi]!;
    return { snapshotA: a.snapshot, snapshotB: b.snapshot, t: (index - a.index) / (b.index - a.index) };
  };
}
export function yearToSnapshots(year: number, frames: readonly SnapshotKeyframe[]): SnapshotBlend {
  return createSnapshotTimeline(frames)(yearToIndex(year));
}
export interface Phase { from: number; to: number; snapshot: string }
/** Boundaries belong to the later phase. This lookup is for event attribution. */
export function phaseAtYear(year: number, phases: readonly Phase[]): Phase | undefined {
  yearToIndex(year);
  return [...phases].reverse().find(p => year >= p.from && year <= p.to);
}
export function transitionPolicy(from: number, to: number, mode: 'drag' | 'play' | 'jump', speed = 0, reducedMotion = false) {
  const distance = Math.abs(yearToIndex(to) - yearToIndex(from));
  if (!Number.isFinite(speed)) throw new RangeError('Speed must be finite');
  if (reducedMotion || (mode === 'drag' && Math.abs(speed) > 300)) return { effect: 'crossfade', durationMs: 120 } as const;
  if (mode === 'drag') return { effect: 'scrub', durationMs: 0 } as const;
  return { effect: distance > 300 ? 'cloud' : 'growth', durationMs: Math.round(900 + Math.min(distance / 300, 1) * 500) } as const;
}
