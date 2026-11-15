import {spawnSync} from 'node:child_process';
const result=spawnSync(process.platform==='win32'?'pnpm.cmd':'pnpm',['exec','playwright','test','tests/publishing.spec.ts','tests/deep-links-readme.spec.ts','tests/opening-acceptance.spec.ts','--workers=1'],{stdio:'inherit',shell:process.platform==='win32',env:{...process.env,P10_ACCEPTANCE:'1'}});
process.exitCode=result.status??1;
