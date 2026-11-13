import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import fs from 'node:fs/promises';
import type {EngineStats} from '../packages/engine/Renderer';
const stats=async(page:Page)=>JSON.parse(await page.getByTestId('terrain').getAttribute('data-stats')??'{}')as EngineStats;
async function ready(page:Page){await expect.poll(async()=>(await stats(page)).weather?.ready,{timeout:40000}).toBe(true);}
test('P7 automatic fractional playback triggers sky at 4x without waiting for a stopped year',async({page},info)=>{
  test.skip(info.project.name!=='desktop','Shared timeline subscription contract');const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?year=625');await ready(page);
  await page.evaluate(async()=>{const {loadMoods}=await import('/src/state/weather.ts' as string);await loadMoods();const {timeStore,seekIndex}=await import('/src/store/time.ts' as string);timeStore.setState({playing:true,speed:4});seekIndex(627.2,'play');});
  await expect.poll(async()=>{const w=(await stats(page)).weather;return [w.mood,w.event?.year,w.skyOnly];}).toEqual(['glory',627,true]);expect(Object.values((await stats(page)).weather.particles).every(n=>n===0)).toBe(true);expect(errors).toEqual([]);
});
test('P7 weather rendering, consent, independent controls and sky-only degradation',async({page},info)=>{
  test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/lab/weather');await ready(page);
  expect(await page.evaluate(async()=>{const {weatherMixer}=await import('/src/audio/WeatherMixer.ts' as string);return weatherMixer.stats();})).toMatchObject({consent:false,enabled:false,state:'uninitialized'});
  await page.getByRole('button',{name:'赤壁之战',exact:true}).click();await expect.poll(async()=>(await stats(page)).weather.fire,{timeout:40000}).toBe(true);
  await expect.poll(async()=>(await stats(page)).weather.riverSegments).toBeGreaterThan(0);
  await fs.mkdir('docs/progress/screenshots/P7',{recursive:true});await page.screenshot({path:`docs/progress/screenshots/P7/${info.project.name}-lab-fire.png`});
  await page.getByRole('button',{name:'开启古琴与环境音',exact:true}).click();
  await expect.poll(()=>page.evaluate(async()=>{const {weatherMixer}=await import('/src/audio/WeatherMixer.ts' as string);return weatherMixer.stats().buffers;}),{timeout:15000}).toBe(4);
  await page.getByRole('button',{name:'静音全部声音',exact:true}).click();
  expect(await page.evaluate(async()=>{const {weatherMixer}=await import('/src/audio/WeatherMixer.ts' as string);return weatherMixer.stats().enabled;})).toBe(false);
  await page.getByRole('button',{name:'停止并放晴',exact:true}).click();
  await page.evaluate(async()=>{const {terrainBridge}=await import('/src/state/terrain.ts' as string);const {useTerrainSettings}=await import('/src/state/terrain.ts' as string);const {useShell}=await import('/src/state/shell.ts' as string);useTerrainSettings.setState({automatic:false});useShell.getState().setQuality('eco');const d=terrainBridge.engine!.weather.director;d.lastTrigger=-Infinity;terrainBridge.engine!.weather.trigger({id:'eco',title:'靖康之变',year:1127,mood:'sorrow'});});
  await expect.poll(async()=>(await stats(page)).weather.particles.rain).toBe(2000);expect((await stats(page)).weather.lightning).toBe(false);
  await page.evaluate(async()=>{const {timeStore}=await import('/src/store/time.ts' as string);timeStore.setState({speed:4});});
  await expect.poll(async()=>(await stats(page)).weather.skyOnly).toBe(true);
  expect(Object.values((await stats(page)).weather.particles).every(n=>n===0)).toBe(true);
  await page.evaluate(async()=>{const {timeStore}=await import('/src/store/time.ts' as string);const {terrainBridge}=await import('/src/state/terrain.ts' as string);timeStore.setState({speed:1});terrainBridge.engine!.weather.director.lastTrigger=-Infinity;terrainBridge.engine!.weather.trigger({id:'solemn',title:'南京大屠杀',year:1937,mood:'fire'});});
  await expect.poll(async()=>(await stats(page)).weather.mood).toBe('solemn');expect((await stats(page)).weather.fire).toBe(false);
  await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(async()=>(await stats(page)).weather.skyOnly).toBe(true);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.weather-controls summary').click();await page.getByRole('switch',{name:'雨',exact:true}).click();await expect.poll(async()=>(await stats(page)).weather.particles.rain).toBe(0);
  expect(errors).toEqual([]);
});

