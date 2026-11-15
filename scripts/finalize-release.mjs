import fs from 'node:fs/promises';
import path from 'node:path';
import {tileVersion} from './lib/release.mjs';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'packages/web/dist'),version=tileVersion(root);
await fs.mkdir(path.join(dist,'terrain'),{recursive:true});
try{await fs.rename(path.join(dist,'tiles'),path.join(dist,'terrain',version));}catch(e){if(e.code!=='ENOENT')throw e;}
const manifest=JSON.parse(await fs.readFile(path.join(dist,'.vite/manifest.json'),'utf8'));
const core=manifest['index.html'];
await fs.writeFile(path.join(dist,'release.json'),JSON.stringify({application:'witlu',tileRoot:`/terrain/${version}`,entry:'/'+core.file,css:core.css?.map(p=>'/'+p)??[],probeTile:`/terrain/${version}/relief/3/6/3.webp`},null,2));
console.log(`Published immutable terrain namespace ${version}`);
