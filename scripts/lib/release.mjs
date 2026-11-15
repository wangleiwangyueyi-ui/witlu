import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function tileVersion(root){
  const hash=createHash('sha256');const walk=dir=>{if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else{hash.update(path.relative(root,file).split(path.sep).join('/'));hash.update(fs.readFileSync(file));}}};
  walk(path.join(root,'packages/web/public/tiles'));return hash.digest('hex').slice(0,16);
}
