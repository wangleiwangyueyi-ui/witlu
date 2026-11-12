import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
test('records bounded shell regression frame samples', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One performance sample per run');
  await page.goto('/?debug=1&lang=en'); await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('data-status')).toHaveText('Complete source data loaded');
  const sample = () => page.evaluate(() => new Promise<{ quality: string; samples: number; meanFrameMs: number; p95FrameMs: number; meanFps: number; usedJSHeapBytes: number | null }>(resolve => {
    const values: number[] = []; let previous = 0, frame = 0;
    const tick = (now: number) => { if (previous) values.push(now - previous); previous = now; frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    setTimeout(() => { cancelAnimationFrame(frame); values.sort((a, b) => a - b); const mean = values.reduce((n, v) => n + v, 0) / values.length; resolve({ quality: document.querySelector<HTMLElement>('.atlas-app')!.dataset.quality!, samples: values.length, meanFrameMs: mean, p95FrameMs: values[Math.floor(values.length * .95)]!, meanFps: 1000 / mean, usedJSHeapBytes: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? null }); }, 2000);
  }));
  await page.getByRole('tab', { name: 'High', exact: true }).click(); const high = await sample();
  await page.getByRole('tab', { name: 'Eco', exact: true }).click(); const eco = await sample();
  expect(high.samples).toBeGreaterThan(5); expect(eco.samples).toBeGreaterThan(5);
  await fs.mkdir('docs/progress/performance/P4/regression', { recursive: true });
  await fs.writeFile('docs/progress/performance/P4/regression/shell-regression.json', JSON.stringify({ date: '2026-11-12', browser: 'Playwright Chromium, local Vite shell with P2 terrain, 1440×900; diagnostic only', high, eco }, null, 2) + '\n');
});
