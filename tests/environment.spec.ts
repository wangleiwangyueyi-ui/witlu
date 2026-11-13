import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { EngineStats } from '../packages/engine/Renderer';
const stats = async (page: Page) => JSON.parse((await page.getByTestId('terrain').getAttribute('data-stats'))!) as EngineStats;
async function ready(page: Page) {
  await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready', 'true', {timeout:30000});
  await expect.poll(async () => (await stats(page)).environment.ready).toBe(true);
  await expect.poll(async () => (await stats(page)).loading).toBe(0);
}
test('ocean and cloud labs compile and render in all viewports', async ({page},info) => {
  const errors:string[] = []; page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await fs.mkdir('docs/progress/screenshots/P5/regression/p4/regression',{recursive:true});
  for(const mode of ['ocean','clouds']) {
    await page.goto(`/lab/${mode}`);await ready(page);
    await page.screenshot({path:`docs/progress/screenshots/P5/regression/p4/regression/${info.project.name}-${mode}.png`});
    const s = await stats(page);expect(s.environment.clouds).toBeGreaterThan(0);expect(s.environment.enabled).toBe(true);expect(s.errors).toBe(0);
  }
  expect(errors).toEqual([]);
});
test('all sea regions and independent environment controls work',async({page},info)=>{
  test.skip(info.project.name!=='desktop','One switch and lifecycle audit');test.setTimeout(60000);
  await page.goto('/lab/ocean?debug=1');await ready(page);
  for(const [name,lon] of [['南海',114],['印度洋',84],['太平洋',140],['东海',123]] as const) {
    await page.getByRole('button',{name,exact:true}).click();await expect.poll(async()=>(await stats(page)).pose.lon).toBeCloseTo(lon,1);await ready(page);
    await page.screenshot({path:`docs/progress/screenshots/P5/regression/p4/regression/region-${lon}.png`});expect((await stats(page)).errors).toBe(0);
  }
  await page.locator('.debug-console summary').filter({hasText:'特效开关'}).click();
  const pairs = [['海水流动','waterMotion'],['冷色反光','moonlight'],['海岸光浪','coastWaves'],['洋流粒子','currents'],['渐变天空','sky'],['远景雾','fog'],['光照循环','lightCycle'],['漂移云片','clouds'],['移动云影','cloudShadows']] as const;
  for(const [label,key] of pairs) {
    await page.getByRole('switch',{name:label,exact:true}).click();await expect.poll(async()=>(await stats(page)).environment.effects[key]).toBe(false);
    await page.getByRole('switch',{name:label,exact:true}).click();await expect.poll(async()=>(await stats(page)).environment.effects[key]).toBe(true);
  }
  await page.getByRole('tab',{name:'省电',exact:true}).last().click();await expect.poll(async()=>(await stats(page)).environment.normalLayers).toBe(1);
  expect((await stats(page)).environment).toMatchObject({shadowStrength:0,currentParticles:0,cloudLayers:1});
  await page.getByRole('tab',{name:'极致',exact:true}).last().click();await expect.poll(async()=>(await stats(page)).environment.cloudLayers).toBe(4);
  await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(async()=>(await stats(page)).environment.reducedMotion).toBe(true);
  const time=(await stats(page)).environment.time;await page.waitForTimeout(700);expect((await stats(page)).environment.time).toBe(time);
  await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(async()=>(await stats(page)).environment.time).toBeGreaterThan(time);
  await page.evaluate(()=>{const gl=document.querySelector('canvas')!.getContext('webgl2')!;const extension=gl.getExtension('WEBGL_lose_context')!;extension.loseContext();setTimeout(()=>extension.restoreContext(),1200);});
  await expect(page.getByTestId('terrain')).toHaveAttribute('data-context','lost');await expect(page.getByTestId('terrain')).toHaveAttribute('data-context','ready',{timeout:15000});
  await expect.poll(async()=>(await stats(page)).fps).toBeGreaterThan(0);expect((await stats(page)).environment.ready).toBe(true);
});
