import fs from 'node:fs/promises';
import {expect,test} from '@playwright/test';

const years=[-221,230,589,1127,1700];
const folder='docs/progress/screenshots/R2';
const stats=(page:import('@playwright/test').Page)=>page.getByTestId('terrain').getAttribute('data-stats').then(s=>JSON.parse(s??'{}'));
test.use({video:'on'});

test('R2 five north-up maps keep the historical extent centered',async({page},info)=>{
  test.setTimeout(160000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await fs.mkdir(folder,{recursive:true});
  const dimensions=[];
  for(const year of years){
    const coverage=page.waitForResponse(response=>response.url().endsWith('/tiles/flat-world.webp')&&response.ok());
    await page.goto(`/?year=${year}`);
    await expect(page.getByTestId('terrain')).toHaveAttribute('data-projection','orthographic');
    await coverage;
    await expect.poll(async()=>{const s=await stats(page);return s.morph?.ready&&!s.morph.playing;},{timeout:25000}).toBe(true);
    const fit=await page.evaluate(async(year)=>{
      const {terrainBridge}=await import('/src/state/terrain.ts' as string);
      const {loadChronicle}=await import('/src/store/chronicle.ts' as string);
      const chronicle=await loadChronicle(),engine=terrainBridge.engine!;
      const key=chronicle.phases.slice().reverse().find((p:{from:number})=>p.from<=year)!.snapshot;
      const frames=await fetch('/data/map-frames.json').then(r=>r.json());
      const [west,south,east,north]=frames[key];
      const a=engine.projectSite([west,north]),b=engine.projectSite([east,south]);
      const {width,height,mobile}=engine.camera;
      return {year,key,width,height,span:Math.max((b.x-a.x)/width,(b.y-a.y)/height),offsetX:(a.x+b.x)/2-width/2,offsetY:(a.y+b.y)/2-height/2+(mobile?44:0)};
    },year);
    expect(fit.span).toBeGreaterThanOrEqual(.70);
    expect(fit.span).toBeLessThanOrEqual(.76);
    expect(Math.abs(fit.offsetX)).toBeLessThan(2);expect(Math.abs(fit.offsetY)).toBeLessThan(2);
    expect((await stats(page)).pose).toMatchObject({bearing:0,pitch:90});
    dimensions.push(fit);
    await expect(page.locator('.map-scale')).toContainText('公里');
    await expect(page.locator('.polity-labels [data-neighbor=false]:visible').first()).toBeVisible();
    await page.screenshot({path:`${folder}/${info.project.name}-${year}.png`});
  }
  await fs.mkdir('docs/progress/performance/R2',{recursive:true});
  await fs.writeFile(`docs/progress/performance/R2/${info.project.name}-framing.json`,JSON.stringify(dimensions,null,2)+'\n');
  expect(errors).toEqual([]);
});

test('R2 zoom, north lock, reset, and legend focus use the flat map',async({page},info)=>{
  await page.goto('/?year=230');
  await expect.poll(async()=>(await stats(page)).morph?.ready).toBe(true);
  await expect(page.locator('.terrain-vignette,.camera-controls')).toHaveCount(0);
  await expect(page.locator('.place-label.glass')).toHaveCount(0);
  await expect(page.locator('.place-label[data-kind=capital]:visible').first()).toBeVisible();
  const view=page.viewportSize()!,x=view.width*.45,y=view.height*.35;
  await page.keyboard.down('Shift');await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+34,y+16,{steps:6});await page.mouse.up();await page.keyboard.up('Shift');
  await page.mouse.move(x,y);await page.mouse.wheel(0,-240);
  await expect.poll(async()=>(await stats(page)).pose.distance).toBeLessThan(8200);
  expect((await stats(page)).pose).toMatchObject({bearing:0,pitch:90});
  await page.getByRole('button',{name:'复位视图',exact:true}).click();
  await expect.poll(async()=>(await stats(page)).pose.distance).toBeCloseTo(8200,0);
  await page.locator('.map-legend summary').click();
  await expect(page.locator('.phase-dots [aria-current=step]')).toHaveCount(1);
  await expect(page.locator('.map-legend')).toContainText('历史疆域为示意性近似，非测绘边界');
  const polity=page.locator('.map-legend .legend-entry button[aria-pressed]').first();
  await polity.click();await expect(polity).toHaveAttribute('aria-pressed','true');
  await polity.click();await expect(polity).toHaveAttribute('aria-pressed','false');
  if(info.project.name==='desktop'){
    await page.goto('/lab/map2d?year=230');
    await expect.poll(async()=>(await stats(page)).morph?.ready).toBe(true);
    await expect(page.getByTestId('terrain')).toHaveAttribute('data-projection','orthographic');
    await page.goto('/?terrain=1&year=230');
    await expect(page.getByTestId('terrain')).toHaveAttribute('data-projection','perspective');
    await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready','true');
  }
});

test.describe('R2 recorded territory growth',()=>{
  test('orthographic rendering preserves GPU ownership throughout a transition',async({page},info)=>{
    test.skip(info.project.name!=='desktop','The ownership shader is shared by every viewport');
    await page.goto('/lab/map2d?year=230');
    await expect.poll(async()=>(await stats(page)).morph?.ready).toBe(true);
    const samples=await page.evaluate(async()=>{
      const {terrainBridge}=await import('/src/state/terrain.ts' as string);
      const engine=terrainBridge.engine!, morph=engine.morph;
      await morph.prepare('s_sanguo_a','s_sanguo');
      const results=[];
      for(const t of [.2,.5,.8]){
        morph.setProgress(t,'seek');
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        results.push(await morph.audit());
        await new Promise(resolve=>setTimeout(resolve,450));
      }
      return results;
    });
    for(const sample of samples)expect(sample).toMatchObject({gaps:0,invalid:0,mismatches:0});
    expect(new Set(samples.map(s=>s.hash)).size).toBeGreaterThan(1);
    await fs.mkdir('docs/progress/videos/R2',{recursive:true});
    await fs.mkdir('docs/progress/performance/R2',{recursive:true});
    await fs.writeFile('docs/progress/performance/R2/morph-audit.json',JSON.stringify(samples,null,2)+'\n');
    const video=page.video()!;
    await page.close();
    await video.saveAs('docs/progress/videos/R2/desktop-growth.webm');
  });
});
