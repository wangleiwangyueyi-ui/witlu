import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium,devices} from '@playwright/test';
import lighthouse from 'lighthouse';
const base=process.env.ATLAS_PREVIEW_URL??'http://127.0.0.1:4176',out='docs/progress/performance/P10';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--remote-debugging-port=9223','--use-angle=d3d11','--enable-gpu']});
try{
 const scores=[];
 for(const [label,route]of [['home','/'],['topics','/topics/index.html'],['article','/topics/battle-chibi.html']]){
  const result=await lighthouse(base+route,{port:9223,onlyCategories:['seo'],output:['json','html'],logLevel:'error',formFactor:'mobile',screenEmulation:{mobile:true,width:390,height:844,deviceScaleFactor:1,disabled:false}});
  await fs.writeFile(out+'/lighthouse-'+label+'.json',result.report[0]);await fs.writeFile(out+'/lighthouse-'+label+'.html',result.report[1].replace(/[\t ]+$/gm,'').trimEnd()+'\n');
  const score=result.lhr.categories.seo.score*100;const failures=Object.values(result.lhr.audits).filter(a=>a.score===0).map(a=>({id:a.id,title:a.title,details:a.details}));scores.push({label,route,score,failures});console.log('Lighthouse SEO '+label+': '+score);assert.ok(score>=95,label+' SEO '+score);
 }
 await fs.writeFile(out+'/seo-summary.json',JSON.stringify(scores,null,2));
 await fs.mkdir('docs/progress/screenshots/P10',{recursive:true});
 for(const [name,profile]of [['desktop',{viewport:{width:1440,height:900}}],['iPhone-14',devices['iPhone 14']],['Pixel-7',devices['Pixel 7']]]){
  const topicContext=await browser.newContext(profile),topic=await topicContext.newPage();
  await topic.goto(base+'/topics/battle-chibi.html');await topic.evaluate(()=>document.fonts.ready);
  assert.equal(await topic.locator('h1').count(),1);
  await topic.screenshot({path:'docs/progress/screenshots/P10/'+name+'-topic.png'});await topicContext.close();
 }
 const context=await browser.newContext(),page=await context.newPage();await page.goto(base+'/?year=230');await page.waitForFunction(()=>!!document.querySelector('[data-ready=true]'),{},{timeout:60000});await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.waitForFunction(()=>!!document.querySelector('[data-ready=true]'),{},{timeout:60000});
 const online=await page.evaluate(async()=>{const r=await fetch('/data/dynasties.json');return (await r.json()).length;});await page.waitForFunction(async()=>!!await caches.match('/data/dynasties.json'));
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>!!document.querySelector('.atlas-app'),{},{timeout:30000});const offline=await page.evaluate(async()=>{const r=await fetch('/data/dynasties.json');return (await r.json()).length;});assert.equal(online,offline);
 await fs.writeFile(out+'/pwa.json',JSON.stringify({passed:true,offlineShell:true,offlineDynasties:offline,caches:await page.evaluate(()=>caches.keys())},null,2));await context.close();console.log('PWA production shell and visited data available offline');
}finally{await browser.close();}
