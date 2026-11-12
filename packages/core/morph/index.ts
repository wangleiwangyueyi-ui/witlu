import { fromHalf, signedDistance, toHalf } from '../edt';
export interface Seed {
    id: number;
    x: number;
    y: number;
    source: 'capital' | 'centroid';
}
export interface GrowthInput {
    a: Uint16Array;
    b: Uint16Array;
    size: number;
    seedsA: Seed[];
    seedsB: Seed[];
}
export interface GrowthResult {
    size: number;
    ids: number[];
    fields: Uint16Array;
    changed: number;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    births: number[];
    deaths: number[];
    seeds: Seed[];
    particles: Float32Array;
    bytes: number;
}
/** Labels are categorical. Zero is uncovered land / nonparticipating neighbors. */
export function buildGrowth(input: GrowthInput): GrowthResult {
    const { a, b, size } = input, n = size * size;
    if (a.length !== n || b.length !== n)
        throw new RangeError('Growth labels dimensions');
    const involved = new Set<number>(), presentA = new Set<number>(), presentB = new Set<number>();
    let changed = 0, minX = size, minY = size, maxX = 0, maxY = 0;
    for (let i = 0; i < n; i++) {
        presentA.add(a[i]!);
        presentB.add(b[i]!);
        if (a[i] !== b[i]) {
            involved.add(a[i]!);
            involved.add(b[i]!);
            changed++;
            const x = i % size, y = Math.floor(i / size);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
    }
    const ids = [...involved].sort((a, b) => a - b), fields = new Uint16Array(Math.max(1, ids.length) * n * 2), births = ids.filter(id => id !== 0 && !presentA.has(id)), deaths = ids.filter(id => id !== 0 && !presentB.has(id)), seeds: Seed[] = [];
    function field(labels: Uint16Array, id: number, missing: boolean, known: Seed[]) {
        if (!missing) {
            const mask = new Uint8Array(n);
            for (let i = 0; i < n; i++)
                mask[i] = Number(labels[i] === id);
            return signedDistance(mask, size, size);
        }
        let seed = known.find(s => s.id === id);
        if (!seed) {
            const other = labels === a ? b : a;
            let x = 0, y = 0, count = 0;
            for (let i = 0; i < n; i++)
                if (other[i] === id) {
                    x += i % size;
                    y += Math.floor(i / size);
                    count++;
                }
            seed = { id, x: x / Math.max(1, count), y: y / Math.max(1, count), source: 'centroid' };
        }
        seeds.push(seed);
        const result = new Float32Array(n);
        for (let y = 0; y < size; y++)
            for (let x = 0; x < size; x++)
                result[y * size + x] = Math.hypot(x - seed.x, y - seed.y) + .5;
        return result;
    }
    for (let layer = 0; layer < ids.length; layer++) {
        const id = ids[layer]!, fa = field(a, id, births.includes(id), input.seedsB), fb = field(b, id, deaths.includes(id), input.seedsA), offset = layer * n * 2;
        for (let i = 0; i < n; i++) {
            fields[offset + i * 2] = toHalf(fa[i]!);
            fields[offset + i * 2 + 1] = toHalf(fb[i]!);
        }
    }
    // Deterministic death-front seeds: first crossing of this polity's affine SDF
    // with the lower envelope of competitors. Reverse traversal reuses the same data.
    const particles: number[] = [];
    const stride = Math.max(1, Math.floor(changed / 5000));
    let seen = 0;
    for (let i = 0; i < n; i++) {
        if (a[i] === b[i] || seen++ % stride !== 0)
            continue;
        for (const side of [0, 1]) {
            const id = (side ? b : a)[i]!;
            if (!(side ? births : deaths).includes(id))
                continue;
            const layer = ids.indexOf(id), offset = layer * n * 2 + i * 2;
            const start = fromHalf(fields[offset + side]!), end = fromHalf(fields[offset + 1 - side]!);
            let crossing = 1;
            for (let j = 0; j < ids.length; j++) {
                if (j === layer || ids[j] === 0 && a[i] !== 0 && b[i] !== 0)
                    continue;
                const o = j * n * 2 + i * 2, s = fromHalf(fields[o + side]!), e = fromHalf(fields[o + 1 - side]!), den = (end - start) - (e - s);
                if (den > 0) {
                    const t = (s - start) / den;
                    if (t >= 0 && t <= crossing)
                        crossing = t;
                }
            }
            particles.push((i % size + .5) / size, (Math.floor(i / size) + .5) / size, crossing, side);
            if (particles.length >= 24000)
                break;
        }
        if (particles.length >= 24000)
            break;
    }
    return { size, ids, fields, changed, bounds: changed ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : { x: 0, y: 0, width: 0, height: 0 }, births, deaths, seeds, particles: new Float32Array(particles), bytes: fields.byteLength + particles.length * 4 };
}
export function ownerAt(result: GrowthResult, a: number, b: number, pixel: number, t: number) {
    if (t <= 0)
        return a;
    if (t >= 1)
        return b;
    if (a === b)
        return a;
    let score = Infinity, winner = 0;
    const n = result.size ** 2;
    for (let layer = 0; layer < result.ids.length; layer++) {
        const id = result.ids[layer]!;
        if (id === 0 && a !== 0 && b !== 0)
            continue;
        const offset = layer * n * 2 + pixel * 2, s = fromHalf(result.fields[offset]!) * (1 - t) + fromHalf(result.fields[offset + 1]!) * t;
        if (s < score - 1e-5) {
            score = s;
            winner = id;
        }
    }
    return winner;
}
export class ByteLRU<T> {
    private values = new Map<string, {
        value: T;
        bytes: number;
    }>();
    bytes = 0;
    constructor(readonly budget: number) { }
    get(key: string) { const e = this.values.get(key); if (e) {
        this.values.delete(key);
        this.values.set(key, e);
    } return e?.value; }
    set(key: string, value: T, bytes: number) { this.delete(key); if (bytes > this.budget)
        return; this.values.set(key, { value, bytes }); this.bytes += bytes; while (this.bytes > this.budget)
        this.delete(this.values.keys().next().value!); }
    delete(key: string) { const e = this.values.get(key); if (e)
        this.bytes -= e.bytes; this.values.delete(key); }
    get size() { return this.values.size; }
}