for(const scenario of ['qin','jingkang','yashan','chibi','zhenguan','bluepass','eco'] as const)test(`P7 recorded ${scenario}`,async({browser},info)=>{
  test.skip(process.env.P7_ACCEPTANCE!=='1','Dedicated serial P7 recording');test.setTimeout(180000);
  const p=info.project.use,viewport=p.viewport??{width:1440,height:900},name=info.project.name,key=scenario==='eco'?'yashan':scenario;
  for(const folder of ['screenshots','videos','performance'])await fs.mkdir(`docs/progress/${folder}/P7`,{recursive:true});
  const context=await browser.newContext({viewport,deviceScaleFactor:p.deviceScaleFactor??1,isMobile:p.isMobile??false,hasTouch:p.hasTouch??false,recordVideo:{dir:'.cache/p7-video',size:viewport}}),page=await context.newPage(),video=page.video()!,errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  try{
    await page.goto('http://127.0.0.1:4173/?year=230');await ready(page);await expect.poll(async()=>(await stats(page)).morph.ready,{timeout:40000}).toBe(true);
    await page.evaluate(async(eco)=>{const {useTerrainSettings}=await import('/src/state/terrain.ts' as string);const {useShell}=await import('/src/state/shell.ts' as string);useTerrainSettings.setState({automatic:false});useShell.getState().setQuality(eco?'eco':'high');},scenario==='eco');
    // Start through the same action as the visible debug buttons. The main UI,
    // calligraphy, river timeline and the actual GPU renderer stay in the recording.
    await page.evaluate(async()=>{const {terrainBridge}=await import('/src/state/terrain.ts' as string);const audit={frames:[] as number[],running:true};(window as unknown as {p7Audit:typeof audit}).p7Audit=audit;let previous=performance.now();const tick=(now:number)=>{if(terrainBridge.engine?.weather.stats().active)audit.frames.push(now-previous);previous=now;if(audit.running)requestAnimationFrame(tick);};requestAnimationFrame(tick);});
    await page.evaluate(async key=>{const {playWeatherScenario}=await import('/src/state/weather.ts' as string);void playWeatherScenario(key);},key);
    await expect.poll(async()=>(await stats(page)).weather.event?.id,{timeout:45000}).toBeTruthy();
    const samples:EngineStats[]=[],beats:{label:string;elapsedMs:number}[]=[];const start=Date.now();let shot=false,last='';
    while(Date.now()-start<90000){
      await page.waitForTimeout(200);const s=await stats(page);samples.push(s);const label=s.weather.cue?.label??s.weather.event?.title??'';
      if(label!==last){beats.push({label,elapsedMs:Date.now()-start});last=label;}
      if(!shot&&s.weather.seconds>=3&&s.weather.strength>.5){await page.screenshot({path:`docs/progress/screenshots/P7/${name}-${scenario}.png`});shot=true;}
      const running=await page.evaluate(async()=>{const {storyLock}=await import('/src/state/weather.ts' as string);return storyLock.active;});if(!running&&!s.weather.active)break;
    }
    expect(shot).toBe(true);expect(samples.at(-1)!.weather.active).toBe(false);
    if(key==='qin'){expect(beats.map(b=>b.label)).toContain('水淹大梁 · 秦灭魏');expect(samples.some(s=>s.weather.wall)).toBe(true);expect(samples.at(-1)!.morph.snapshotB).toBe('s_qin_a');}
    if(key==='jingkang'){expect(samples.some(s=>s.weather.capital)).toBe(true);expect(samples.at(-1)!.weather.flashes).toBe(1);expect(samples.at(-1)!.weather.thunderDelay).toBe(.8);}
    if(scenario==='eco'){expect(Math.max(...samples.map(s=>s.weather.particles.rain))).toBe(2000);expect(samples.some(s=>s.weather.lightning||s.weather.rays>0||s.weather.shake)).toBe(false);}
    const rawFrames=await page.evaluate(()=>{const audit=(window as unknown as {p7Audit:{frames:number[];running:boolean}}).p7Audit;audit.running=false;return audit.frames;});
    const active=samples.filter(s=>s.weather.active),fps=active.map(s=>s.fps);
    await fs.writeFile(`docs/progress/performance/P7/${name}-${scenario}.json`,JSON.stringify({viewport,scenario,rawFrames,rawFps:1000*rawFrames.length/Math.max(1,rawFrames.reduce((a,b)=>a+b,0)),maxRawFrameMs:Math.max(...rawFrames),meanFps:fps.reduce((a,b)=>a+b,0)/Math.max(1,fps.length),minFps:Math.min(...fps),maxFrameMs:Math.max(...active.map(s=>s.frameMs)),note:'Chromium D3D11; phone viewports are desktop GPU emulation. Playwright videos do not capture audio.',beats,errors,samples},null,2));expect(errors).toEqual([]);
  }finally{await context.close();await video.saveAs(`docs/progress/videos/P7/${name}-${scenario}.webm`);}
});
