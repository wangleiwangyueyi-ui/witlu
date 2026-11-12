import { describe, expect, it } from 'vitest';
import { fromHalf, signedDistance, squaredDistance, toHalf } from './index';
describe('exact signed Euclidean distance', () => {
    it('keeps half precision error below one pixel throughout the supported grid diagonal', () => {
        let maximum=0;
        for(let n=-1448;n<=1448;n+=.125)maximum=Math.max(maximum,Math.abs(fromHalf(toHalf(n))-n));
        expect(maximum).toBeLessThan(1);
        expect(fromHalf(toHalf(1+2**-11))).toBe(1);
        expect(fromHalf(toHalf(1+3*2**-11))).toBe(1+2**-9);
        expect(fromHalf(toHalf(2**-25))).toBe(0);
    });
    it('matches a brute force oracle at every pixel, including holes and diagonals', () => {
        for (const [w, h] of [[1, 9], [11, 1], [17, 13], [25, 29]] as const) {
            const mask = Uint8Array.from({ length: w * h }, (_, i) => Number((i * 31 + i * i) % 17 < 7));
            const field = signedDistance(mask, w, h);
            for (let i = 0; i < mask.length; i++) {
                let d = Infinity;
                for (let j = 0; j < mask.length; j++)
                    if (mask[i] !== mask[j])
                        d = Math.min(d, Math.hypot(i % w - j % w, Math.floor(i / w) - Math.floor(j / w)));
                expect(Math.abs(field[i]! - (d - .5) * (mask[i] ? -1 : 1))).toBeLessThan(.0001);
            }
        }
    });
    it('handles empty/full masks and validates dimensions', () => { expect(signedDistance(new Uint8Array(9), 3, 3).every(x => x > 0 && Number.isFinite(x))).toBe(true); expect(signedDistance(new Uint8Array(9).fill(1), 3, 3).every(x => x < 0)).toBe(true); expect(() => squaredDistance([], 0, 2)).toThrow(); expect(() => squaredDistance([1], 2, 2)).toThrow(); });
    it('packs subnormal, finite and exceptional binary16 values with <1px grid error', () => { for (const n of [0, -0, 1, -1, .00001, 1023.75, 1448.1, -1448.1])
        expect(Math.abs(fromHalf(toHalf(n)) - n)).toBeLessThan(.51); expect(fromHalf(toHalf(Infinity))).toBe(Infinity); expect(fromHalf(toHalf(-Infinity))).toBe(-Infinity); expect(fromHalf(toHalf(NaN))).toBeNaN(); });
});
