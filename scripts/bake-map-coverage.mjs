import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/upstream.mjs';
import { atomicWrite, palette, TILE_ROOT } from './lib/terrain.mjs';
import { landSVG, projectLand } from './lib/relief.mjs';

const zoom = 2, edge = 2 ** zoom, size = edge * 256;
const source = JSON.parse(await fs.readFile(path.join(ROOT, '.cache/terrain/ne_50m_land.geojson'), 'utf8'));
const polygons = projectLand(source, zoom);
const colors = await palette();
const rgba = Buffer.alloc(size * size * 4);

// The detailed tiles retain their existing bounds. A single small global
// coastline texture fills the rest of the orthographic camera's footprint.
for (let y = 0; y < edge; y++) {
  for (let x = 0; x < edge; x++) {
    const mask = await sharp(landSVG(polygons, { x, y })).ensureAlpha().extractChannel(3).raw().toBuffer();
    for (let row = 0; row < 256; row++) {
      for (let col = 0; col < 256; col++) {
        const land = mask[row * 256 + col] >= 128;
        const offset = ((y * 256 + row) * size + x * 256 + col) * 4;
        rgba.set(colors[land ? 'land-low' : 'sea-deep'], offset);
        rgba[offset + 3] = land ? 255 : 254;
      }
    }
  }
}

const webp = await sharp(rgba, { raw: { width: size, height: size, channels: 4 } }).webp({ lossless: true }).toBuffer();
await atomicWrite(path.join(TILE_ROOT, 'flat-world.webp'), webp);
console.log(`Built global orthographic coastline (${webp.length} bytes)`);
