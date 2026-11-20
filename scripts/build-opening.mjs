import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/upstream.mjs';
import { atomicWrite, download, sha256 } from './lib/terrain.mjs';

const nasa = 'https://assets.science.nasa.gov/content/dam/science/esd/eo/images';
const naturalEarth = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_110m_admin_0_countries.geojson';
const sources = {
  day: ['day.jpg', `${nasa}/bmng/bmng-topography-bathymetry/july/world.topo.bathy.200407.3x5400x2700.jpg`, '4f4240673a3a1b173d61b92ca4b07bac5fd17059ea5f725ba6da5a9c5386b7ba'],
  night: ['night.jpg', `${nasa}/imagerecords/144000/144897/BlackMarble_2016_3km_gray.jpg`, '3fbc8aae3529dc1ebfcf3aa9361bd3dfc11d19950a6af6d8ed2df61bd8b0134d'],
  clouds: ['clouds-cpc.tif', 'https://svs.gsfc.nasa.gov/vis/a000000/a004400/a004439/frames/4096x2048_1x1_30p/clouds_cpc/flat_cpc_clouds_4096x2048.01000.tif', 'fa84c4a0fefcdd08c75aff7a1ed3a8619a57a533933cfe23d53c0f47f24fda01'],
  countries: ['countries.geojson', naturalEarth, '6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f'],
};

async function source([filename, url, hash]) {
  const file = path.join(ROOT, '.cache/r5-nasa', filename);
  let bytes = await fs.readFile(file).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return undefined;
  });
  const cached = !!bytes;
  bytes ??= await download(url);
  if (sha256(bytes) !== hash) throw new Error(`Source checksum mismatch for ${file}`);
  if (!cached) await atomicWrite(file, bytes);
  return bytes;
}

const [day, night, clouds, countries] = await Promise.all(Object.values(sources).map(source));
const features = JSON.parse(countries).features;
const outlines = ['CHN', 'TWN'].flatMap(code => {
  const feature = features.find(candidate => candidate.properties.ADM0_A3 === code);
  if (feature?.geometry.type === 'Polygon') return [feature.geometry.coordinates];
  if (feature?.geometry.type === 'MultiPolygon') return feature.geometry.coordinates;
  throw new Error(`Could not find outline ${code} in Natural Earth`);
});
const output = path.join(ROOT, 'packages/web/public/brand/opening');

for (const width of [2048, 4096]) {
  const height = width / 2;
  const shape = outlines.flatMap(polygon => polygon.map(ring => 'M' + ring.map(([lon, lat]) =>
    `${((lon + 180) / 360 * width).toFixed(2)},${((90 - lat) / 180 * height).toFixed(2)}`).join('L') + 'Z')).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path d="${shape}" fill="none" stroke="white" stroke-linejoin="round" stroke-width="${width / 2300}"/></svg>`;
  const [dayWebp, lights, coverage, border] = await Promise.all([
    sharp(day).resize(width, height).webp({quality: 83, effort: 5}).toBuffer(),
    sharp(night).resize(width, height).greyscale().raw().toBuffer(),
    sharp(clouds, {failOn:'none'}).resize(width, height).extractChannel('alpha').raw().toBuffer(),
    sharp(Buffer.from(svg)).extractChannel('alpha').raw().toBuffer(),
  ]);
  if ([lights, coverage, border].some(layer => layer.length !== width * height)) throw new Error('Invalid opening mask dimensions');
  const packed = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    packed[i * 3] = Math.min(255, Math.round(lights[i] / 4) * 4);
    packed[i * 3 + 1] = Math.min(255, Math.round(coverage[i] / 4) * 4);
    packed[i * 3 + 2] = border[i];
  }
  const masks = await sharp(packed, {raw:{width,height,channels:3}}).webp({lossless:true,effort:5}).toBuffer();
  await Promise.all([
    atomicWrite(path.join(output,`day-${width}.webp`), dayWebp),
    atomicWrite(path.join(output,`masks-${width}.webp`), masks),
  ]);
  console.log(`Opening ${width}×${height} · day ${dayWebp.length} bytes · masks ${masks.length} bytes`);
}
