import { expect, it } from 'vitest';
import { closestSheetSnap, sheetOffsets } from './sheet-model';
it('has three reachable states at phone sizes', () => {
  for (const height of [664, 844, 915]) { const { offsets } = sheetOffsets(height); expect(offsets[0]).toBeGreaterThan(offsets[1]); expect(offsets[1]).toBeGreaterThan(offsets[2]); }
});
it('settles near the release point at low speed and follows flick velocity', () => {
  const { offsets } = sheetOffsets(844);
  expect(closestSheetSnap(offsets[1], 0, offsets)).toBe(1);
  expect(closestSheetSnap(offsets[1], -1500, offsets)).toBe(2);
  expect(closestSheetSnap(offsets[1], 1500, offsets)).toBe(0);
});
