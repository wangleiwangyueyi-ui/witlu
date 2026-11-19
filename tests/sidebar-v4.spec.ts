import fs from 'node:fs/promises';
import sharp from 'sharp';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.use({video:'on'});
const folder='docs/progress/screenshots/R3';
const stats = async (page: Page) => JSON.parse(await page.getByTestId('terrain').getAttribute('data-stats')??'{}');
async function ready(page: Page) {
  await expect.poll(async()=>{
    const s=await stats(page);
    return Boolean(s.morph?.ready && !s.morph.preparing && !s.morph.playing && s.loading===0);
  },{timeout:45000}).toBe(true);
}
async function sheet(page: Page, snap: 'Home' | 'End' | 'ArrowUp') {
  const handle=page.getByRole('slider',{name:'收起 / 半开 / 全开'});
  await handle.focus();
  await handle.press(snap);
  await expect(page.locator('.chapter-sheet')).toHaveAttribute('data-snap',snap==='Home'?'0':snap==='End'?'2':'1');
}

test('R3 captures four historical worlds in each viewport',async({page},info)=>{
  test.setTimeout(160000);
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await fs.mkdir(folder,{recursive:true});
  for(const year of [230,383,1127,1279]){
    await page.goto(`/?year=${year}`);
    await ready(page);
    await expect(page.locator('.world-track').first()).toBeAttached();
    await expect(page.locator('.map-event-card:visible').first()).toBeVisible();
    expect(await page.locator('.map-event-card:visible').count()).toBeLessThanOrEqual(2);
    const mobile=info.project.name!=='desktop';
    const unmarkKeyboardFocus=()=>page.locator('.sheet-grabber').evaluate(node=>(node as HTMLElement).blur());
    if(mobile){
      if(year===230)await page.screenshot({path:`${folder}/${info.project.name}-230-map.png`});
      await sheet(page,'ArrowUp');
      await unmarkKeyboardFocus();
      await expect.poll(async()=>{
        const legend=(await page.locator('.map-legend').boundingBox())!,drawer=(await page.locator('.chapter-sheet').boundingBox())!;
        return legend.y+legend.height<=drawer.y;
      }).toBe(true);
    }
    await page.screenshot({path:`${folder}/${info.project.name}-${year}.png`});
    if(mobile && year===230){
      await sheet(page,'End');
      await unmarkKeyboardFocus();
      await expect(page.getByRole('heading',{name:'本朝大事'})).toBeVisible();
      await page.screenshot({path:`${folder}/${info.project.name}-230-chronicle.png`});
    }
  }
  expect(errors).toEqual([]);
});

