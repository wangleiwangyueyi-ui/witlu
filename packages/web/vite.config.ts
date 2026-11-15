import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
function tileVersion(){const root=path.resolve(import.meta.dirname,'../..'),hash=createHash('sha256');const walk=(dir:string)=>{if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else{hash.update(path.relative(root,f).split(path.sep).join('/'));hash.update(fs.readFileSync(f));}}};walk(path.join(root,'packages/web/public/tiles'));return hash.digest('hex').slice(0,16);}
export default defineConfig(({command})=>({ plugins: [react(), tailwindcss()], build:{manifest:true}, define:{__TILE_ROOT__:JSON.stringify(command==='build'?`/terrain/${tileVersion()}`:'/tiles')} }));
