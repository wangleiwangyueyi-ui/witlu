import {test,expect,devices} from '@playwright/test';
import fs from 'node:fs/promises';
const root='docs/progress',stats=async(page:import('@playwright/test').Page)=>JSON.parse(await page.getByTestId('terrain').getAttribute('data-stats')??'{}');
test('P9 every README example link resolves to its intended state',async({page},info)=>{
 test.skip(process.env.P9_ACCEPTANCE!=='1'||info.project.name!=='desktop');test.setTimeout(900000);
 const links=JSON.parse(await fs.readFile(root+'/performance/P9/readme-links.json','utf8')) as {query:string;sources:string[]}[],results=[];
 for(const link of links){const params=new URLSearchParams(link.query);await page.goto('/'+link.query);await expect(page.getByTestId('data-status')).toContainText(/全量史料|Complete source/,{timeout:45000});const person=params.get('person')??params.get('event');
  if(person){await expect(page.locator('.exploration-panel')).toBeVisible();expect(Number(await page.locator('.exploration-panel').getAttribute('data-stop-count'))).toBeGreaterThan(0);}
  else if(params.has('quiz'))await expect(page.locator('.quiz-panel')).toBeVisible();
  else if(params.has('place')||params.has('trace')){await expect(page.locator('.place-card')).toBeVisible({timeout:45000});await expect(page.locator('.place-chronology li').first()).toBeVisible({timeout:60000});}
  else if(params.has('hover'))await expect(page.locator('.map-bubble')).toBeVisible({timeout:45000});
  if(params.has('year')&&!params.has('quiz'))await expect(page.locator('#history-year')).toHaveValue(params.get('year')!.split(',')[0]!);
  if(params.get('lang')==='zh-tw')await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant');
  if(params.get('lang')==='en')await expect(page.locator('html')).toHaveAttribute('lang','en');
  const places=params.get('place')?.split(',');if(places&&places.length>1)await expect(page.locator('.place-card nav button')).toHaveCount(places.length);results.push({...link,passed:true});console.log('README '+results.length+'/'+links.length+' '+link.query);await fs.writeFile(root+'/performance/P9/readme-results.json',JSON.stringify(results,null,2));
 }
 await fs.writeFile(root+'/performance/P9/readme-results.json',JSON.stringify(results,null,2));
});
test('P9 recorded journeys, shared stations, two campaigns and quiz',async({browser},info)=>{
 test.skip(process.env.P9_ACCEPTANCE!=='1');test.setTimeout(300000);
 const context=await browser.newContext({...info.project.name==='iPhone-14'?devices['iPhone 14']:info.project.name==='Pixel-7'?devices['Pixel 7']:{viewport:{width:1440,height:900}},recordVideo:{dir:root+'/videos/P9',size:{width:info.project.use.viewport?.width??1440,height:info.project.use.viewport?.height??900}}});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});const samples=[];const rawIntervals:{scenario:string;frames:number[]}[]=[];
 for(const scenario of ['person=sushi&stop=6','person=libai,dufu,gaoshi','event=anshi&stop=1','event=jingkang&stop=1']){await page.goto('http://127.0.0.1:4173/?'+scenario);await expect(page.locator('.exploration-panel')).toBeVisible();await expect.poll(async()=>(await stats(page)).morph?.ready,{timeout:45000}).toBe(true);const frames=page.evaluate(()=>new Promise<number[]>(resolve=>{const values:number[]=[];let previous=performance.now();const end=previous+4500;function tick(now:number){values.push(now-previous);previous=now;if(now<end)requestAnimationFrame(tick);else resolve(values);}requestAnimationFrame(tick);}));await page.getByRole('button',{name:'下一站',exact:true}).click();for(let i=0;i<8;i++){await page.waitForTimeout(500);const s=await stats(page);samples.push({scenario,fps:s.fps,frameMs:s.frameMs,quality:s.quality});}rawIntervals.push({scenario,frames:await frames});await page.screenshot({path:root+'/screenshots/P9/'+info.project.name+'-motion-'+scenario.split('&')[0]!.replace(/[=,]/g,'-')+'.png'});}
 await page.goto('http://127.0.0.1:4173/?quiz=locate&year=-121');await expect(page.locator('.quiz-panel')).toBeVisible();await expect.poll(async()=>(await stats(page)).morph?.ready,{timeout:45000}).toBe(true);const size=page.viewportSize()!;await page.mouse.click(size.width*.55,size.height*.32);await page.getByRole('button',{name:'✓ 确定',exact:true}).click();await page.waitForTimeout(1800);await page.getByRole('button',{name:'退出小试',exact:true}).click();expect(errors).toEqual([]);
 const video=page.video();await context.close();await video?.saveAs(root+'/videos/P9/'+info.project.name+'-exploration.webm');await video?.delete();await fs.writeFile(root+'/performance/P9/'+info.project.name+'.json',JSON.stringify({rawIntervals,samples,errors},null,2));
});
