import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
test('records terrain pan zoom rotate tilt and reset', async ({ browser }, info) => {
  test.setTimeout(60000);
  const profile = info.project.use, viewport = profile.viewport ?? { width: 1440, height: 900 };
  const context = await browser.newContext({ viewport, baseURL: 'http://127.0.0.1:4173', deviceScaleFactor: profile.deviceScaleFactor ?? 1, isMobile: profile.isMobile ?? false, hasTouch: profile.hasTouch ?? false, ...(profile.userAgent ? { userAgent: profile.userAgent } : {}), recordVideo: { dir: 'test-results/videos', size: viewport } });
  const page = await context.newPage(), video = page.video()!;
  try {
    await page.goto('/'); await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    await expect.poll(async () => JSON.parse((await page.getByTestId('terrain').getAttribute('data-stats'))!).loading).toBe(0);
    const x = viewport.width * .5, y = viewport.height * .32;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 65, y + 25, { steps: 36 }); await page.mouse.up();
    await page.mouse.wheel(0, -450); await page.waitForTimeout(1300);
    if (profile.hasTouch) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: 240, id: 1 }, { x: 220, y: 240, id: 2 }] });
      for (let i = 1; i <= 20; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 120 - i, y: 240 + i, id: 1 }, { x: 220 + i, y: 240 + i * 2, id: 2 }] }); await page.waitForTimeout(20); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.keyboard.down('Shift'); await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 100, y + 60, { steps: 36 }); await page.mouse.up(); await page.keyboard.up('Shift');
    }
    await page.waitForTimeout(1000); await page.getByRole('button', { name: '复位 / 指北', exact: true }).click(); await page.waitForTimeout(1400);
  } finally { await context.close(); }
  await fs.mkdir('docs/progress/recordings/P2', { recursive: true }); await video.saveAs(`docs/progress/recordings/P2/${info.project.name}-terrain.webm`);
});
