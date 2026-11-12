import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
test('glass button presses to 0.96 and springs back', async ({ browser }, info) => {
  const profile = info.project.use, viewport = profile.viewport ?? { width: 1440, height: 900 };
  const context = await browser.newContext({ viewport, baseURL: 'http://127.0.0.1:4173', deviceScaleFactor: profile.deviceScaleFactor ?? 1, isMobile: profile.isMobile ?? false, hasTouch: profile.hasTouch ?? false, ...(profile.userAgent ? { userAgent: profile.userAgent } : {}), recordVideo: { dir: 'test-results/videos', size: viewport } });
  const page = await context.newPage(), video = page.video()!;
  try {
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    const button = page.getByRole('button', { name: '分享', exact: true });
    await button.hover(); const original = (await button.boundingBox())!;
    await page.mouse.down();
    await expect.poll(async () => (await button.boundingBox())!.width / original.width).toBeLessThan(.98);
    await fs.mkdir('docs/progress/screenshots/P3/regression/p1', { recursive: true });
    await page.screenshot({ path: `docs/progress/screenshots/P3/regression/p1/${info.project.name}-pressed.png` });
    await page.mouse.move(5, 5); await page.mouse.up();
    await expect.poll(async () => Math.abs((await button.boundingBox())!.width - original.width)).toBeLessThan(.2);
  } finally { await context.close(); }
  await fs.mkdir('docs/progress/recordings/P3/regression/p1', { recursive: true });
  await video.saveAs(`docs/progress/recordings/P3/regression/p1/${info.project.name}-button-press.webm`);
});
