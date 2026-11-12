import { expect, it } from 'vitest';
import { buildGrowth, ByteLRU, ownerAt } from './index';
it('has exact endpoints, no uncovered cracks and symmetric forward/reverse ownership', () => {
    const size = 19, a = Uint16Array.from({ length: size * size }, (_, i) => i % size < 9 ? 1 : 2), b = Uint16Array.from(a, (_, i) => i % size < 12 ? 1 : 3);
    const input = { a, b, size, seedsA: [{ id: 2, x: 15, y: 9, source: 'capital' as const }], seedsB: [{ id: 3, x: 15, y: 9, source: 'capital' as const }] };
    const f = buildGrowth(input), r = buildGrowth({ ...input, a: b, b: a, seedsA: input.seedsB, seedsB: input.seedsA });
    for (let i = 0; i < a.length; i++)
        for (let k = 0; k <= 10; k++) {
            const t = k / 10, owner = ownerAt(f, a[i]!, b[i]!, i, t);
            expect(owner).toBeGreaterThan(0);
            expect(owner).toBe(ownerAt(r, b[i]!, a[i]!, i, 1 - t));
            if (k === 0)
                expect(owner).toBe(a[i]);
            if (k === 10)
                expect(owner).toBe(b[i]);
        }
    expect(f.births).toEqual([3]);
    expect(f.deaths).toEqual([2]);
    expect(f.seeds.every(s => s.source === 'capital')).toBe(true);
});
it('falls back explicitly when capital coordinates are unavailable and caches within byte budget', () => { const a = new Uint16Array(16), b = new Uint16Array(16).fill(1), f = buildGrowth({ a, b, size: 4, seedsA: [], seedsB: [] }); expect(f.seeds[0]!.source).toBe('centroid'); const lru = new ByteLRU<number>(10); lru.set('a', 1, 4); lru.set('b', 2, 4); lru.get('a'); lru.set('c', 3, 4); expect(lru.get('b')).toBeUndefined(); expect(lru.bytes).toBe(8); lru.set('huge', 4, 20); expect(lru.size).toBe(2); });
