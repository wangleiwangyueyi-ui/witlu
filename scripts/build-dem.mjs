import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { args, BOUNDS, DEM_SOURCE, TILE_ROOT, atomicWrite, download, pool, tilePath, tiles, validImage, writeJSON } from './lib/terrain.mjs';

const options = args();
if (!Number.isInteger(options.min) || !Number.isInteger(options.max) || options.min < 0 || options.max > 8 || options.min > options.max || options.concurrency < 1) throw new Error('Expected zooms 0–8 and positive concurrency');
// One-tile halo supplies real neighbouring elevations for seam-free derivatives.
const jobs = tiles(options.min, options.max, 1); let downloaded = 0, resumed = 0, finished = 0;
await pool(jobs, options.concurrency, async tile => {
  const file = tilePath('dem', tile);
  if (await validImage(file)) resumed++;
  else {
    const png = await download(`${DEM_SOURCE}/${tile.z}/${tile.x}/${tile.y}.png`);
    const raw = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    if (raw.info.width !== 256 || raw.info.height !== 256 || raw.info.channels !== 3) throw new Error(`Unexpected Terrarium ${JSON.stringify(tile)}`);
    const webp = await sharp(raw.data, { raw: raw.info }).webp({ lossless: true, effort: 4 }).toBuffer();
    // Verify the encoding, including the fractional blue byte. No DEM quantisation.
    const roundtrip = await sharp(webp).removeAlpha().raw().toBuffer();
    if (!raw.data.equals(roundtrip)) throw new Error(`Lossy DEM conversion ${JSON.stringify(tile)}`);
    await atomicWrite(file, webp); downloaded++;
  }
  finished++; if (finished % 100 === 0 || finished === jobs.length) console.log(`DEM ${finished}/${jobs.length}: downloaded ${downloaded}, resumed ${resumed}`);
});
const levels = [];
for (let z = 0; z <= 8; z++) {
  const list = tiles(z, z, 1); let complete = true;
  for (const tile of list) { try { await fs.access(tilePath('dem', tile)); } catch { complete = false; break; } }
  if (complete) levels.push(z);
}
await writeJSON(path.join(TILE_ROOT, 'dem-manifest.json'), { schema: 1, bounds: BOUNDS, tileSize: 256, encoding: 'terrarium', format: 'lossless-webp', formula: 'R*256+G+B/256-32768 metres', source: DEM_SOURCE, attribution: 'Mapzen / Tilezen; USGS SRTM & GMTED2010; NOAA ETOPO1. See NOTICE.md.', completedZooms: levels, halo: 1, tileCount: levels.reduce((n, z) => n + tiles(z, z, 1).length, 0) });
