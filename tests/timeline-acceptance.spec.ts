import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import type { EngineStats } from '../packages/engine/Renderer';
test('P5 recorded river interactions and frame samples', async ({ browser }, info) => {
    test.skip(process.env.TIMELINE_ACCEPTANCE !== '1', 'Run pnpm test:timeline to record serial GPU measurements');
    test.setTimeout(150000);
    const name = info.project.name, folder = 'docs/progress/screenshots/P5', videos = 'docs/progress/videos/P5';
    await fs.mkdir(folder, { recursive: true });
    await fs.mkdir(videos, { recursive: true });
    await fs.mkdir('docs/progress/performance/P5', { recursive: true });
    const options = info.project.use;
    const context = await browser.newContext({ viewport: options.viewport ?? { width: 1440, height: 900 }, deviceScaleFactor: options.deviceScaleFactor ?? 1, isMobile: options.isMobile ?? false, hasTouch: options.hasTouch ?? false, recordVideo: { dir: '.cache/P5-video', size: options.viewport! } });
    const page = await context.newPage(), video = page.video()!, errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
        await page.goto('http://127.0.0.1:4173/?year=230');
        const stats = async () => JSON.parse((await page.getByTestId('terrain').getAttribute('data-stats')) ?? '{}') as EngineStats;
        await expect.poll(async () => (await stats()).morph?.ready, { timeout: 45000 }).toBe(true);
        await page.waitForTimeout(4000);
        await page.screenshot({ path: `${folder}/${name}-overview.png` });
        if (name !== 'desktop') {
            await page.getByRole('slider', { name: '收起 / 半开 / 全开' }).focus();
            await page.keyboard.press('Home');
            await page.waitForTimeout(500);
            await page.screenshot({ path: `${folder}/${name}-collapsed.png` });
            await page.keyboard.press('End');
            await page.waitForTimeout(500);
        }
        await page.evaluate(async () => { const { setTimeView } = await import('/src/store/time.ts' as string); setTimeView(220, 240); });
        const river = page.locator('.history-river'), box = (await river.boundingBox())!, samples: EngineStats[] = [];
        for (let round = 0; round < 2; round++) {
            const direction = round ? -1 : 1;
            await page.mouse.move(box.x + box.width * (direction > 0 ? .1 : .9), box.y + box.height / 2);
            await page.mouse.down();
            for (let i = 0; i <= 30; i++) {
                await page.mouse.move(box.x + box.width * (direction > 0 ? .1 + .8 * i / 30 : .9 - .8 * i / 30), box.y + box.height / 2);
                await page.waitForTimeout(100);
                if (i % 5 === 0)
                    samples.push(await stats());
            }
            await page.mouse.up();
            await page.waitForTimeout(500);
        }
        await page.screenshot({ path: `${folder}/${name}-drag.png` });
        await page.locator('#history-year').fill('唐贞观三年');
        await page.locator('#history-year').press('Enter');
        await expect(page.locator('#history-year')).toHaveValue('629');
        await page.waitForTimeout(450);
        await page.screenshot({ path: `${folder}/${name}-cloud-passage.png` });
        await page.waitForTimeout(2300);
        await page.goto('http://127.0.0.1:4173/lab/timeline');
        for (const title of ['三国', '南北朝', '五代十国', '宋辽金夏']) {
            await page.locator('.lab-presets').getByRole('button', { name: title, exact: true }).click();
            await page.waitForTimeout(300);
            await page.screenshot({ path: `${folder}/${name}-${title}.png` });
            const r = (await page.locator('.history-river').boundingBox())!;
            await page.mouse.move(r.x + r.width * .15, r.y + r.height / 2);
            await page.mouse.down();
            for (let i = 0; i <= 25; i++) {
                await page.mouse.move(r.x + r.width * (.15 + .7 * i / 25), r.y + r.height / 2);
                await page.waitForTimeout(50);
            }
            await page.mouse.up();
            await page.waitForTimeout(500);
        }
        await page.goto('http://127.0.0.1:4173/lab/time-flight');
        await expect.poll(async () => (await stats()).morph?.ready, { timeout: 45000 }).toBe(true);
        await page.getByRole('button', { name: '贞观 · 629', exact: true }).click();
        await expect.poll(async () => (await stats()).pose?.distance ?? 0).toBeGreaterThan(7000);
        await page.screenshot({ path: `${folder}/${name}-flight-lab.png` });
        await expect.poll(async () => (await stats()).morph?.snapshotA, { timeout: 45000 }).toMatch(/s_tang/);
        expect(errors).toEqual([]);
        const fps = samples.map(s => s.fps), mean = fps.reduce((s, n) => s + n, 0) / fps.length;
        await fs.writeFile(`docs/progress/performance/P5/${name}.json`, JSON.stringify({ viewport: options.viewport, deviceScaleFactor: options.deviceScaleFactor ?? 1, note: 'Chromium D3D11 desktop GPU; phone viewport emulation, not physical phone measurements.', meanFps: mean, minFps: Math.min(...fps), maxFrameMs: Math.max(...samples.map(s => s.frameMs)), errors, samples }, null, 2));
    }
    finally {
        await context.close();
        await video.saveAs(`${videos}/${name}-river-drag.webm`);
    }
});
