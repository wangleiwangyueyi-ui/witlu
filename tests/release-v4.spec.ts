import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import fs from 'node:fs/promises';
import jsQR from 'jsqr';
import sharp from 'sharp';

const shots = 'docs/progress/screenshots/R7';
const videos = 'docs/progress/videos/R7';
const yearField = (page:Page) => page.locator('#history-year');
const terrain = (page:Page) => page.getByTestId('terrain');

async function mapReady(page:Page) {
  await expect(terrain(page)).toHaveAttribute('data-ready','true',{timeout:45000});
  await expect.poll(async () => {
    const stats = JSON.parse(await terrain(page).getAttribute('data-stats') ?? '{}');
    return Boolean(stats.morph?.ready && !stats.morph?.preparing && !stats.morph?.playing);
  },{timeout:45000}).toBe(true);
}

async function showPoster(page:Page, mobile:boolean) {
  if (mobile) await page.getByRole('button',{name:'更多',exact:true}).tap();
  const share = page.getByRole('button',{name:'分享',exact:true});
  if (mobile) await share.tap();
  else await share.click();
  const dialog = page.getByRole('dialog',{name:'分享海报'});
  const image = dialog.locator('img.share-poster');
  await expect(image).toBeVisible();
  await image.evaluate(image => (image as HTMLImageElement).decode());
  return {dialog,image};
}

