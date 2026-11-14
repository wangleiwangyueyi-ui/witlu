import {spawnSync} from 'node:child_process';
const manifest=spawnSync(process.execPath,['scripts/readme-links.mjs'],{stdio:'inherit'});
if(manifest.status!==0)process.exit(manifest.status??1);
const result=spawnSync(process.platform==='win32'?'pnpm.cmd':'pnpm',['exec','playwright','test','tests/explore.spec.ts','tests/explore-acceptance.spec.ts','--workers=1'],{stdio:'inherit',shell:process.platform==='win32',env:{...process.env,P9_ACCEPTANCE:'1'}});
process.exitCode=result.status??1;
