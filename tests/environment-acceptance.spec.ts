import fs from 'node:fs/promises';
import sharp from 'sharp';
import { test,expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { EngineStats } from '../packages/engine/Renderer';
const stats=async(page:Page)=>JSON.parse((await page.getByTestId('terrain').getAttribute('data-stats'))!) as EngineStats;
const ready=async(page:Page)=>{await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready','true',{timeout:30000});await expect.poll(async()=>(await stats(page)).loading).toBe(0);await expect.poll(async()=>(await stats(page)).environment.ready).toBe(true);};
async function difference(a:Buffer,b:Buffer){const aa=await sharp(a).removeAlpha().raw().toBuffer(),bb=await sharp(b).removeAlpha().raw().toBuffer();let sum=0,changed=0;for(let i=0;i<aa.length;i+=3){const d=Math.abs(aa[i]!-bb[i]!)+Math.abs(aa[i+1]!-bb[i+1]!)+Math.abs(aa[i+2]!-bb[i+2]!);sum+=d;if(d>=3)changed++;}return{meanChannelDelta:sum/aa.length,changedPixels:changed,pixels:aa.length/3};}
test('P3 continuous 32 second environment recording and frame sample',async({browser},info)=>{
  test.skip(!process.env.P3_ACCEPTANCE,'Run pnpm test:environment in isolation');test.setTimeout(120000);
  const profile=info.project.use,viewport=profile.viewport??{width:1440,height:900};
  const context=await browser.newContext({viewport,baseURL:'http://127.0.0.1:4173',deviceScaleFactor:profile.deviceScaleFactor??1,isMobile:profile.isMobile??false,hasTouch:profile.hasTouch??false,...(profile.userAgent?{userAgent:profile.userAgent}:{}),recordVideo:{dir:'test-results/videos',size:viewport}});
  const page=await context.newPage(),video=page.video()!,errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await fs.mkdir('docs/progress/recordings/P5/regression/p4/regression',{recursive:true});await fs.mkdir('docs/progress/performance/P5/regression/p4/regression',{recursive:true});await fs.mkdir('docs/progress/screenshots/P5/regression/p4/regression',{recursive:true});
  try{
    await page.goto('/lab/ocean');await ready(page);await page.waitForTimeout(1500);
    const environment=await page.evaluate(()=>{const gl=document.querySelector('canvas')!.getContext('webgl2')!,ext=gl.getExtension('WEBGL_debug_renderer_info');return{userAgent:navigator.userAgent,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string:gl.getParameter(gl.RENDERER) as string,cores:navigator.hardwareConcurrency,dpr:devicePixelRatio};});
    const samplePromise=page.evaluate(()=>new Promise<{frames:number;elapsedMs:number;meanFps:number;p95FrameMs:number;frameTimes:number[];stats:unknown[]}>(resolve=>{
      const start=performance.now(),values:number[]=[],stats:unknown[]=[];let previous=0,lastStats=0;
      const tick=(now:number)=>{if(previous)values.push(now-previous);previous=now;if(now-lastStats>500){stats.push(JSON.parse(document.querySelector<HTMLCanvasElement>('canvas')!.dataset.stats!));lastStats=now;}if(now-start<32000)requestAnimationFrame(tick);else{const sorted=[...values].sort((a,b)=>a-b);resolve({frames:values.length,elapsedMs:now-start,meanFps:1000/(values.reduce((a,b)=>a+b,0)/values.length),p95FrameMs:sorted[Math.floor(sorted.length*.95)]!,frameTimes:values,stats});}};requestAnimationFrame(tick);
    }));
    const before=await page.getByTestId('terrain').screenshot();await page.waitForTimeout(8000);const after=await page.getByTestId('terrain').screenshot();
    const motion=await difference(before,after);expect(motion.changedPixels).toBeGreaterThan(100);
    await page.screenshot({path:`docs/progress/screenshots/P5/regression/p4/regression/${info.project.name}-ocean-motion.png`});
    await page.waitForTimeout(4000);await page.getByRole('button',{name:'山河云影',exact:true}).click();await expect.poll(async()=>(await stats(page)).pose.lon).toBeCloseTo(104,1);await ready(page);
    await page.waitForTimeout(10000);await page.screenshot({path:`docs/progress/screenshots/P5/regression/p4/regression/${info.project.name}-clouds-motion.png`});
    const sample=await samplePromise;const result={viewport:info.project.name,browserVersion:browser.version(),environment,...sample,stats:sample.stats as EngineStats[],motion,videoSeconds:sample.elapsedMs/1000};
    await fs.writeFile(`docs/progress/performance/P5/regression/p4/regression/${info.project.name}.json`,JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({device:info.project.name,fps:sample.meanFps,p95:sample.p95FrameMs,motion,qualities:[...new Set(result.stats.map(s=>s.quality))]}));
    expect(sample.elapsedMs).toBeGreaterThanOrEqual(32000);expect(sample.meanFps).toBeGreaterThanOrEqual(50);expect(result.stats.every(s=>s.environment.ready&&s.environment.error===null&&s.drawCalls<=250)).toBe(true);expect(errors).toEqual([]);
    await page.goto('/?debug=1&lang=en');await ready(page);await page.screenshot({path:`docs/progress/screenshots/P5/regression/p4/regression/${info.project.name}-debug.png`});
    await page.goto('/?lang=en');await ready(page);await page.screenshot({path:`docs/progress/screenshots/P5/regression/p4/regression/${info.project.name}.png`});
  }finally{await context.close();await video.saveAs(`docs/progress/recordings/P5/regression/p4/regression/${info.project.name}-ocean-clouds.webm`);}
});
test('isolates actual water, wave and cloud shadow pixel changes',async({page},info)=>{
  test.skip(!process.env.P3_ACCEPTANCE||info.project.name!=='desktop','One isolated pixel audit');test.setTimeout(90000);
  await page.goto('/lab/ocean');await ready(page);
  // Test bridge only: fixed time/pose yields deterministic before/after renders.
  const configure=async(effects:Record<string,boolean>,time=20)=>page.evaluate(async({effects,time})=>{
    const {terrainBridge}=await import('/src/state/terrain.ts' as string);const e=terrainBridge.engine!;e.camera.reducedMotion=true;e.environment.reducedMotion=true;e.environment.time=time;e.environment.effects={...e.environment.effects,...effects};e.environment.update(0,e.camera,e.quality.level);e.renderNow();
  },{effects,time});
  const off={clouds:false,cloudShadows:false,waterMotion:false,moonlight:true,coastWaves:false,currents:false,lightCycle:false};await configure(off);
  const base=await page.getByTestId('terrain').screenshot();await configure({waterMotion:true},70);const flowing=await page.getByTestId('terrain').screenshot();
  await configure({waterMotion:false,coastWaves:true});const waves=await page.getByTestId('terrain').screenshot();
  await page.getByRole('button',{name:'山河云影',exact:true}).click();await ready(page);await expect.poll(async()=>(await stats(page)).pose.lon).toBeCloseTo(104,1);
  await configure({...off,clouds:true});const cloudOnly=await page.getByTestId('terrain').screenshot();await configure({cloudShadows:true});const withShadow=await page.getByTestId('terrain').screenshot();
  const proof={water:await difference(base,flowing),waves:await difference(base,waves),shadows:await difference(cloudOnly,withShadow)};
  for(const result of Object.values(proof))expect(result.changedPixels).toBeGreaterThan(50);
  await fs.writeFile('docs/progress/performance/P5/regression/p4/regression/pixel-proof.json',JSON.stringify(proof,null,2)+'\n');
  await fs.writeFile('docs/progress/screenshots/P5/regression/p4/regression/shadow-off.png',cloudOnly);await fs.writeFile('docs/progress/screenshots/P5/regression/p4/regression/shadow-on.png',withShadow);
});
test('composited L0 stays blue, below 25 percent luma span and above 7:1 white contrast',async({page},info)=>{
  test.skip(!process.env.P3_ACCEPTANCE||info.project.name!=='desktop','One rendered pixel audit');
  const reports=[];
  for(const mode of ['clouds','ocean']){
    await page.goto(`/lab/${mode}`);await ready(page);
    const data=await page.evaluate(async()=>{
      const {terrainBridge}=await import('/src/state/terrain.ts' as string);const e=terrainBridge.engine!;e.environment.reducedMotion=true;e.environment.time=45;e.environment.update(0,e.camera,e.quality.level);e.renderNow();return document.querySelector('canvas')!.toDataURL('image/png');
    });
    const image=await sharp(Buffer.from(data.split(',')[1]!,'base64')).removeAlpha().raw().toBuffer();
    const linear=Array.from({length:256},(_,i)=>{const c=i/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});let minLuma=1,maxLuma=0,maxLuminance=0,wrongHuePixels=0;
    for(let i=0;i<image.length;i+=3){const r=image[i]!,g=image[i+1]!,b=image[i+2]!,y=(r*.2126+g*.7152+b*.0722)/255,Y=linear[r]!*.2126+linear[g]!*.7152+linear[b]!*.0722;minLuma=Math.min(minLuma,y);maxLuma=Math.max(maxLuma,y);maxLuminance=Math.max(maxLuminance,Y);if(!(b>g&&g>r))wrongHuePixels++;}
    const result={mode,pixels:image.length/3,minLuma,maxLuma,lumaSpan:maxLuma-minLuma,maxLuminance,whiteContrast:1.05/(maxLuminance+.05),wrongHuePixels};reports.push(result);
    expect(result.lumaSpan).toBeLessThanOrEqual(.25);expect(result.whiteContrast).toBeGreaterThanOrEqual(7);expect(result.wrongHuePixels).toBe(0);
  }
  await fs.writeFile('docs/progress/performance/P5/regression/p4/regression/l0-audit.json',JSON.stringify(reports,null,2)+'\n');
});
