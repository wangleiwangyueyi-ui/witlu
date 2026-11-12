import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/upstream.mjs';
import { atomicWrite, sha256, TILE_ROOT, tileLat, tilePath, tileRange, tiles, writeJSON } from './lib/terrain.mjs';
import { distanceField } from './lib/distance-field.mjs';
const output = path.join(TILE_ROOT, 'environment'), z = 6, range = tileRange(z);
const source = JSON.parse(await fs.readFile(path.join(TILE_ROOT, 'manifest.json'), 'utf8'));
const recipe = sha256(Buffer.concat([await fs.readFile(new URL('./bake-coast-distance.mjs', import.meta.url)), await fs.readFile(new URL('./lib/distance-field.mjs', import.meta.url)), Buffer.from(source.coast.sha256 + source.version)]));
let old; try { old = JSON.parse(await fs.readFile(path.join(output, 'manifest.json'), 'utf8')); } catch { /* First build. */ }
const names = ['coast-distance.webp', 'water-normal-a.webp', 'water-normal-b.webp', 'cloud-coverage.webp'];
if (old?.recipe === recipe) {
  let valid = true; for (const name of names) { try { const file = await fs.readFile(path.join(output, name)); if (sha256(file) !== old.assets[name].sha256) valid = false; await sharp(file).raw().toBuffer(); } catch { valid = false; } }
  if (valid) { console.log('Environment maps: coast distance, two normals and cloud coverage resumed'); process.exit(0); }
}
const width = (range.maxX - range.minX + 1) * 256, height = (range.maxY - range.minY + 1) * 256;
const mask = new Uint8Array(width * height);
for (const tile of tiles(z, z)) {
  const pixels = await sharp(tilePath('relief', tile)).ensureAlpha().raw().toBuffer();
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) mask[((tile.y - range.minY) * 256 + y) * width + (tile.x - range.minX) * 256 + x] = pixels[(y * 256 + x) * 4 + 3] === 255 ? 1 : 0;
}
console.log(`Computing exact coast EDT at z6: ${width} × ${height}`);
const distances = distanceField(mask, width, height), outWidth = width / 2, outHeight = height / 2, maxDistanceKm = 160;
const pixels = Buffer.alloc(outWidth * outHeight * 3);
for (let y = 0; y < outHeight; y++) {
  const row = y * 2 + 1, kmPerPixel = 40075.016686 / (256 * 2 ** z) * Math.cos(tileLat(range.minY + (row + .5) / 256, z) * Math.PI / 180);
  for (let x = 0; x < outWidth; x++) { const src = row * width + x * 2 + 1, i = (y * outWidth + x) * 3; const encoded = Math.round(Math.min(maxDistanceKm, Math.sqrt(distances[src]) * kmPerPixel) / maxDistanceKm * 65535); pixels[i] = encoded >> 8; pixels[i + 1] = encoded & 255; pixels[i + 2] = mask[src] * 255; }
}
await atomicWrite(path.join(output, names[0]), await sharp(pixels, { raw: { width: outWidth, height: outHeight, channels: 3 } }).webp({ lossless: true }).toBuffer());
// Periodic numerical normal maps: own procedural assets, no external imagery.
for (let layer = 0; layer < 2; layer++) {
  const size = 256, rgb = Buffer.alloc(size * size * 3);
  const waves = layer ? [[7, 3, .32], [13, -5, .12], [23, 9, .06], [3, 1, .22]] : [[4, 8, .3], [9, -6, .15], [19, 11, .07], [2, 3, .24]];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { let nx = 0, nz = 0; for (const [fx, fy, amplitude] of waves) { const phase = (fx * x + fy * y) / size * Math.PI * 2 + layer * .8, norm = Math.hypot(fx, fy); nx += Math.cos(phase) * amplitude * fx / norm; nz += Math.cos(phase) * amplitude * fy / norm; } const len = Math.hypot(nx, nz, 1), i = (y * size + x) * 3; rgb[i] = Math.round((nx / len * .5 + .5) * 255); rgb[i + 1] = Math.round((nz / len * .5 + .5) * 255); rgb[i + 2] = Math.round((1 / len * .5 + .5) * 255); }
  await atomicWrite(path.join(output, names[layer + 1]), await sharp(rgb, { raw: { width: size, height: size, channels: 3 } }).webp({ lossless: true }).toBuffer());
}
const cloudSize = 128, cloud = Buffer.alloc(cloudSize * cloudSize * 3);
const lobes = [[-.28, -.03, .19], [-.08, .1, .21], [.18, .03, .22], [.31, -.09, .13], [.02, -.15, .2], [-.12, -.1, .2]];
for (let y = 0; y < cloudSize; y++) for (let x = 0; x < cloudSize; x++) {
  const u = x / (cloudSize - 1) - .5, v = y / (cloudSize - 1) - .5;
  let density = 0; for (const [cx, cy, radius] of lobes) density += Math.exp(-((u - cx) ** 2 + (v - cy) ** 2) / (radius ** 2) * 2);
  const noise = .85 + .08 * Math.sin(u * 47 + Math.sin(v * 13)) * Math.sin(v * 39) + .07 * Math.sin(u * 91) * Math.cos(v * 67);
  const edge = Math.max(0, 1 - Math.max(Math.abs(u), Math.abs(v)) * 2);
  const value = Math.round(Math.min(1, density * .65) * Math.min(1, edge * 6) * noise * 255); cloud.fill(value, (y * cloudSize + x) * 3, (y * cloudSize + x) * 3 + 3);
}
await atomicWrite(path.join(output, names[3]), await sharp(cloud, { raw: { width: cloudSize, height: cloudSize, channels: 3 } }).webp({ lossless: true }).toBuffer());
const manifest = { version: 'p3-environment-v1', recipe, coastSource: source.coast, sourceZoom: z, width: outWidth, height: outHeight, maxDistanceKm, encoding: 'distanceKm=(R*256+G)/65535*160; B=landmask', mercator: { x: range.minX / 2 ** z, y: range.minY / 2 ** z, width: (range.maxX - range.minX + 1) / 2 ** z, height: (range.maxY - range.minY + 1) / 2 ** z }, assets: {} };
for (const name of names) { const data = await fs.readFile(path.join(output, name)); manifest.assets[name] = { bytes: data.length, sha256: sha256(data) }; }
await writeJSON(path.join(output, 'manifest.json'), manifest);
await writeJSON(path.join(ROOT, 'docs/progress/coast-distance.json'), manifest);
console.log(`Baked coast atlas ${outWidth}×${outHeight} and environment textures (${names.length} files)`);
