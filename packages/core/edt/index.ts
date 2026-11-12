/** Felzenszwalb/Huttenlocher exact squared Euclidean distance transform. */
export function squaredDistance(mask: ArrayLike<number>, width: number, height: number, target = true): Float32Array {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || mask.length !== width * height)
        throw new RangeError('Invalid distance grid');
    const out = new Float32Array(mask.length), n = Math.max(width, height), f = new Float64Array(n), d = new Float64Array(n), sites = new Int32Array(n), cuts = new Float64Array(n + 1);
    const far = (width * width + height * height) * 4;
    for (let i = 0; i < out.length; i++)
        out[i] = Boolean(mask[i]) === target ? 0 : far;
    const transform = (size: number) => {
        let k = 0;
        sites[0] = 0;
        cuts[0] = -Infinity;
        cuts[1] = Infinity;
        for (let q = 1; q < size; q++) {
            let p = sites[k]!, s = (f[q]! + q * q - f[p]! - p * p) / (2 * (q - p));
            while (k > 0 && s <= cuts[k]!) {
                p = sites[--k]!;
                s = (f[q]! + q * q - f[p]! - p * p) / (2 * (q - p));
            }
            sites[++k] = q;
            cuts[k] = s;
            cuts[k + 1] = Infinity;
        }
        k = 0;
        for (let q = 0; q < size; q++) {
            while (cuts[k + 1]! < q)
                k++;
            const p = sites[k]!;
            d[q] = (q - p) ** 2 + f[p]!;
        }
    };
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++)
            f[x] = out[y * width + x]!;
        transform(width);
        for (let x = 0; x < width; x++)
            out[y * width + x] = d[x]!;
    }
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++)
            f[y] = out[y * width + x]!;
        transform(height);
        for (let y = 0; y < height; y++)
            out[y * width + x] = d[y]!;
    }
    return out;
}
/** Negative inside; boundary lies halfway between opposite pixel centres. */
export function signedDistance(mask: ArrayLike<number>, width: number, height: number) {
    const inside = squaredDistance(mask, width, height, true), outside = squaredDistance(mask, width, height, false);
    for (let i = 0; i < inside.length; i++)
        inside[i] = mask[i] ? .5 - Math.sqrt(outside[i]!) : Math.sqrt(inside[i]!) - .5;
    return inside;
}
/** IEEE 754 binary16, round-to-nearest-even; independent of host Float16 support. */
const scratch = new Float32Array(1), bits = new Uint32Array(scratch.buffer);
export function toHalf(value: number) {
    scratch[0] = value;
    const b = bits[0]!, sign = (b >>> 16) & 0x8000, exp = (b >>> 23) & 255, fraction = b & 0x7fffff;
    if (exp === 255)
        return sign | (fraction ? 0x7e00 : 0x7c00);
    let e = exp - 127 + 15, m = fraction;
    if (e >= 31)
        return sign | 0x7c00;
    if (e <= 0) {
        if (e < -10)
            return sign;
        m |= 0x800000;
        const shift = 14 - e, rounded = (m + (2 ** (shift - 1) - 1) + ((m >>> shift) & 1)) >>> shift;
        return sign | rounded;
    }
    m += 0xfff + ((m >>> 13) & 1);
    if (m & 0x800000) {
        m = 0;
        e++;
    }
    return sign | (e << 10) | (m >>> 13);
}
export function fromHalf(value: number) { const sign = value & 0x8000 ? -1 : 1, exp = (value >>> 10) & 31, m = value & 1023; return sign * (exp === 0 ? m * 2 ** -24 : exp === 31 ? m ? NaN : Infinity : (1 + m / 1024) * 2 ** (exp - 15)); }
