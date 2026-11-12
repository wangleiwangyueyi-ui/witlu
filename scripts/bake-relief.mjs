import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/upstream.mjs';
import { args, atomicWrite, BOUNDS, decodeHeight, download, palette, pool, sha256, TILE_ROOT, tileLat, tilePath, tileRange, tiles, VERSION, writeJSON } from './lib/terrain.mjs';
import { landSVG, luma, luminance, projectLand, shade } from './lib/relief.mjs';

const options = args(), colors = await palette();
const commit = 'ca96624a56bd078437bca8184e78163e5039ad19';
const source = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${commit}/geojson/ne_50m_land.geojson`;
const cache = path.join(ROOT, '.cache/terrain/ne_50m_land.geojson');
try { await fs.access(cache); } catch { await atomicWrite(cache, await download(source)); }
const sourceBytes = await fs.readFile(cache), land = JSON.parse(sourceBytes);
if (sha256(sourceBytes) !== 'e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b') throw new Error('Natural Earth cache checksum mismatch; remove only .cache/terrain/ne_50m_land.geojson and retry');
const recipe = sha256(await fs.readFile(new URL('./lib/relief.mjs', import.meta.url))) + sha256(await fs.readFile(new URL('./bake-relief.mjs', import.meta.url))) + sha256(Buffer.from(JSON.stringify(colors)));
const jobs = options.preview ? tiles(5, 5) : tiles(Math.max(3, options.min), options.max);
const projection = new Map([...new Set(jobs.map(t => t.z))].map(z => [z, projectLand(land, z)]));
const decoded = new Map();
async function readDem(tile) {
  const key = `${tile.z}/${tile.x}/${tile.y}`;
  if (decoded.has(key)) return decoded.get(key);
  const promise = sharp(tilePath('dem', tile)).removeAlpha().raw().toBuffer(); decoded.set(key, promise);
  if (decoded.size > 128) decoded.delete(decoded.keys().next().value);
  return promise;
}
const stats = { minLuma: 1, maxLuma: 0, maxLuminance: 0, wrongHuePixels: 0, tiles: jobs.length }; let done = 0, resumed = 0;
await pool(jobs, Math.min(options.concurrency, 4), async tile => {
  const file = tilePath('relief', tile), stamp = path.join(ROOT, '.cache/terrain/bake', String(tile.z), String(tile.x), `${tile.y}.json`);
  let old; try { old = JSON.parse(await fs.readFile(stamp, 'utf8')); await fs.access(file); } catch { old = null; }
  if (old?.recipe === recipe) { resumed++; merge(old); }
  else {
    const neighbours = new Map(); const n = 2 ** tile.z;
    await Promise.all([-1, 0, 1].flatMap(dy => [-1, 0, 1].map(async dx => { const x = tile.x + dx, y = tile.y + dy; if (x >= 0 && x < n && y >= 0 && y < n) neighbours.set(`${dx}/${dy}`, await readDem({ z: tile.z, x, y })); })));
    const height = (x, y) => { const dx = Math.floor(x / 256), dy = Math.floor(y / 256), raw = neighbours.get(`${dx}/${dy}`) ?? neighbours.get('0/0'); const index = (((y + 256) % 256) * 256 + ((x + 256) % 256)) * 3; return decodeHeight(raw[index], raw[index + 1], raw[index + 2]); };
    const mask = await sharp(landSVG(projection.get(tile.z), tile)).ensureAlpha().raw().toBuffer();
    const rgba = Buffer.alloc(256 * 256 * 4);
    for (let y = 0; y < 256; y++) {
      const metres = 40075016.686 * Math.cos(tileLat(tile.y + (y + .5) / 256, tile.z) * Math.PI / 180) / (256 * 2 ** tile.z);
      for (let x = 0; x < 256; x++) {
        const index = (y * 256 + x) * 4, h = height(x, y);
        const dx = (height(x + 1, y) - height(x - 1, y)) / (2 * metres), dy = (height(x, y + 1) - height(x, y - 1)) / (2 * metres);
        const color = shade(h, dx, dy, Math.hypot(dx, dy), mask[index + 3] >= 128, colors);
        rgba.set(color, index);
        // 254=ocean, 255=land: near-opaque alpha avoids lossy premultiply halos.
        rgba[index + 3] = mask[index + 3] >= 128 ? 255 : 254;
      }
    }
    let buffer = await sharp(rgba, { raw: { width: 256, height: 256, channels: 4 } }).webp({ quality: 85, alphaQuality: 100, smartSubsample: true, effort: 4 }).toBuffer();
    // Inspect actual decoded output, including WebP chroma compression.
    const output = await sharp(buffer).ensureAlpha().raw().toBuffer(); let repaired = false;
    // Lossy ringing can violate the palette at sharp ridges. Repair only those
    // decoded pixels and losslessly retain that tile; never relax the L0 bound.
    for (let i = 0; i < output.length; i += 4) {
      let rgb = [output[i], output[i + 1], output[i + 2]];
      if (rgb[1] <= rgb[0] || rgb[2] <= rgb[1] || luma(rgb) < .1 || luma(rgb) > .34 || luminance(rgb) > .095) {
        const intensity = Math.max(.105, Math.min(.33, luma(rgb)));
        rgb = colors['land-high'].map(v => Math.round(v * intensity / luma(colors['land-high'])));
        output.set(rgb, i); repaired = true;
      }
    }
    if (repaired) buffer = await sharp(output, { raw: { width: 256, height: 256, channels: 4 } }).webp({ lossless: true, effort: 4 }).toBuffer();
    const s = { recipe, guardedLossless: repaired, minLuma: 1, maxLuma: 0, maxLuminance: 0, wrongHuePixels: 0 };
    for (let i = 0; i < output.length; i += 4) { const rgb = [output[i], output[i + 1], output[i + 2]]; s.minLuma = Math.min(s.minLuma, luma(rgb)); s.maxLuma = Math.max(s.maxLuma, luma(rgb)); s.maxLuminance = Math.max(s.maxLuminance, luminance(rgb)); if (!(rgb[2] > rgb[1] && rgb[1] > rgb[0])) s.wrongHuePixels++; }
    await atomicWrite(file, buffer); await writeJSON(stamp, s); merge(s);
  }
  done++; if (done % 100 === 0 || done === jobs.length) console.log(`Relief ${done}/${jobs.length} (${resumed} resumed)`);
});
function merge(s) { stats.minLuma = Math.min(stats.minLuma, s.minLuma); stats.maxLuma = Math.max(stats.maxLuma, s.maxLuma); stats.maxLuminance = Math.max(stats.maxLuminance, s.maxLuminance); stats.wrongHuePixels += s.wrongHuePixels; }
stats.lumaSpan = stats.maxLuma - stats.minLuma;
if (stats.lumaSpan > .25 || stats.maxLuminance > .1 || stats.wrongHuePixels) throw new Error(`L0/palette verification failed: ${JSON.stringify(stats)}`);
if (options.preview) {
  const range = tileRange(5), width = (range.maxX - range.minX + 1) * 256, height = (range.maxY - range.minY + 1) * 256;
  const composites = await Promise.all(jobs.map(async t => ({ input: await sharp(tilePath('relief', t)).removeAlpha().png().toBuffer(), left: (t.x - range.minX) * 256, top: (t.y - range.minY) * 256 })));
  const preview = path.join(ROOT, 'docs/progress/relief-preview.webp');
  await sharp({ create: { width, height, channels: 3, background: { r: colors['sea-deep'][0], g: colors['sea-deep'][1], b: colors['sea-deep'][2] } } }).composite(composites).webp({ quality: 92 }).toFile(preview);
  const reference = await sharp(path.join(ROOT, 'docs/design/v3_desktop.jpg')).resize(1000, 700, { fit: 'contain', background: { r: 10, g: 24, b: 48 } }).png().toBuffer();
  const relief = await sharp(preview).resize(1000, 700, { fit: 'contain', background: { r: 10, g: 24, b: 48 } }).png().toBuffer();
  await sharp({ create: { width: 2000, height: 700, channels: 3, background: { r: 10, g: 24, b: 48 } } }).composite([{ input: reference, left: 0, top: 0 }, { input: relief, left: 1000, top: 0 }]).webp({ quality: 92 }).toFile(path.join(ROOT, 'docs/progress/relief-comparison.webp'));
  await writeJSON(path.join(ROOT, 'docs/progress/relief-preview.json'), { version: VERSION, stats, source, sha256: sha256(sourceBytes), bounds: BOUNDS });
} else {
  await writeJSON(path.join(TILE_ROOT, 'manifest.json'), { version: VERSION, bounds: BOUNDS, minZoom: 3, maxZoom: options.max, tileSize: 256, dem: 'dem/{z}/{x}/{y}.webp', relief: 'relief/{z}/{x}/{y}.webp', alpha: 'landmask: alpha*255-254', coast: { source, sha256: sha256(sourceBytes), license: 'Natural Earth public domain' }, ranges: Array.from({ length: options.max - 2 }, (_, i) => ({ z: i + 3, ...tileRange(i + 3) })), stats });
}
console.log(JSON.stringify(stats));
