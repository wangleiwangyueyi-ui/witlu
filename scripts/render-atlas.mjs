import {chromium} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
const [url,output]=process.argv.slice(2);
if(!url||!output)throw Error('Usage: node scripts/render-atlas.mjs URL OUTPUT.png');
const browser=await chromium.launch({args:process.platform==='win32'?['--use-angle=d3d11','--enable-gpu']:[]});
try{const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(url);await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-testid=terrain]')?.getAttribute('data-stats')??'{}').morph?.ready,{},{timeout:60000});await fs.mkdir(path.dirname(output),{recursive:true});await page.screenshot({path:output});console.log('Screenshot: '+output);}finally{await browser.close();}
