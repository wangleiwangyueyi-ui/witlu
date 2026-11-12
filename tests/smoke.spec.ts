import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
test('loads complete data, credits, and a responsive P0 shell', async ({ page, request }, info) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const response = await request.get('/data/manifest.json');
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json() as { upstreamCommit: string; counts: Record<string, number> };
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('全部图层与史料已导入');
  await expect(page.locator('.metric')).toHaveCount(Object.keys(manifest.counts).length);
  await page.getByText('关于与数据出处', { exact: true }).click();
  await expect(page.getByText(/不代表正统评价/)).toBeVisible();
  await expect(page.locator('footer')).toContainText('CHGIS, Version: 6.');
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
  await fs.mkdir('docs/progress/screenshots/P0', { recursive: true });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: `docs/progress/screenshots/P0/${info.project.name}.png` });
});
