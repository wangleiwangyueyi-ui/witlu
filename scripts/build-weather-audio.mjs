import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT } from './lib/upstream.mjs';
// Original deterministic procedural waveforms; no sampled recordings or models.
// Generated WAV assets are dedicated to CC0 1.0. This generator remains GPL-3.0.
const out=path.join(ROOT,'packages/web/public/assets/audio/weather');fs.mkdirSync(out,{recursive:true});
const rate=24000,manifest=[];
for(const [kind,seconds]of [['rain',12],['wind',12],['waves',12],['thunder',5]]){
  const n=rate*seconds,samples=new Float32Array(n);let seed=1987,low=0,deep=0;
  for(let i=0;i<n;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1,t=i/rate;
    low+=.045*(noise-low);deep+=.006*(noise-deep);
    const wave=.5-.5*Math.cos(t*Math.PI/3);
    samples[i]=kind==='rain'?noise*.13+low*.4:kind==='wind'?low*(.45+.25*Math.sin(t*Math.PI/6))+deep:kind==='waves'?(noise*.12+low*.9)*(.18+wave*.7):(low*.9+deep*3+noise*.035)*Math.exp(-t*.85)*(1-Math.exp(-t*30))*(.6+.4*Math.cos(t*13)**2);
  }
  // Seamless equal-power overlap at the loop seam, no silent gaps.
  const overlap=rate/4;
  if(kind!=='thunder')for(let i=0;i<overlap;i++){const t=i/overlap;samples[n-overlap+i]=samples[n-overlap+i]*Math.cos(t*Math.PI/2)+samples[i]*Math.sin(t*Math.PI/2);}
  const start=kind==='thunder'?0:overlap,count=n-start,buffer=Buffer.alloc(44+count*2);
  buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(count*2,40);
  for(let i=0;i<count;i++)buffer.writeInt16LE(Math.round(Math.max(-.95,Math.min(.95,samples[i+start]))*32767),44+i*2);
  fs.writeFileSync(path.join(out,`${kind}.wav`),buffer);manifest.push({name:kind,file:`${kind}.wav`,seconds:count/rate,sampleRate:rate,license:'CC0-1.0',source:'Original procedural synthesis: scripts/build-weather-audio.mjs',sha256:crypto.createHash('sha256').update(buffer).digest('hex')});
}
fs.writeFileSync(path.join(out,'sources.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(out,'LICENSE.txt'),'Original procedural weather audio, generated for witlu.\nTo the extent possible under law, all copyright and related or neighboring rights in these generated WAV files are waived under CC0 1.0 Universal.\nhttps://creativecommons.org/publicdomain/zero/1.0/\nNo third-party recordings were used.\n');
console.log('Built four self-hosted CC0 weather WAVs and provenance manifest');
