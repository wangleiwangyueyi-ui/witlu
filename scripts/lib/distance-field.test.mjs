import { describe, expect, it } from 'vitest';
import { distanceField } from './distance-field.mjs';
describe('coast distance transform', () => {
  it('equals brute force Euclidean distances including diagonal shores', () => {
    const width = 13, height = 9, mask = Uint8Array.from({ length: width * height }, (_, i) => Number(i % 17 === 0 || i === 63));
    const field = distanceField(mask, width, height);
    for (let i = 0; i < mask.length; i++) {
      let best = Infinity;
      for (let j = 0; j < mask.length; j++) if (mask[j]) best = Math.min(best, (i % width - j % width) ** 2 + (Math.floor(i / width) - Math.floor(j / width)) ** 2);
      expect(field[i]).toBe(best);
    }
  });
  it('handles all sea, all land and narrow grids', () => {
    expect([...distanceField(new Uint8Array(12).fill(1), 3, 4)]).toEqual(new Array(12).fill(0));
    expect(distanceField(new Uint8Array(12), 3, 4)[0]).toBeGreaterThan(1e10);
    expect([...distanceField(Uint8Array.from([1,0,0,0]), 1, 4)]).toEqual([0,1,4,9]);
  });
});
