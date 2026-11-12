import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','--config','playwright.morph.config.ts',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,P4_ACCEPTANCE:'1'}});
child.on('exit',code=>{process.exitCode=code??1;});child.on('error',error=>{console.error(error);process.exitCode=1;});
