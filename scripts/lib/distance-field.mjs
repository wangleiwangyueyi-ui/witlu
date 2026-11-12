/** Exact squared Euclidean distance, Felzenszwalb/Huttenlocher separable EDT. */
export function distanceField(mask, width, height) {
  if (mask.length !== width * height) throw new RangeError('Mask dimensions do not match');
  const field = new Float32Array(mask.length), length = Math.max(width, height);
  const f = new Float64Array(length), d = new Float64Array(length), sites = new Int32Array(length), cuts = new Float64Array(length + 1);
  for (let i = 0; i < field.length; i++) field[i] = mask[i] ? 0 : 1e12;
  function transform(n) {
    let k = 0; sites[0] = 0; cuts[0] = -Infinity; cuts[1] = Infinity;
    for (let q = 1; q < n; q++) {
      let p = sites[k], s = ((f[q] + q * q) - (f[p] + p * p)) / (2 * (q - p));
      while (s <= cuts[k] && k > 0) { k--; p = sites[k]; s = ((f[q] + q * q) - (f[p] + p * p)) / (2 * (q - p)); }
      k++; sites[k] = q; cuts[k] = s; cuts[k + 1] = Infinity;
    }
    k = 0; for (let q = 0; q < n; q++) { while (cuts[k + 1] < q) k++; const p = sites[k]; d[q] = (q - p) ** 2 + f[p]; }
  }
  for (let y = 0; y < height; y++) { for (let x = 0; x < width; x++) f[x] = field[y * width + x]; transform(width); for (let x = 0; x < width; x++) field[y * width + x] = d[x]; }
  for (let x = 0; x < width; x++) { for (let y = 0; y < height; y++) f[y] = field[y * width + x]; transform(height); for (let y = 0; y < height; y++) field[y * width + x] = d[y]; }
  return field;
}
