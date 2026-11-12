import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { decodeHeight, palette, tileLat, tileY, tiles, tileRange } from './terrain.mjs';
import { shade, luma, landSVG, projectLand } from './relief.mjs';
describe('terrain build pipeline', () => {
  it('uses inclusive coverage without an extra eastern/southern boundary tile', () => { expect(tileRange(0)).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 }); expect(tiles(0, 8, 1)).toHaveLength(5242); expect(tiles(3, 8)).toHaveLength(4728); expect(tileLat(tileY(35, 8), 8)).toBeCloseTo(35, 12); });
  it('preserves all Terrarium bytes through lossless WebP', async () => { const raw = Buffer.from([127, 255, 255, 128, 0, 0, 131, 255, 1, 100, 23, 255]); const webp = await sharp(raw, { raw: { width: 2, height: 2, channels: 3 } }).webp({ lossless: true }).toBuffer(); expect(await sharp(webp).removeAlpha().raw().toBuffer()).toEqual(raw); expect(decodeHeight(127, 255, 255)).toBe(-1 / 256); });
  it('only produces blue-biased relief at negative, low and peak elevations', async () => { const colors = await palette(); for (const h of [-10000, -1000, -1, 0, 100, 1000, 4000, 8800]) for (const slope of [-1, -.2, 0, .2, 1]) { const rgb = shade(h, slope, slope / 2, Math.abs(slope), h >= 0, colors); expect(rgb[2]).toBeGreaterThan(rgb[1]); expect(rgb[1]).toBeGreaterThan(rgb[0]); expect(luma(rgb)).toBeLessThan(.32); } });
  it('uses Natural Earth polygon holes as sea masks', async () => {
    const geo = { features: [{ geometry: { type: 'Polygon', coordinates: [[[90, 0], [135, 0], [135, 40], [90, 40], [90, 0]], [[105, 10], [115, 10], [115, 20], [105, 20], [105, 10]]] } }] };
    const svg = landSVG(projectLand(geo, 3), { z: 3, x: 6, y: 3 }); const image = await sharp(svg).ensureAlpha().raw().toBuffer();
    const alpha = (lon, lat) => image[(Math.floor((tileY(lat, 3) - 3) * 256) * 256 + Math.floor((lon - 90) / 45 * 256)) * 4 + 3];
    expect(alpha(100, 25)).toBe(255); expect(alpha(110, 15)).toBe(0);
  });
});
