import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { ROOT } from './upstream.mjs';

export const BOUNDS = [60, 0, 150, 60];
export const TILE_SIZE = 256;
export const TILE_ROOT = path.join(ROOT, 'packages/web/public/tiles');
export const DEM_SOURCE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
export const VERSION = 'p2-relief-v1';
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const tileX = (lon, z) => (lon + 180) / 360 * 2 ** z;
export const tileY = (lat, z) => (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z;
export const tileLat = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 2 ** z))) * 180 / Math.PI;
export const decodeHeight = (r, g, b) => r * 256 + g + b / 256 - 32768;
export function tileRange(z, halo = 0) {
  const [west, south, east, north] = BOUNDS, n = 2 ** z;
  return { minX: clamp(Math.floor(tileX(west, z)) - halo, 0, n - 1), maxX: clamp(Math.ceil(tileX(east, z)) - 1 + halo, 0, n - 1), minY: clamp(Math.floor(tileY(north, z)) - halo, 0, n - 1), maxY: clamp(Math.ceil(tileY(south, z)) - 1 + halo, 0, n - 1) };
}
export function tiles(min, max, halo = 0) {
  const result = [];
  for (let z = min; z <= max; z++) { const r = tileRange(z, halo); for (let y = r.minY; y <= r.maxY; y++) for (let x = r.minX; x <= r.maxX; x++) result.push({ z, x, y }); }
  return result;
}
export const tilePath = (kind, { z, x, y }) => path.join(TILE_ROOT, kind, String(z), String(x), `${y}.webp`);
export async function atomicWrite(file, bytes) { await fs.mkdir(path.dirname(file), { recursive: true }); const temp = `${file}.${process.pid}.part`; await fs.writeFile(temp, bytes); await fs.rename(temp, file); }
export async function writeJSON(file, value) { await atomicWrite(file, JSON.stringify(value, null, 2) + '\n'); }
export async function validImage(file, size = 256) { try { const m = await sharp(file).metadata(); if (m.width !== size || m.height !== size || m.format !== 'webp') return false; await sharp(file).raw().toBuffer(); return true; } catch { return false; } }
export async function download(url, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(45_000) }); if (!r.ok) throw new Error(`${r.status} ${url}`); return Buffer.from(await r.arrayBuffer()); }
    catch (e) { if (i === attempts - 1) throw e; await new Promise(resolve => setTimeout(resolve, Math.min(8000, 500 * 2 ** i))); }
  }
}
export async function pool(items, concurrency, fn) { let next = 0; await Promise.all(Array.from({ length: concurrency }, async () => { while (next < items.length) { const i = next++; await fn(items[i], i); } })); }
export const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
export async function palette() { const text = await fs.readFile(path.join(ROOT, 'packages/web/src/styles/tokens.css'), 'utf8'); return Object.fromEntries([...text.matchAll(/--([\w-]+):\s*#([\da-f]{6})/gi)].map(([, key, hex]) => [key, [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16))])); }
export function args() { const get = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : Number(process.argv[i + 1]); }; return { min: get('min-zoom', 0), max: get('max-zoom', 8), concurrency: get('concurrency', 8), preview: process.argv.includes('--preview') }; }
