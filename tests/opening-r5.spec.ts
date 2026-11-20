import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';
import fs from 'node:fs/promises';

const shots='docs/progress/screenshots/R5';
const videos='docs/progress/videos/R5';
const performanceDir='docs/progress/performance/R5';
const opening=(page:Page)=>page.getByRole('dialog',{name:'开场地球'});
const assetPattern='**/brand/opening/*.webp';

interface Sample { elapsed: number; timestamp: number; blend: number; title: number }
interface OpeningReadout { frames: Sample[]; mapReady: number | null; end: number | null }
type MeasuredWindow = Window & { r5Opening?: OpeningReadout };

async function controlStartupQuality(page:Page, quality:'high'|'eco'='high') {
  let continueLoads!: ()=>void;
  const wait = new Promise<void>(resolve=>{ continueLoads=resolve; });
  await page.route(assetPattern,async route=>{ await wait; await route.continue(); });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  try {
    await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready','true',{timeout:45000});
    await page.evaluate(async desired=>{
      const [{useTerrainSettings},{useShell}]=await Promise.all([
        import('/src/state/terrain.ts' as string),import('/src/state/shell.ts' as string),
      ]);
      useTerrainSettings.setState({automatic:false});
      useShell.getState().setQuality(desired);
    },quality);
  } finally { continueLoads(); }
}

test('R5 skip during lazy loading preserves the rendered map and suppresses replay on reload',async({page})=>{
  test.setTimeout(65000);
  let cancel!:()=>void;
  const wait=new Promise<void>(resolve=>{cancel=resolve;});
  let requests=0;
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(assetPattern,async route=>{requests++;await wait;await route.abort();});
  try {
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await expect(opening(page)).toHaveAttribute('data-mode','loading');
    await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready','true',{timeout:45000});
    await expect.poll(()=>requests).toBeGreaterThan(0);
    await expect(page.getByTestId('terrain')).toBeVisible();
    await page.getByRole('button',{name:/跳过开场/}).click();
    await expect(opening(page)).toHaveCount(0);
    // The disposed intro may already have canceled its intercepted fetch.
    await page.unrouteAll({behavior:'ignoreErrors'});
    cancel();
    await page.reload({waitUntil:'domcontentloaded'});
    await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready','true',{timeout:45000});
    await expect(opening(page)).toHaveCount(0);
    expect(await page.evaluate(()=>localStorage.getItem('witlu-intro-v1'))).toBe('seen');
    await page.evaluate(async()=>{
      const [{useTerrainSettings},{useShell}]=await Promise.all([
        import('/src/state/terrain.ts' as string),import('/src/state/shell.ts' as string),
      ]);
      useTerrainSettings.setState({automatic:false});
      useShell.getState().setQuality('high');
      window.dispatchEvent(new Event('atlas:opening'));
    });
    await expect(opening(page)).toHaveAttribute('data-mode','animated',{timeout:25000});
    await page.getByRole('button',{name:/跳过开场/}).click();
    await expect(opening(page)).toHaveCount(0);
    await expect(page.getByTestId('terrain')).toBeVisible();
    expect(errors).toEqual([]);
  }finally{cancel();}
});

