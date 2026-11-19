import {test,expect} from '@playwright/test';
import type {Locator,Page} from '@playwright/test';
import fs from 'node:fs/promises';

const screenshots='docs/progress/screenshots/R4';
const videos='docs/progress/videos/R4';
const performanceDir='docs/progress/performance/R4';
const minimum=-402,maximum=2027;
const periods=[
  {year:230, polities:['caowei','shuhan','sunwu','gongsun_liaodong'], event:['sunwu',229]},
  {year:500, polities:['beiwei','nanqi','tuyuhun'], event:['nanqi',494]},
  {year:950, polities:['houhan','nantang','wuyue','nanhan'], event:['nantang',955]},
  {year:1140, polities:['unprofiled:nansong:南宋','jin_jurchen','xixia','liao'], event:['jin_jurchen',1138]},
] as const;
const yearField=(page:Page)=>page.locator('#history-year');
const axis=(page:Page)=>page.locator('.timeline-axis');
const track=(page:Page)=>page.getByRole('slider',{name:/年份滑块/});
const lanes=(page:Page)=>page.getByRole('region',{name:'政权事件泳道'});
const lane=(page:Page,key:string)=>page.locator(`.timeline-lane[data-polity="${key}"]`);
const leftEdge=(page:Page)=>page.locator('.timeline-edge[data-edge=left]');
const rightEdge=(page:Page)=>page.locator('.timeline-edge[data-edge=right]');

async function range(node:Locator) {
  const [a,b]=await Promise.all([node.getAttribute('data-start'),node.getAttribute('data-end')]);
  return [Number(a),Number(b)] as const;
}
async function box(node:Locator) {
  const bounds=await node.boundingBox();
  expect(bounds).not.toBeNull();
  return bounds!;
}
async function dragDriver(page:Page,mobile:boolean) {
  const cdp=mobile?await page.context().newCDPSession(page):undefined;
  return {
    async start(x:number,y:number) {
      if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
      else{await page.mouse.move(x,y);await page.mouse.down();}
    },
    async move(x:number,y:number) {
      if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y,id:1}]});
      else await page.mouse.move(x,y);
    },
    async end() {
      if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      else await page.mouse.up();
    },
    async close(){await cdp?.detach();},
  };
}
async function trim(page:Page,driver:Awaited<ReturnType<typeof dragDriver>>,side:0|1,target:number) {
  const edge=side===0?leftEdge(page):rightEdge(page), b=await box(edge), rail=await box(track(page));
  const before=await range(axis(page));
  const x=b.x+b.width/2,y=b.y+b.height/2;
  const delta=(target-before[side])*rail.width/(before[1]-before[0]);
  await driver.start(x,y);
  for(let step=1;step<=7;step++)await driver.move(x+delta*step/7,y);
  await driver.end();
  await expect.poll(async()=>Math.abs((await range(axis(page)))[side]-target)).toBeLessThanOrEqual(5);
  expect(await range(lanes(page))).toEqual(await range(axis(page)));
}
async function stableMap(page:Page) {
  const terrain=page.getByTestId('terrain');
  await expect(terrain).toHaveAttribute('data-ready','true');
  await expect.poll(async()=>{
    const stats=JSON.parse(await terrain.getAttribute('data-stats')??'{}');
    return !!stats.morph?.ready&&!stats.morph?.preparing&&!stats.morph?.playing;
  },{timeout:45000}).toBe(true);
}

test('R4 historical timeline keyboard, spoken year, lifespan ends and full range',async({page},info)=>{
  await page.goto('/?year=230');
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await expect(track(page)).toHaveAttribute('aria-valuetext','公元 230 年 · 魏明帝 · 太和四年');
  await expect(lanes(page)).toContainText('曹魏');
  await expect(yearField(page)).toHaveCount(1);
  await expect(page.locator('.history-river,.rolling-year')).toHaveCount(0);
  expect(await range(axis(page))).toEqual([minimum,maximum]);
  await expect(page.locator('.dynasty-band')).toHaveCount(18);
  await expect(lane(page,'caowei').locator('[data-endpoint=start]')).toHaveAttribute('title',/立国.*220/);
  await expect(lane(page,'caowei').locator('[data-endpoint=end]')).toHaveAttribute('title',/灭亡.*265/);
  expect((await box(page.getByRole('region',{name:'历史时间轴'}))).height).toBeLessThanOrEqual(info.project.name==='desktop'?120:96);
  await expect(page.getByRole('button',{name:'语音讲解'})).toBeVisible();
  await track(page).focus();
  const tooltip=page.getByRole('tooltip');
  await expect(tooltip).toHaveText('公元 230 年 · 魏明帝 · 太和四年');
  const railBox=await box(track(page)), laneBox=await box(lanes(page));
  expect(railBox.y+railBox.height).toBeLessThanOrEqual(laneBox.y+.1);
  if(info.project.name!=='desktop'){
    const tipBox=await box(tooltip), fieldBox=await box(yearField(page));
    expect(tipBox.y+tipBox.height).toBeLessThan(fieldBox.y);
  }
  await track(page).press('ArrowRight');
  await expect(yearField(page)).toHaveValue('231');
  await track(page).press('ArrowLeft');
  await expect(yearField(page)).toHaveValue('230');
  await track(page).press('Shift+ArrowLeft');
  await expect(yearField(page)).toHaveValue('229');
  await track(page).press('Shift+ArrowRight');
  await expect(yearField(page)).toHaveValue('230');
  await leftEdge(page).press('ArrowRight');
  expect((await range(axis(page)))[0]).toBeGreaterThan(minimum);
  await rightEdge(page).press('ArrowLeft');
  expect((await range(axis(page)))[1]).toBeLessThan(maximum);
  await rightEdge(page).press('Enter');
  expect(await range(axis(page))).toEqual([minimum,maximum]);
  await yearField(page).fill('-1');
  await yearField(page).press('Enter');
  await track(page).press('ArrowRight');
  await expect(yearField(page)).toHaveValue('1');
  expect(errors).toEqual([]);
});

