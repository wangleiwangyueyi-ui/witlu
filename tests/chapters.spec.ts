import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import type { EngineStats } from '../packages/engine/Renderer';
const shots='docs/progress/screenshots/P6';
test('P6 five historical worlds, dossiers, tour and calligraphy',async({page},info)=>{
  test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?year=230');await fs.mkdir(shots,{recursive:true});
  await expect(page.locator('.world-tracks')).toHaveAttribute('data-track-count','4');
  await expect(page.locator('.calligraphy-glyphs svg')).toHaveCount(2);
  const mobile=info.project.name!=='desktop';
  if(mobile){await page.getByRole('slider',{name:'收起 / 半开 / 全开'}).focus();await page.keyboard.press('End');}
  for(const [year,count]of [[230,4],[500,3],[950,12],[1140,4],[-100,1]]){
    await page.locator('#history-year').fill(String(year));await page.locator('#history-year').press('Enter');
    await expect(page.locator('.world-tracks')).toHaveAttribute('data-track-count',String(count));
    await expect.poll(async()=>{const s=JSON.parse(await page.getByTestId('terrain').getAttribute('data-stats')??'{}');return s.morph?.ready&&!s.morph?.preparing&&!s.morph?.playing;},{timeout:40000}).toBe(true);
    if(mobile){await page.locator('.world-tracks').scrollIntoViewIfNeeded();await expect(page.locator('.world-tracks [role=tab]')).toHaveCount(count!);}else expect(await page.locator('.world-track').count()).toBe(Math.min(4,count!));
    await page.waitForTimeout(2200);
    await page.screenshot({path:`${shots}/${info.project.name}-${year}.png`});
  }
  await page.locator('#history-year').fill('230');await page.locator('#history-year').press('Enter');await expect(page.locator('.world-tracks')).toHaveAttribute('data-track-count','4');
  if(mobile){const handle=page.getByRole('slider',{name:'收起 / 半开 / 全开'});await handle.focus();await page.keyboard.press('Home');await page.waitForTimeout(600);await page.screenshot({path:`${shots}/${info.project.name}-map.png`});await page.keyboard.press('ArrowUp');await page.waitForTimeout(600);await page.screenshot({path:`${shots}/${info.project.name}-half.png`});await page.keyboard.press('End');}
  await page.locator('.track-title').first().click();await expect(page.getByRole('dialog',{name:'政权档案'})).toContainText('君主世系');await expect(page.locator('.ruler-lineage li')).not.toHaveCount(0);await page.screenshot({path:`${shots}/${info.project.name}-dossier.png`});await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'开始导览',exact:true}).click();await expect(page.getByRole('button',{name:'暂停导览',exact:true})).toBeVisible();await page.getByRole('button',{name:'暂停导览',exact:true}).click();
  const paused=await page.locator('#history-year').inputValue();await page.waitForTimeout(600);await expect(page.locator('#history-year')).toHaveValue(paused);
  await page.getByRole('button',{name:'下一章',exact:true}).click();await expect(page.locator('h1')).toHaveAccessibleName('西晋');await page.getByRole('button',{name:'结束导览',exact:true}).click();
  if(mobile){await page.locator('.world-tracks').scrollIntoViewIfNeeded();const targets=await page.locator('.world-tracks button,.tour-buttons button,.legend-entry button').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent,width:r.width,height:r.height};}));for(const target of targets){expect(target.width,target.text??'').toBeGreaterThanOrEqual(44);expect(target.height,target.text??'').toBeGreaterThanOrEqual(44);}await fs.mkdir('docs/progress/performance/P6',{recursive:true});await fs.writeFile(`docs/progress/performance/P6/${info.project.name}-targets.json`,JSON.stringify(targets,null,2));}
  expect(errors).toEqual([]);
});
test('P6 translated P5 controls, reduced motion and same-year camera',async({page},info)=>{
  await page.goto('/?year=1140&lang=en&debug=1');
  if(info.project.name!=='desktop'){await page.getByRole('slider',{name:'Collapsed / Half / Expanded'}).focus();await page.keyboard.press('End');}
  await expect(page.getByRole('button',{name:'Go to year',exact:true})).toBeAttached();
  await expect(page.getByRole('combobox',{name:'Playback speed'})).toBeAttached();
  await expect(page.locator('.world-tracks')).toHaveAttribute('data-track-count','4');
  await expect(page.locator('h1')).toHaveAccessibleName(/Song/);
  await page.screenshot({path:`${shots}/${info.project.name}-en.png`});
  await page.evaluate(async()=>{const {useShell}=await import('/src/state/shell.ts' as string);useShell.getState().setLocale('zh-Hant');});
  await expect(page.getByRole('button',{name:'跳轉年份',exact:true})).toBeAttached();
  await expect(page.getByRole('slider',{name:/歷史長河/})).toBeAttached();
  if(info.project.name!=='desktop'){await page.getByRole('slider',{name:'收起 / 半開 / 全開'}).focus();await page.keyboard.press('End');}
  await page.locator('#history-year').fill('唐貞觀三年');await page.locator('#history-year').press('Enter');await expect(page.locator('#history-year')).toHaveValue('629');
  await page.locator('#history-year').fill('1140');await page.locator('#history-year').press('Enter');
  await page.screenshot({path:`${shots}/${info.project.name}-hant.png`});
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.calligraphy')).toHaveAttribute('data-animated','false');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await expect.poll(async()=>page.evaluate(async()=>{const {terrainBridge}=await import('/src/state/terrain.ts' as string);return !!terrainBridge.engine?.morph.stats().ready;}),{timeout:40000}).toBe(true);
  const resonance=await page.evaluate(async()=>{const {terrainBridge}=await import('/src/state/terrain.ts' as string);const {loadChronicle}=await import('/src/store/chronicle.ts' as string);const {frameSites}=await import('/src/state/camera-story.ts' as string);const data=await loadChronicle();const sites=data.events.filter((e:{year:number})=>e.year===1140).flatMap((e:{coord?:[number,number];siteCoords?:[number,number][]})=>e.siteCoords??(e.coord?[e.coord]:[]));terrainBridge.engine!.resonance.trigger(sites);frameSites(sites,0);return sites;});
  expect(resonance.length).toBeGreaterThanOrEqual(3);
  await expect.poll(()=>page.evaluate(async(coords)=>{const {terrainBridge}=await import('/src/state/terrain.ts' as string);return coords.every((c:[number,number])=>terrainBridge.engine!.projectSite(c).visible);},resonance)).toBe(true);
  await page.waitForTimeout(200);await page.screenshot({path:`${shots}/${info.project.name}-resonance.png`});
  await page.waitForTimeout(2000);expect(await page.evaluate(async()=>{const {terrainBridge}=await import('/src/state/terrain.ts' as string);return terrainBridge.engine!.resonance.stats().active;})).toBe(false);
});
test('P6 recorded chapter tour and cross-snapshot drag performance',async({browser},info)=>{
  test.skip(process.env.P6_ACCEPTANCE!=='1','Dedicated serial recording');test.setTimeout(180000);
  const use=info.project.use,name=info.project.name;await fs.mkdir('docs/progress/videos/P6',{recursive:true});await fs.mkdir('docs/progress/performance/P6',{recursive:true});
  const context=await browser.newContext({viewport:use.viewport??{width:1440,height:900},deviceScaleFactor:use.deviceScaleFactor??1,isMobile:use.isMobile??false,hasTouch:use.hasTouch??false,recordVideo:{dir:'.cache/p6-video',size:use.viewport??{width:1440,height:900}}}),page=await context.newPage(),video=page.video()!;
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto('http://127.0.0.1:4173/?year=230');const stats=async()=>JSON.parse(await page.getByTestId('terrain').getAttribute('data-stats')??'{}') as EngineStats;
    await expect.poll(async()=>(await stats()).morph?.ready,{timeout:40000}).toBe(true);
    if(name!=='desktop'){await page.getByRole('slider',{name:'收起 / 半开 / 全开'}).focus();await page.keyboard.press('End');}
    await page.getByRole('button',{name:'开始导览',exact:true}).click();await page.waitForTimeout(6500);await page.getByRole('button',{name:'暂停导览',exact:true}).click();await page.getByRole('button',{name:'下一章',exact:true}).click();await page.waitForTimeout(2500);await page.getByRole('button',{name:'结束导览',exact:true}).click();
    const runs=[];
    for(const [label,a,b]of [['matched-P5',220,240],['cross-snapshots',210,285]] as const){
      await page.evaluate(async({a,b})=>{const {setTimeView,seekYear}=await import('/src/store/time.ts' as string);seekYear(230);setTimeView(a,b);},{a,b});
      await expect(page.locator('.river-years span').first()).toHaveText(`${a}年`);await expect(page.locator('.river-years span').last()).toHaveText(`${b}年`);
      const river=page.locator('.history-river');await river.scrollIntoViewIfNeeded();const box=(await river.boundingBox())!,samples:EngineStats[]=[];
      for(let round=0;round<2;round++){await page.mouse.move(box.x+box.width*(round?.9:.1),box.y+box.height/2);await page.mouse.down();for(let i=0;i<=30;i++){await page.mouse.move(box.x+box.width*(round?.9-.8*i/30:.1+.8*i/30),box.y+box.height/2);await page.waitForTimeout(100);if(i%3===0)samples.push(await stats());}await page.mouse.up();await page.waitForTimeout(500);}
      await expect.poll(async()=>(await stats()).morph?.preview,{timeout:40000}).toBe(false);
      const fps=samples.map(s=>s.fps);runs.push({label,meanFps:fps.reduce((a,b)=>a+b,0)/fps.length,minFps:Math.min(...fps),maxFrameMs:Math.max(...samples.map(s=>s.frameMs)),samples});
    }
    await page.locator('#history-year').fill('1140');await page.locator('#history-year').press('Enter');await page.waitForTimeout(3000);
    expect(errors).toEqual([]);await fs.writeFile(`docs/progress/performance/P6/${name}.json`,JSON.stringify({viewport:use.viewport,note:'Desktop Chromium D3D11 GPU, emulated phone viewports; not physical-phone benchmarks.',runs,errors},null,2));
  }finally{await context.close();await video.saveAs(`docs/progress/videos/P6/${name}-chapters-drag.webm`);}
});
test('P6 held drag defers SDF, then refines without losing cached geometry',async({page},info)=>{
  test.skip(info.project.name!=='desktop','Shared GPU cache contract');
  await page.goto('/?year=230');
  const stats=async()=>JSON.parse(await page.getByTestId('terrain').getAttribute('data-stats')??'{}') as EngineStats;
  await expect.poll(async()=>(await stats()).morph?.ready,{timeout:40000}).toBe(true);
  await page.evaluate(async()=>{const {timeStore,seekIndex}=await import('/src/store/time.ts' as string);timeStore.setState({scrubbing:true});seekIndex(255,'drag',25);});
  await expect.poll(async()=>(await stats()).morph?.preview).toBe(true);
  await page.waitForTimeout(700);expect((await stats()).morph.preview).toBe(true);expect((await stats()).morph.workerMs).toBe(0);
  await page.evaluate(async()=>{const {timeStore}=await import('/src/store/time.ts' as string);timeStore.setState({scrubbing:false,velocity:0});});
  await expect.poll(async()=>(await stats()).morph?.preview,{timeout:40000}).toBe(false);
  await expect.poll(async()=>(await stats()).morph?.mode).toBe('sdf');
  const audit=await page.evaluate(async()=>{const {terrainBridge}=await import('/src/state/terrain.ts' as string);return terrainBridge.engine!.morph.audit();});
  expect(audit.gaps).toBe(0);expect(audit.invalid).toBe(0);expect(audit.mismatches).toBe(0);
  expect((await stats()).morph.error).toBeNull();
});
