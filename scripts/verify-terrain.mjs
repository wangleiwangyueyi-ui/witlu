import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { TILE_ROOT, BOUNDS, pool, tiles, tilePath } from './lib/terrain.mjs';
const dem = JSON.parse(await fs.readFile(path.join(TILE_ROOT, 'dem-manifest.json'), 'utf8'));
const relief = JSON.parse(await fs.readFile(path.join(TILE_ROOT, 'manifest.json'), 'utf8'));
if (JSON.stringify(dem.completedZooms) !== JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8]) || dem.tileCount !== tiles(0, 8, 1).length) throw new Error('Incomplete DEM coverage');
if (relief.maxZoom !== 8 || relief.minZoom !== 3 || relief.stats.tiles !== tiles(3, 8).length || JSON.stringify(relief.bounds) !== JSON.stringify(BOUNDS)) throw new Error('Incomplete relief coverage');
if (relief.stats.lumaSpan > .25 || relief.stats.wrongHuePixels !== 0 || relief.stats.maxLuminance > .1) throw new Error('Relief palette or luminance violation');
let count = 0;
await pool([...tiles(0, 8, 1).map(t => ['dem', t]), ...tiles(3, 8).map(t => ['relief', t])], 8, async ([kind, tile]) => {
  const metadata = await sharp(tilePath(kind, tile)).metadata();
  if (metadata.width !== 256 || metadata.height !== 256 || metadata.format !== 'webp') throw new Error(`Invalid ${kind} tile ${JSON.stringify(tile)}`);
  count++;
});
console.log(`Terrain verified: ${count} WebP tiles; DEM 0–8, relief 3–8; luma span ${(relief.stats.lumaSpan * 100).toFixed(2)}%; no off-palette pixels`);
