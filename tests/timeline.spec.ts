import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const folder = 'docs/progress/screenshots/P5';
test('year input, ambiguity, BCE boundary and keyboard controls', async ({ page }) => {
    await page.goto('/lab/timeline');
    const input = page.locator('#history-year');
    await expect(page.locator('.era-tracks')).toContainText('魏明帝');
    for (const [text, year] of [['前221', '-221'], ['贞观三年', '629'], ['元狩二年', '-121'], ['-1', '-1']]) {
        await input.fill(text!);
        await input.press('Enter');
        if (text === '贞观三年')
            await page.getByRole('button', { name: '唐贞观3年 · 629', exact: true }).click();
        await expect(input).toHaveValue(year!);
    }
    await page.getByRole('button', { name: '下一年', exact: true }).click();
    await expect(input).toHaveValue('1');
    await page.getByRole('slider').focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expect(input).toHaveValue('11');
    await page.keyboard.press('ArrowLeft');
    await expect(input).toHaveValue('10');
    await input.fill('建兴三年');
    await input.press('Enter');
    await expect(page.getByRole('status')).toContainText('年号重名');
    expect(await page.locator('.year-results button').count()).toBeGreaterThan(1);
    await page.locator('.year-results button').first().click();
    await expect(page.locator('.year-results')).toHaveCount(0);
    await page.evaluate(async () => { const { seekIndex } = await import('/src/store/time.ts' as string); seekIndex(230.75); });
    await page.getByRole('button', { name: '下一年', exact: true }).click(); await expect(input).toHaveValue('231');
    await input.fill('0');
    await input.press('Enter');
    await expect(page.getByRole('status')).toContainText('未识别');
});
test('real tributaries and area ratios at four divided periods', async ({ page }, info) => {
    await page.goto('/lab/timeline');
    await fs.mkdir(folder, { recursive: true });
    for (const [title, names] of [['三国', ['曹魏', '蜀汉', '孙吴']], ['南北朝', ['北魏', '南齐']], ['五代十国', ['后唐', '吴越', '南汉']], ['宋辽金夏', ['南宋', '金', '西夏']]] as const) {
        await page.locator('.lab-presets').getByRole('button', { name: title, exact: true }).click();
        for (const name of names)
            await expect(page.locator('.river-legend')).toContainText(name);
        await page.screenshot({ path: `${folder}/${info.project.name}-${title}.png` });
    }
});
test('playback speed, pause, inertia, zoom reset and touch targets', async ({ page }, info) => {
    await page.goto('/lab/timeline');
    const river = page.locator('.history-river');
    await expect(river).toHaveAttribute('data-branches', /\d/);
    await page.getByRole('combobox', { name: '播放倍速' }).selectOption('4');
    await page.getByRole('button', { name: '播放', exact: true }).click();
    await expect.poll(async () => Number(await page.locator('#history-year').inputValue())).toBeGreaterThan(230);
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    await page.getByRole('button', { name: '播放', exact: true }).click();
    await page.locator('#history-year').focus();
    await expect(page.getByRole('button', { name: '播放', exact: true })).toBeVisible();
    const year = await page.locator('#history-year').inputValue();
    await page.waitForTimeout(200);
    await expect(page.locator('#history-year')).toHaveValue(year);
    const original = await page.locator('.river-years').textContent();
    await page.getByRole('button', { name: '缩小时间范围' }).click();
    await expect(page.locator('.river-years')).not.toHaveText(original!);
    await river.dblclick();
    const b = (await river.boundingBox())!;
    await page.mouse.move(b.x + b.width * .3, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * .7, b.y + b.height / 2, { steps: 20 });
    await page.mouse.up();
    const atRelease = Number(await river.getAttribute('aria-valuenow'));
    await page.waitForTimeout(350);
    expect(Number(await river.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(atRelease);
    const targets = await page.locator('.time-controls button,.time-controls input,.time-controls select,.river-zoom button,.history-river').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { label: n.getAttribute('aria-label'), width: r.width, height: r.height }; }));
    for (const target of targets) {
        expect(target.width, target.label ?? '').toBeGreaterThanOrEqual(44);
        expect(target.height, target.label ?? '').toBeGreaterThanOrEqual(44);
    }
    await fs.mkdir('docs/progress/performance/P5', { recursive: true });
    await fs.writeFile(`docs/progress/performance/P5/${info.project.name}-targets.json`, JSON.stringify(targets, null, 2));
});
test('two-finger zoom and reduced motion switches', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', 'Touch gestures on phone viewports');
    await page.goto('/lab/timeline');
    const river = page.locator('.history-river');
    await expect(river).toHaveAttribute('data-branches', /\d/);
    const b = (await river.boundingBox())!, cdp = await page.context().newCDPSession(page);
    const before = await page.locator('.river-years').textContent();
    const originalYear = await page.locator('#history-year').inputValue();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.width * .4, y: b.y + 20, id: 1 }, { x: b.x + b.width * .6, y: b.y + 20, id: 2 }] });
    for (let i = 1; i <= 8; i++)
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x + b.width * (.4 - i * .02), y: b.y + 20, id: 1 }, { x: b.x + b.width * (.6 + i * .02), y: b.y + 20, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('.river-years')).not.toHaveText(before!);
    await expect(page.locator('#history-year')).toHaveValue(originalYear);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('switch', { name: /河面光点/ }).click();
    await expect(page.getByRole('switch', { name: /河面光点/ })).toHaveAttribute('aria-checked', 'false');
});
test('Android dynasty boundary haptic respects the independent switch', async ({ page }, info) => {
    test.skip(info.project.name !== 'Pixel-7', 'Android capability check');
    await page.addInitScript(() => { const pulses: number[] = []; Object.defineProperty(navigator, 'vibrate', { value: (ms: number) => { pulses.push(ms); document.documentElement.dataset.pulses = JSON.stringify(pulses); return true; } }); });
    await page.goto('/lab/timeline');
    await expect(page.locator('.era-tracks')).toContainText('魏明帝');
    await page.locator('#history-year').fill('219');
    await page.locator('#history-year').press('Enter');
    await page.getByRole('button', { name: '下一年', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-pulses', '[12,12]');
    await page.getByRole('switch', { name: /边界轻触/ }).click();
    await page.getByRole('button', { name: '上一年', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-pulses', '[12,12]');
});
test('main continuous timeline drives the engine and cloud passage', async ({ page }, info) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/?year=230');
    await expect.poll(async () => page.evaluate(async () => { const { terrainBridge } = await import('/src/state/terrain.ts' as string); return terrainBridge.engine?.morph.stats().ready; }), { timeout: 45000 }).toBe(true);
    const finalProgress = await page.evaluate(async () => {
        const { seekIndex } = await import('/src/store/time.ts' as string);
        const phases = await (await fetch('/data/phases.json')).json() as { from: number; to: number }[];
        const phase = [...phases].reverse().find(p => p.from <= 230.875)!;
        seekIndex(230.125, 'drag', 0); seekIndex(230.875, 'drag', 0);
        return (230.875 - phase.from) / (phase.to - phase.from);
    });
    await expect.poll(async () => page.evaluate(async () => { const { terrainBridge } = await import('/src/state/terrain.ts' as string); return terrainBridge.engine?.morph.stats().t; })).toBeCloseTo(finalProgress, 5);
    if (info.project.name !== 'desktop') {
        await page.getByRole('slider', { name: '收起 / 半开 / 全开' }).focus();
        await page.keyboard.press('End');
    }
    await page.locator('#history-year').fill('1127');
    await page.locator('#history-year').press('Enter');
    await expect(page.locator('#history-year')).toHaveValue('1127');
    await expect.poll(async () => page.evaluate(async () => { const { terrainBridge } = await import('/src/state/terrain.ts' as string); return terrainBridge.engine?.camera.pose.distance ?? 0; })).toBeGreaterThan(7000);
    await expect.poll(async () => page.evaluate(async () => { const { terrainBridge } = await import('/src/state/terrain.ts' as string); return terrainBridge.engine?.morph.stats().snapshotA; }), { timeout: 45000 }).toMatch(/s_nansong/);
    await page.waitForTimeout(1800);
    await fs.mkdir(folder, { recursive: true });
    await page.screenshot({ path: `${folder}/${info.project.name}-main.png` });
    expect(errors).toEqual([]);
});