test('R5 reduced motion and economy each use a static 1.5-second globe',async({page},info)=>{
  test.setTimeout(85000);
  await page.emulateMedia({reducedMotion:'reduce'});
  await controlStartupQuality(page);
  await expect(opening(page)).toHaveAttribute('data-mode','static',{timeout:20000});
  await expect(page.locator('.opening-title .calligraphy')).toHaveAttribute('data-animated','false');
  const capture=async()=>page.evaluate(()=>new Promise<{elapsed:number;alpha:string;transform:string}>(resolve=>{
    function tick() {
      const intro=document.querySelector<HTMLElement>('.opening-screen');
      const title=document.querySelector<HTMLElement>('.opening-title');
      if (intro&&title&&Number(intro.dataset.elapsed)>=550) {
        resolve({elapsed:Number(intro.dataset.elapsed),alpha:getComputedStyle(title).opacity,transform:title.style.transform});
      } else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }));
  const reduced = await capture();
  expect(Number(reduced.alpha)).toBeGreaterThan(0);
  expect(reduced.transform).toBe('');
  if(process.env.R5_ACCEPTANCE==='1'){
    await fs.mkdir(shots,{recursive:true});
    await page.screenshot({path:`${shots}/${info.project.name}-reduced.png`});
  }
  await expect(opening(page)).toHaveCount(0);
  await page.evaluate(()=>localStorage.removeItem('witlu-intro-v1'));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.unroute(assetPattern);
  await controlStartupQuality(page,'eco');
  await expect(opening(page)).toHaveAttribute('data-mode','static',{timeout:20000});
  const economy = await capture();
  expect(economy.transform).toBe('');
  await expect(opening(page)).toHaveCount(0);
});

test.use({video:process.env.R5_ACCEPTANCE==='1'?'on':'off'});
test('R5 recorded first visit, matched map landing and timing',async({page},info)=>{
  test.skip(process.env.R5_ACCEPTANCE!=='1','Set R5_ACCEPTANCE=1 to record the opening');
  test.setTimeout(90000);
  await Promise.all([shots,videos,performanceDir].map(dir=>fs.mkdir(dir,{recursive:true})));
  const name=info.project.name, errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/WebGLProgram|Shader Error/i.test(message.text()))errors.push(message.text());});
  await page.addInitScript(()=>{
    const win=window as MeasuredWindow;
    const timing:OpeningReadout={frames:[],mapReady:null,end:null};
    win.r5Opening=timing;
    new MutationObserver(()=>{
      if(timing.mapReady===null&&document.querySelector('[data-testid=terrain][data-ready=true]'))timing.mapReady=performance.now();
    }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-ready']});
    const tick=(timestamp:number)=>{
      const host=document.querySelector<HTMLElement>('.opening-screen[data-mode=animated]');
      if(host){
        const title=document.querySelector<HTMLElement>('.opening-title');
        timing.frames.push({timestamp,elapsed:Number(host.dataset.elapsed),blend:Number(host.dataset.mapBlend),title:Number(title?.style.opacity)});
      }else if(timing.frames.length&&timing.end===null){timing.end=timestamp;return;}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  try {
    await controlStartupQuality(page);
    const dialog=opening(page), terrain=page.getByTestId('terrain');
    await expect(dialog).toHaveAttribute('data-mode','animated',{timeout:25000});
    await expect(dialog).toHaveAttribute('data-resolution',name==='desktop'?'4096':'2048');
    await expect(terrain).toHaveAttribute('data-projection','orthographic');
    const framing=await page.evaluate(()=>{
      const target=document.querySelector<HTMLElement>('.opening-screen')!.dataset.mapFocus!.split(',').map(Number);
      const map=document.querySelector<HTMLCanvasElement>('.terrain-canvas')!, rect=map.getBoundingClientRect();
      return {target, center:[rect.left+rect.width/2,rect.top+rect.height/2],pose:JSON.parse(map.dataset.stats!).pose};
    });
    expect(framing.target[0]).toBeCloseTo(framing.center[0]!,0);
    expect(framing.target[1]).toBeCloseTo(framing.center[1]!,0);
    await expect(dialog).toHaveCount(0,{timeout:8000});
    await expect(terrain).toBeVisible();
    await page.screenshot({path:`${shots}/${name}-end.png`});
    const audit=await page.evaluate(()=>{
      const readout=(window as MeasuredWindow).r5Opening!;
      const assets=(performance.getEntriesByType('resource') as PerformanceResourceTiming[]).filter(e=>/\/brand\/opening\/(day|masks)-\d+\.webp/.test(e.name)).map(e=>({file:new URL(e.name).pathname,start:e.startTime,end:e.responseEnd}));
      const map=document.querySelector<HTMLCanvasElement>('.terrain-canvas')!;
      return {readout,assets,pose:JSON.parse(map.dataset.stats!).pose};
    });
    const {frames,mapReady,end}=audit.readout;
    expect(errors).toEqual([]);
    expect(new Set(audit.assets.map(a=>a.file)).size).toBe(2);
    expect(audit.assets.every(a=>a.start>=(mapReady??Infinity)-2)).toBe(true);
    expect(frames.length).toBeGreaterThan(40);
    expect(end).not.toBeNull();
    const elapsed=(end??Infinity)-frames[0]!.timestamp;
    expect(elapsed).toBeGreaterThan(5250);
    expect(elapsed).toBeLessThanOrEqual(6000);
    expect(frames.some(s=>s.blend>.12&&s.blend<.9)).toBe(true);
    expect(frames.at(-1)!.blend).toBeGreaterThan(.98);
    expect(audit.pose).toEqual(framing.pose);
    const deltas=frames.slice(1).map((sample,i)=>sample.timestamp-frames[i]!.timestamp);
    const sorted=[...deltas].sort((a,b)=>a-b);
    await fs.writeFile(`${performanceDir}/${name}-opening.json`,JSON.stringify({
      viewport:page.viewportSize(),elapsed,meanFps:deltas.length*1000/deltas.reduce((a,b)=>a+b,0),
      p95Ms:sorted[Math.ceil(sorted.length*.95)-1],framing,audit,deltas,
    },null,2)+'\n');
  }finally{
    const video=page.video();
    await page.close();
    await video?.saveAs(`${videos}/${name}-opening.webm`);
  }
});

test('R5 lab captures the authoritative 0, 1.5, 3 and 4.5 second frames',async({page},info)=>{
  test.skip(process.env.R5_ACCEPTANCE!=='1','Set R5_ACCEPTANCE=1 to save the keyframes');
  test.setTimeout(100000);
  await fs.mkdir(shots,{recursive:true});
  for(const [ms,label] of [[0,'0s'],[1500,'1.5s'],[3000,'3s'],[4500,'4.5s']] as const){
    await page.goto(`/lab/opening?frame=${ms}`,{waitUntil:'domcontentloaded'});
    await expect(opening(page)).toHaveAttribute('data-elapsed',`${ms}.0`,{timeout:45000});
    await expect(page.locator('.opening-earth')).toBeVisible();
    await page.screenshot({path:`${shots}/${info.project.name}-${label}.png`});
  }
  await page.getByRole('button',{name:/跳过开场/}).click();
  await expect(opening(page)).toHaveCount(0);
  await expect(page.getByTestId('terrain')).toBeVisible();
});
