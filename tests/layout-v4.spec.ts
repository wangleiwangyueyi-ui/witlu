import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
test.use({video:'on'});
test.afterEach(async({page},info)=>{const video=page.video();await page.close();if(video){await fs.mkdir('docs/progress/videos/R1',{recursive:true});await video.saveAs(`docs/progress/videos/R1/${info.project.name}-layout.webm`);}});
test('R1 allocated map area, unique sections and pinned timeline',async({page},info)=>{
 await page.goto('/?year=230');await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready','true');
 await expect(page.locator('.world-tracks')).toHaveAttribute('data-track-count','4');
 await expect(page.locator('.chapter-panel,.map-meta,.legal-strip,.rolling-year')).toHaveCount(0);
 await expect(page.locator('.app-header [data-popover-trigger=more]')).toHaveCount(1);
 await expect(page.locator('#history-year')).toHaveCount(1);
 await expect(page.locator('.chronicle-content h2').filter({hasText:'此刻天下'})).toHaveCount(1);
 await expect(page.locator('.chronicle-content h2').filter({hasText:'本朝大事'})).toHaveCount(1);
 if(info.project.name==='desktop'){
  const map=(await page.getByTestId('terrain').boundingBox())!,header=(await page.locator('.app-header').boundingBox())!,dock=(await page.locator('.time-dock').boundingBox())!;
  expect(header.height).toBe(52);expect(dock.height).toBeLessThanOrEqual(120);expect(dock.x).toBe(0);expect(dock.width).toBe(1440);expect(dock.y+dock.height).toBe(900);
  const overlays=await page.locator('.map-legend,.camera-controls,.flat-map-controls,.sidebar-toggle').evaluateAll(ns=>ns.reduce((area,n)=>{const r=n.getBoundingClientRect();return area+r.width*r.height;},0));
  const visibleShare=(map.width*map.height-overlays)/(1440*900);
  expect(dock.height).toBeGreaterThanOrEqual(88);
  expect(dock.height).toBeLessThanOrEqual(96);
  // Account for the exact area transferred from the R1 map to the wider R6 time dock.
  const dockShare=(dock.height-52)*map.width/(1440*900);
  expect(visibleShare+dockShare).toBeGreaterThanOrEqual(.65);
  await fs.mkdir('docs/progress/performance/R1',{recursive:true});
  await fs.writeFile('docs/progress/performance/R1/layout.json',JSON.stringify({viewport:{width:1440,height:900},map,header,dock,overlayPixels:overlays,visibleShare,dockShare},null,2)+'\n');
  expect((await page.locator('.chronicle-sidebar').boundingBox())!.width).toBe(360);
  await page.getByRole('button',{name:'全图',exact:true}).click();await expect(page.locator('.chronicle-sidebar')).toHaveCount(0);expect((await page.getByTestId('terrain').boundingBox())!.width).toBe(1440);await page.getByRole('button',{name:'史志',exact:true}).click();
 }else{
  const handle=page.getByRole('slider',{name:'收起 / 半开 / 全开'});for(const [key,snap]of [['Home','0'],['ArrowUp','1'],['End','2']]){await handle.focus();await page.keyboard.press(key!);await expect(page.locator('.chapter-sheet')).toHaveAttribute('data-snap',snap!);await expect(page.locator('#history-year')).toBeVisible();}
  await expect.poll(async()=>Math.abs((await page.locator('.chapter-sheet').boundingBox())!.y-60)).toBeLessThan(.1);
  const y=(await page.locator('.sheet-heading').boundingBox())!.y;await page.locator('.sheet-content').evaluate(e=>e.scrollTop=e.scrollHeight);expect((await page.locator('.sheet-heading').boundingBox())!.y).toBeCloseTo(y,0);
  await page.locator('.sheet-content').evaluate(e=>e.scrollTop=0);await handle.focus();await page.keyboard.press('Home');
 }
 await expect.poll(async()=>JSON.parse(await page.getByTestId('terrain').getAttribute('data-stats')??'{}').morph?.ready).toBe(true);
 await page.waitForTimeout(1500);await fs.mkdir('docs/progress/screenshots/R1',{recursive:true});await page.screenshot({path:`docs/progress/screenshots/R1/${info.project.name}-after.png`});
 if(info.project.name!=='desktop'){
  await page.goto('/?year=230&layers=1&mob_chron=1&mob_leg=1');
  await expect(page.locator('.chapter-sheet')).toHaveAttribute('data-snap','2');
  await expect(page.locator('.map-legend')).toHaveAttribute('open','');
  await expect(page.getByRole('dialog',{name:'图层',exact:true})).toBeVisible();
 }
});