test('R3 selects the same map focus from chronicle and key, filters dates, and restores the city overlay',async({page},info)=>{
  test.setTimeout(100000);
  await page.goto('/?year=230');
  await ready(page);
  const mobile=info.project.name!=='desktop';
  if(mobile)await sheet(page,'End');
  const header=page.locator('.chronicle-meta');
  await expect(header.locator('.chronicle-reign')).toHaveText('公元 230 年 · 魏明帝 太和四年');
  await expect(header.locator('.chronicle-dynasty')).toHaveText('三国 220—280 · 都城 洛阳/成都/建业');
  const typography=await page.locator('.chronicle-reign,.chronicle-dynasty,.polity-focus,.chronicle-event,.track-title').evaluateAll(nodes=>nodes.map(node=>[node.className,parseFloat(getComputedStyle(node).fontSize)] as const));
  for(const [part,size] of typography)expect(size,part).toBeGreaterThanOrEqual(part==='track-title'?12:14);

  const contrast=await page.locator('.world-track').first().evaluate(node=>{
    const luminance=(value:string)=>{
      const [r,g,b]=(value.match(/[0-9.]+/g)??[]).slice(0,3).map(n=>Number(n)/255).map(n=>n<.04045?n/12.92:((n+.055)/1.055)**2.4);
      return .2126*r!+.7152*g!+.0722*b!;
    };
    const foreground=getComputedStyle(node.querySelector('.polity-focus')!).color;
    const background=getComputedStyle(node).backgroundColor;
    return (luminance(foreground)+.05)/(luminance(background)+.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(7);

  const wu=page.locator('[data-polity=sunwu] .polity-focus');
  const focus=()=>page.evaluate(async()=>{
    const {terrainBridge}=await import('/src/state/terrain.ts' as string);
    return terrainBridge.engine?.morph.uniforms.polityFocus.value;
  });
  await wu.click();
  await expect(wu).toHaveAttribute('aria-pressed','true');
  await expect.poll(focus).toBeGreaterThan(0);
  if(mobile)await sheet(page,'Home');
  await page.locator('.map-legend summary').click();
  const key=page.locator('.legend-entry button[aria-pressed=true]');
  await expect(key).toContainText('孙吴');
  await key.click();
  await expect(wu).toHaveAttribute('aria-pressed','false');
  await page.locator('.map-legend summary').click();
  await expect.poll(focus).toBe(0);

  if(mobile)await sheet(page,'End');
  const list=page.locator('.chronicle-events');
  await expect(list).not.toContainText('史料出处 · 0');
  const choice=page.locator('.event-filters').getByRole('button',{name:'孙吴',exact:true});
  await choice.click();
  await expect(choice).toHaveAttribute('aria-pressed','true');
  await expect(list.locator('.chronicle-event:not([data-regime=sunwu])')).toHaveCount(0);
  const destination=list.locator('.chronicle-event:not([data-year="230"])').first();
  const target=await destination.getAttribute('data-year');
  expect(target).toBeTruthy();
  await destination.click();
  await expect(page.locator('#history-year')).toHaveValue(target!);
  await expect(list.locator(`[data-year="${target}"][aria-current=date]`).first()).toBeVisible();

  await page.locator('#history-year').fill('230');
  await page.locator('#history-year').press('Enter');
  await expect(list.locator('[data-year="230"][aria-current=date]')).toContainText('孙权遣卫温');
  expect(await list.locator('time').first().evaluate(node=>getComputedStyle(node).whiteSpace)).toBe('nowrap');
  const scroll=await list.evaluate(node=>node.scrollTop);
  if(mobile)await sheet(page,'Home');
  const city=page.locator('.place-label[data-kind=capital]:visible').first();
  await city.click();
  const dialog=page.getByRole('dialog',{name:'点地溯源'});
  await expect(dialog).toBeVisible();
  if(!mobile){
    const chronicle=(await page.locator('.chronicle-sidebar').boundingBox())!;
    await expect.poll(async()=>(await dialog.boundingBox())?.x).toBeCloseTo(chronicle.x,0);
    expect((await dialog.boundingBox())!.width).toBeCloseTo(chronicle.width,0);
  }
  await dialog.getByRole('button',{name:'关闭地点卡'}).click();
  await expect(dialog).toHaveCount(0);
  if(mobile){
    await expect(page.locator('.chapter-sheet')).toHaveAttribute('data-snap','0');
    await sheet(page,'End');
  }
  await expect(choice).toHaveAttribute('aria-pressed','true');
  expect(await list.evaluate(node=>node.scrollTop)).toBe(scroll);
  const video=page.video()!;
  await page.close();
  await fs.mkdir('docs/progress/videos/R3',{recursive:true});
  await video.saveAs(`docs/progress/videos/R3/${info.project.name}-sidebar.webm`);
});

test('R3 renders true subpixel vector coverage and restores Liaodong to Yan',async({page},info)=>{
  test.setTimeout(100000);
  await page.emulateMedia({reducedMotion:'reduce'});
  const output=`${folder}/comparison`;
  await fs.mkdir(output,{recursive:true});
  for(const [view,center] of [['seam','108.3,29.5'],['liaodong','122,41.1']]){
    await page.goto(`/?year=230&center=${center}&zoom=5`);
    await ready(page);
    const audit=await page.evaluate(async(view)=>{
      const {terrainBridge}=await import('/src/state/terrain.ts' as string);
      const engine=terrainBridge.engine!,morph=engine.morph,target=morph.flatTerritories.target;
      const size=morph.uniforms.screenStyleSize.value,colors=(await (await fetch('/data/polity-colors.json')).json()).find((r:{snapshot:string})=>r.snapshot==='s_sanguo_a').colors;
      const rows=colors.filter((r:{fill:string|null})=>r.fill);
      const styleBytes=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(n=>Math.round((n<.04045?n/12.92:((n+.055)/1.055)**2.4)*.4*255));
      const expected=rows.map((r:{fill:string})=>styleBytes(r.fill));
      if(view==='liaodong'){
        const sample = await Promise.all([[121.6,38.9],[123.171,41.271],[121.5,39.6],[122.1,40.2]].map(async coord=>{
          const p=engine.projectSite(coord);
          if(!p.visible)return null;
          const x=Math.min(size.x-1,Math.floor(p.x*size.x/engine.camera.width)),y=Math.min(size.y-1,Math.floor((engine.camera.height-p.y)*size.y/engine.camera.height));
          const bytes=new Uint8Array(4);
          await engine.renderer.readRenderTargetPixelsAsync(target,x,y,1,1,bytes);
          return Array.from(bytes);
        }));
        return {snap:morph.stats().snapshotA,progress:morph.stats().t,dpr:devicePixelRatio,msaa:target.samples,sample,expected:styleBytes(rows.find((r:{polityId:string})=>r.polityId==='gongsun_liaodong').fill)};
      }
      const rgba=new Uint8Array(size.x*size.y*4);
      await engine.renderer.readRenderTargetPixelsAsync(target,0,0,size.x,size.y,rgba);
      let mixed=0;
      for(let i=0;i<rgba.length;i+=4)if(rgba[i+3]===102 && !expected.some((v:number[])=>v.every((x,j)=>Math.abs(x-rgba[i+j]!)<=1)))mixed++;
      return {snap:morph.stats().snapshotA,progress:morph.stats().t,dpr:devicePixelRatio,msaa:target.samples,mixed};
    },view);
    expect(audit.snap).toBe('s_sanguo_a');expect(audit.progress).toBe(0);expect(audit.msaa).toBeGreaterThanOrEqual(2);
    if(audit.sample&&audit.expected){
      const pixels=audit.sample.filter((p:number[]|null):p is number[]=>p!==null);
      expect(pixels.length).toBeGreaterThan(1);
      for(const pixel of pixels)for(const [i,expected] of ([...audit.expected,102] as number[]).entries())expect(Math.abs(pixel[i]!-expected)).toBeLessThanOrEqual(2);
    }else expect(audit.mixed).toBeGreaterThan(20);
    await page.screenshot({path:`${output}/after-${info.project.name}-${view}.png`});
    await fs.mkdir('docs/progress/performance/R3',{recursive:true});
    await fs.writeFile(`docs/progress/performance/R3/${info.project.name}-${view}.json`,JSON.stringify(audit,null,2)+'\n');
  }
});

test('R3 isolated terrain stays within the 25 percent L0 luma span',async({page},info)=>{
  test.skip(info.project.name!=='desktop','The L0 shaders are shared by every viewport');
  await page.goto('/lab/map2d?year=230');
  await ready(page);
  const png=await page.evaluate(async()=>{
    const {terrainBridge}=await import('/src/state/terrain.ts' as string);
    const engine=terrainBridge.engine;
    engine.morph.uniforms.territoryEnabled.value=0;
    engine.environment.uniforms.envEnabled.value=0;
    const ground=new Set([...engine.terrain.visible,engine.terrain.backdrop].filter(Boolean).map((tile:{group:unknown})=>tile.group));
    for(const child of engine.scene.children)if(!ground.has(child))child.visible=false;
    engine.renderNow();
    return document.querySelector<HTMLCanvasElement>('.terrain-canvas')!.toDataURL().split(',')[1];
  });
  if(!png)throw new Error('Terrain measurement did not return a canvas image');
  const {data,info:geometry}=await sharp(Buffer.from(png,'base64')).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let minimum=1,maximum=0,land=0,sea=0,offHue=0;
  for(let i=0;i<data.length;i+=3){
    const r=data[i]!,g=data[i+1]!,b=data[i+2]!;
    const luma=(.2126*r+.7152*g+.0722*b)/255;
    minimum=Math.min(minimum,luma);maximum=Math.max(maximum,luma);
    if(b<=g||g<=r)offHue++;
    if(luma<.13)sea++;else land++;
  }
  const measurement={width:geometry.width,height:geometry.height,minimum,maximum,span:maximum-minimum,land,sea,offHue};
  await fs.mkdir('docs/progress/performance/R3',{recursive:true});
  await fs.writeFile('docs/progress/performance/R3/l0.json',JSON.stringify(measurement,null,2)+'\n');
  expect(maximum-minimum).toBeLessThanOrEqual(.25);expect(offHue).toBe(0);
  expect(land).toBeGreaterThan(0);expect(sea).toBeGreaterThan(0);
});
