import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
test('exports the P2 measured Performance report', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop' || !process.env.P2_REPORT, 'After standalone benchmark and production build');
  await page.setViewportSize({ width: 1280, height: 1040 });
  await page.setContent(await fs.readFile('docs/progress/performance/P2/report.html', 'utf8'));
  await expect(page.locator('article')).toHaveCount(3);
  await page.screenshot({ path: 'docs/progress/performance/P2/report.png', fullPage: true });
});
