import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { TILE_ROOT, sha256 } from './lib/terrain.mjs';
const root = path.join(TILE_ROOT, 'environment'), manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
const relief = JSON.parse(await fs.readFile(path.join(TILE_ROOT,'manifest.json'),'utf8'));
if (manifest.coastSource.sha256 !== relief.coast.sha256) throw new Error('Distance field coast source differs from terrain');
for (const [name, expected] of Object.entries(manifest.assets)) {
  const file = await fs.readFile(path.join(root,name)); if (sha256(file) !== expected.sha256) throw new Error(`Environment asset checksum: ${name}`);
  const image = await sharp(file).raw().toBuffer({resolveWithObject:true});
  if (name === 'coast-distance.webp') {
    if (image.info.width !== manifest.width || image.info.height !== manifest.height) throw new Error('Coast atlas dimensions');
    let land = 0, sea = 0, coastal = 0;
    for (let i = 0; i < image.data.length; i += 3) { const d = image.data[i]*256+image.data[i+1]; if (image.data[i+2] === 255) { land++; if (d !== 0) throw new Error('Land has offshore distance'); } else { sea++; if (d > 0 && d < 20000) coastal++; } }
    if (!land || !sea || !coastal) throw new Error('Incomplete coast field');
    console.log(`Coast atlas: ${land} land, ${sea} sea, ${coastal} nearshore pixels`);
  }
}
console.log('Environment assets verified: Natural Earth coast distance + two seamless normals + shared cloud coverage');
