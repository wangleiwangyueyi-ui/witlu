import {expect,it} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {tileVersion} from './release.mjs';
it('invalidates immutable tile URLs when image bytes change without a manifest change',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'witlu-release-'));
  const tiles=path.join(root,'packages/web/public/tiles');
  fs.mkdirSync(tiles,{recursive:true});
  const manifest=path.join(tiles,'manifest.json'),image=path.join(tiles,'tile.webp');
  try {
    fs.writeFileSync(manifest,'{"version":1}');fs.writeFileSync(image,new Uint8Array([1,2,3]));
    const before=tileVersion(root);expect(tileVersion(root)).toBe(before);
    fs.writeFileSync(image,new Uint8Array([1,2,4]));expect(tileVersion(root)).not.toBe(before);
    const after=tileVersion(root);fs.renameSync(image,path.join(tiles,'renamed.webp'));expect(tileVersion(root)).not.toBe(after);
  } finally {
    // Remove only the two known temporary files and their now-empty parents.
    for(const file of [manifest,image,path.join(tiles,'renamed.webp')])if(fs.existsSync(file))fs.unlinkSync(file);
    let dir=tiles;while(dir.startsWith(root+path.sep)){fs.rmdirSync(dir);dir=path.dirname(dir);}fs.rmdirSync(root);
  }
});