test.use({video:process.env.R4_ACCEPTANCE==='1'?'on':'off'});
test('R4 four periods recorded crop, scrub and lane navigation with frame samples',async({page},info)=>{
  test.skip(process.env.R4_ACCEPTANCE!=='1','Run with R4_ACCEPTANCE=1 to capture videos and frame samples');
  test.setTimeout(250000);
  await Promise.all([screenshots,videos,performanceDir].map(dir=>fs.mkdir(dir,{recursive:true})));
  const name=info.project.name,mobile=name!=='desktop',errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  const runs=[];
  const driver=await dragDriver(page,mobile);
  try{
    for(const period of periods){
      await page.goto(`/?year=${period.year}`);
      for(const key of period.polities)await expect(lane(page,key)).toBeAttached();
      await stableMap(page);
      await expect(yearField(page)).toHaveValue(String(period.year));
      await page.screenshot({path:`${screenshots}/${name}-${period.year}.png`});
      await trim(page,driver,0,period.year-26);
      await trim(page,driver,1,period.year+26);
      await expect(yearField(page)).toHaveValue(String(period.year));
      if(period.year===230){
        await track(page).focus();
        await expect(page.getByRole('tooltip')).toHaveText('公元 230 年 · 魏明帝 · 太和四年');
        await page.screenshot({path:`${screenshots}/${name}-230-crop.png`});
      }
      const b=await box(track(page)),y=b.y+b.height/2;
      await driver.start(b.x+b.width*.28,y);
      await page.evaluate(()=>{
        const win=window as Window & {atlasDragFrames?:{last:number;deltas:number[];active:boolean}};
        const sample={last:0,deltas:[] as number[],active:true};
        win.atlasDragFrames=sample;
        const measure=(now:number)=>{
          if(!sample.active)return;
          if(sample.last)sample.deltas.push(now-sample.last);
          sample.last=now;
          requestAnimationFrame(measure);
        };
        requestAnimationFrame(measure);
      });
      for(let i=0;i<=30;i++){
        await driver.move(b.x+b.width*(.28+.46*i/30),y);
        await page.waitForTimeout(65);
      }
      const deltas=await page.evaluate(()=>{
        const win=window as Window & {atlasDragFrames?:{active:boolean;deltas:number[]}};
        const sample=win.atlasDragFrames!;
        sample.active=false;
        return sample.deltas;
      });
      await driver.end();
      expect(deltas.length).toBeGreaterThan(15);
      await expect.poll(async()=>Number(await yearField(page).inputValue())).toBeGreaterThan(period.year+4);
      const sorted=[...deltas].sort((a,b)=>a-b);
      runs.push({year:period.year,frames:deltas.length,elapsedMs:deltas.reduce((a,b)=>a+b,0),p95Ms:sorted[Math.ceil(sorted.length*.95)-1],deltas});
      const [key,eventYear]=period.event;
      const marker=lane(page,key).locator(`.lane-tick[data-year="${eventYear}"]`);
      await marker.scrollIntoViewIfNeeded();
      if(!mobile){
        await marker.hover();
        await expect(page.getByRole('tooltip')).toContainText(String(eventYear));
        await marker.click();
      }else await marker.tap();
      await expect(yearField(page)).toHaveValue(String(eventYear));
      if(mobile){await leftEdge(page).tap();await leftEdge(page).tap();}
      else await leftEdge(page).dblclick();
      await expect.poll(()=>range(axis(page))).toEqual([minimum,maximum]);
      await page.waitForTimeout(350);
    }
    expect(errors).toEqual([]);
    await fs.writeFile(`${performanceDir}/${name}-drag.json`,JSON.stringify({viewport:page.viewportSize(),method:mobile?'emulated touch':'mouse',video:true,runs},null,2)+'\n');
  }finally{
    await driver.close();
    const video=page.video();
    await page.close();
    await video?.saveAs(`${videos}/${name}-timeline.webm`);
  }
});