test('R7 shares the clean 2D map with a working QR and native long-press image', async ({page},info) => {
  test.setTimeout(90000);
  const mobile = info.project.name !== 'desktop';
  await page.addInitScript(() => {
    Object.defineProperty(navigator,'clipboard',{value:{writeText: () => Promise.reject(new Error('Clipboard unavailable'))}});
  });
  await page.goto('/?year=230');
  await mapReady(page);
  await expect(terrain(page)).toHaveAttribute('data-projection','orthographic');
  await expect(page.locator('.polity-labels [data-neighbor=false]:visible').first()).toBeVisible();
  const viewport = (await terrain(page).boundingBox())!;
  if (process.env.R7_ACCEPTANCE === '1') {
    await fs.mkdir(shots,{recursive:true});
    await page.screenshot({path:`${shots}/${info.project.name}-atlas.png`,scale:'css'});
  }
  const {dialog,image} = await showPoster(page,mobile);
  const bounds = (await image.boundingBox())!;
  const visibleViewport = await page.evaluate(() => visualViewport?.height ?? innerHeight);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y+bounds.height).toBeLessThanOrEqual(visibleViewport);
  const source = await image.evaluate(node => ({
    src:(node as HTMLImageElement).src,
    draggable:(node as HTMLImageElement).draggable,
    userSelect:getComputedStyle(node).userSelect,
    pointerEvents:getComputedStyle(node).pointerEvents,
  }));
  expect(source.draggable).toBe(false);
  expect(source.userSelect).toBe('auto');
  expect(source.pointerEvents).toBe('auto');
  const png = Buffer.from(source.src.split(',')[1]!,'base64');
  const {data,info:dimensions} = await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  expect(dimensions.width).toBe(1080);
  expect(dimensions.height).toBe(490 + Math.round(1080*Math.min(viewport.height/viewport.width,1.25)));
  const qr = jsQR(new Uint8ClampedArray(data),dimensions.width,dimensions.height);
  expect(qr?.data).toBe('https://witlu.com/?year=230');
  if (process.env.R7_ACCEPTANCE === '1') {
    await page.screenshot({path:`${shots}/${info.project.name}-poster.png`,scale:'css'});
    await fs.writeFile(`${shots}/${info.project.name}-poster-export.png`,png);
  }
  await dialog.getByRole('button',{name:'复制链接'}).click();
  await expect(dialog.getByRole('textbox',{name:'长按链接选择复制'})).toHaveValue('https://witlu.com/?year=230');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('R7 perspective experiment still exports the matching north-up fallback', async ({page},info) => {
  test.skip(info.project.name !== 'desktop','One static poster path serves all viewports');
  await page.goto('/?year=589&terrain=1');
  await expect(terrain(page)).toHaveAttribute('data-projection','perspective');
  const {image} = await showPoster(page,false);
  expect(await image.evaluate(img=>(img as HTMLImageElement).naturalHeight)).toBe(1210);
  const png = Buffer.from((await image.getAttribute('src'))!.split(',')[1]!,'base64');
  const {data,info:dimensions} = await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const qr = jsQR(new Uint8ClampedArray(data),dimensions.width,dimensions.height);
  expect(new URL(qr!.data).searchParams.get('year')).toBe('589');
});

test.use({video:process.env.R7_ACCEPTANCE==='1'?'on':'off'});
test('R7 mobile sheet, overview and lanes stay usable with a shrunken visual viewport', async ({page},info) => {
  test.skip(info.project.name === 'desktop','Mobile drawer and visual viewport simulation');
  test.setTimeout(100000);
  await page.goto('/?year=230');
  await mapReady(page);
  await page.evaluate(() => {
    const style = document.documentElement.style;
    style.setProperty('--space-safe-top','47px');
    style.setProperty('--space-safe-bottom','34px');
    style.setProperty('--space-safe-left','15px');
    style.setProperty('--space-safe-right','15px');
    visualViewport?.dispatchEvent(new Event('resize'));
  });
  const sheet = page.locator('.chapter-sheet'), dock = page.getByRole('region',{name:'历史时间轴'});
  const toggle = page.locator('.sheet-toggle');
  const heading = page.locator('.sheet-heading');
  const panorama = page.getByRole('slider',{name:/年份滑块/});
  await expect(sheet).toHaveAttribute('data-snap','0');
  await expect(panorama.locator('.dynasty-band')).toHaveCount(18);
  await expect(page.getByRole('region',{name:'政权事件泳道'})).toContainText('曹魏');
  await expect.poll(async () => {
    const box = (await dock.boundingBox())!;
    return box.y+box.height;
  }).toBeLessThanOrEqual(page.viewportSize()!.height-34);
  await toggle.tap();
  await expect(sheet).toHaveAttribute('data-snap','1');
  await expect(page.getByRole('heading',{name:'此刻天下'})).toBeInViewport();
  await toggle.tap();
  await expect(sheet).toHaveAttribute('data-snap','2');
  await expect.poll(async () => Math.abs((await sheet.boundingBox())!.y-107)).toBeLessThan(1);
  const initial = (await heading.boundingBox())!.y;
  await page.locator('.sheet-content').evaluate(node => { node.scrollTop=node.scrollHeight; });
  await expect(page.getByRole('heading',{name:'本朝大事'})).toBeVisible();
  expect((await heading.boundingBox())!.y).toBeCloseTo(initial,0);
  await toggle.tap();
  await expect(sheet).toHaveAttribute('data-snap','0');
  await page.locator('.timeline-lane[data-polity="sunwu"] .lane-tick[data-year="229"]').tap();
  await expect(yearField(page)).toHaveValue('229');
  await panorama.focus();
  await panorama.press('Shift+ArrowRight');
  await expect(yearField(page)).toHaveValue('230');
  const overview = (await panorama.boundingBox())!;
  await panorama.tap({position:{x:overview.width*.52,y:overview.height/2}});
  await expect.poll(async () => Number(await yearField(page).inputValue())).toBeGreaterThan(500);

  const search = page.getByRole('button',{name:'搜索',exact:true});
  await search.tap();
  const dialog = page.getByRole('dialog',{name:'万能搜索'});
  const input = dialog.getByRole('searchbox',{name:'搜索历史'});
  await expect(input).toBeFocused();
  await page.evaluate(() => {
    const viewport = visualViewport!;
    Object.defineProperty(viewport,'height',{configurable:true,value:350});
    viewport.dispatchEvent(new Event('resize'));
  });
  await expect.poll(() => page.locator('.atlas-app').evaluate(el => el.getBoundingClientRect().height)).toBe(350);
  const field = (await input.boundingBox())!, searchBounds = (await dialog.boundingBox())!;
  expect(field.x).toBeGreaterThanOrEqual(15);
  expect(field.y).toBeGreaterThanOrEqual(47);
  expect(field.y+field.height).toBeLessThan(350-34);
  expect(searchBounds.y+searchBounds.height).toBeLessThanOrEqual(350-34);
  expect(await input.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
  await input.fill('贞观三年');
  await expect(dialog.getByRole('option').first()).toContainText('629');
  await input.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(yearField(page)).toHaveValue('629');
  await expect(search).toBeFocused();
  await page.evaluate(() => {
    const viewport = visualViewport!;
    Reflect.deleteProperty(viewport,'height');
    viewport.dispatchEvent(new Event('resize'));
  });
  await expect.poll(() => page.locator('.atlas-app').evaluate(el => el.getBoundingClientRect().height)).toBe(page.viewportSize()!.height);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  if (process.env.R7_ACCEPTANCE === '1') {
    const video = page.video();
    await page.close();
    await fs.mkdir(videos,{recursive:true});
    await video?.saveAs(`${videos}/${info.project.name}-mobile.webm`);
  }
});
