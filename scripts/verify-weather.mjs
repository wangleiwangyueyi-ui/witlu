import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {ROOT} from './lib/upstream.mjs';
const dir=path.join(ROOT,'packages/web/public/assets/audio/weather'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'sources.json')));
if(manifest.length!==4)throw Error('Four CC0 environmental sounds are required');
for(const name of ['rain','wind','waves','thunder']){
  const entry=manifest.find(e=>e.name===name);if(!entry||entry.license!=='CC0-1.0')throw Error(`Audio provenance: ${name}`);
  const b=fs.readFileSync(path.join(dir,entry.file));if(crypto.createHash('sha256').update(b).digest('hex')!==entry.sha256)throw Error(`Audio checksum: ${name}`);
  if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE'||b.readUInt32LE(24)!==24000||b.readUInt16LE(34)!==16)throw Error(`WAV format: ${name}`);
  let peak=0,sum=0;for(let i=44;i<b.length;i+=2){const sample=b.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;}
  const rms=Math.sqrt(sum/((b.length-44)/2));if(peak>=.99||rms<.005)throw Error(`Clipping or silence: ${name}`);
}
const moods=JSON.parse(fs.readFileSync(path.join(ROOT,'packages/web/public/data/moods.json')));
for(const id of ['milestones:zhanguo:28','milestones:beisong:34','milestones:nansong:29','milestones:donghan:29','milestones:tang:4','landmark:tang:819:115'])if(!moods.some(e=>e.id===id))throw Error(`Missing acceptance event: ${id}`);
console.log('Weather audio provenance, WAV integrity, levels and six acceptance events verified');
