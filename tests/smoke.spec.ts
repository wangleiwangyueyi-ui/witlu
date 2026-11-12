import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
test('loads complete data, credits, and the responsive atlas shell', async ({ page, request }, info) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const response = await request.get('/data/manifest.json');
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json() as { upstreamCommit: string; counts: Record<string, number> };
  await page.goto('/');
  await expect(page.getByTestId('data-status')).toHaveText('全量史料已载入');
  await expect(page.getByRole('heading', { name: '三国', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '更多', exact: true }).click();
  await page.getByRole('button', { name: /关于与致谢/ }).click();
  await expect(page.getByText(/不代表正统评价/)).toBeVisible();
  await expect(page.getByRole('dialog', { name: '关于与致谢' })).toContainText('CHGIS, Version: 6.');
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.map-scene').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const snapshots = await (await request.get('/data/snapshots.json')).json() as { key: string; file: string; counts: Record<string, number> }[];
  for (const key of ['s_sanguo', 's_prc']) {
    const entry = snapshots.find(s => s.key === key)!;
    const geo = await (await request.get(`/data/${entry.file}`)).json() as { features: { properties: { layer: string } }[] };
    for (const [layer, count] of Object.entries(entry.counts)) expect(geo.features.filter(f => f.properties.layer === layer)).toHaveLength(count);
    if (key === 's_sanguo') expect(geo.features.some(f => f.properties.layer === 'polity')).toBeTruthy();
  }
  // Upstream s_prc is an empty snapshot; modern geography is a separate layer.
  const modern = await (await request.get('/data/modern-provinces.geojson')).json() as { features: unknown[] };
  expect(modern.features).toHaveLength(manifest.counts['现代省界']!);
  const events = await (await request.get('/data/events.json')).json() as { id: string; title: string; mood: string; regime: string | null; regimeMethod: string }[];
  expect(events.find(e => e.id === 'milestones:prc:0')).toMatchObject({ regimeMethod: 'modern-province-point-in-polygon' });
  expect(events.find(e => e.id === 'milestones:prc:0')?.regime).toBeTruthy();
  const sensitive = events.filter(e => e.title?.includes('九一八事变'));
  expect(sensitive.length).toBeGreaterThan(0);
  expect(sensitive.every(e => e.mood === 'solemn')).toBeTruthy();
  expect(errors).toEqual([]);
  await page.evaluate(() => document.fonts.ready);
  if (info.project.name !== 'desktop') await expect.poll(async () => Math.abs((await page.locator('.chapter-sheet').boundingBox())!.y - page.viewportSize()!.height * .52)).toBeLessThan(2);
  await fs.mkdir('docs/progress/screenshots/P4/regression/p1', { recursive: true });
  await page.screenshot({ path: `docs/progress/screenshots/P4/regression/p1/${info.project.name}.png` });
});
