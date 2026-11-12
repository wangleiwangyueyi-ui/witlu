import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { test, expect } from '@playwright/test';
import type { EngineStats } from '../packages/engine/Renderer';

test('P2 drag and zoom sustain at least 50 fps', async ({ page, browser }, info) => {
  test.skip(!process.env.P2_PERFORMANCE, 'Run pnpm test:performance in isolation');
  test.setTimeout(90_000);
  await page.addInitScript(() => localStorage.setItem('witlu-ui', JSON.stringify({ quality: 'high' })));
  await page.goto('/?debug=1&lang=en');
  await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  await expect.poll(async () => JSON.parse((await page.getByTestId('terrain').getAttribute('data-stats'))!).loading, { timeout: 15000 }).toBe(0);
  // Let shader compilation, initial LOD and UI entry animations settle.
  await page.waitForTimeout(1500);
  const environment = await page.evaluate(() => {
    const gl = document.querySelector('canvas')!.getContext('webgl2')!, debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { userAgent: navigator.userAgent, renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) as string : gl.getParameter(gl.RENDERER) as string, vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) as string : '', cores: navigator.hardwareConcurrency, dpr: devicePixelRatio };
  });
  console.log(info.project.name, environment);
  const cdp = await page.context().newCDPSession(page); await cdp.send('Performance.enable');
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,blink.user_timing,toplevel', transferMode: 'ReturnAsStream' });
  const beforeMetrics = await cdp.send('Performance.getMetrics');
  await page.evaluate(() => {
    const root = globalThis as typeof globalThis & { p2Sample?: { values: number[]; stats: unknown[]; frame: number; start: number; end: number } };
    const sample = { values: [] as number[], stats: [] as unknown[], frame: 0, start: performance.now(), end: 0 }; root.p2Sample = sample; let previous = sample.start, lastStats = 0;
    const tick = (now: number) => { sample.values.push(now - previous); previous = now; if (now - lastStats > 500) { sample.stats.push(JSON.parse(document.querySelector<HTMLCanvasElement>('canvas')!.dataset.stats!)); lastStats = now; } sample.frame = requestAnimationFrame(tick); }; sample.frame = requestAnimationFrame(tick);
  });
  // Keep the starting point outside the debug panel on narrow screens. Pointer
  // capture then keeps drags on terrain even when the path crosses the panel.
  const viewport = page.viewportSize()!, x = viewport.width * (viewport.width < 768 ? .9 : .55), y = viewport.height * .32;
  for (let round = 0; round < 3; round++) {
    await page.mouse.move(x, y); await page.mouse.down();
    for (let step = 1; step <= 20; step++) { await page.mouse.move(x - Math.sin(step / 20 * Math.PI) * 55, y + step * .65); await page.waitForTimeout(20); }
    await page.mouse.up(); await page.mouse.move(x, y);
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, { x, y })).toBe('CANVAS');
    await page.mouse.wheel(0, -140); await page.waitForTimeout(350); await page.mouse.wheel(0, 140); await page.waitForTimeout(350);
  }
  const sample = await page.evaluate(() => {
    const root = globalThis as typeof globalThis & { p2Sample: { values: number[]; stats: unknown[]; frame: number; start: number; end: number } }; const s = root.p2Sample; cancelAnimationFrame(s.frame); s.end = performance.now();
    const values = s.values.slice(1), sorted = [...values].sort((a, b) => a - b), mean = values.reduce((a, b) => a + b, 0) / values.length;
    return { frames: values.length, elapsedMs: s.end - s.start, meanFrameMs: mean, meanFps: 1000 / mean, p95FrameMs: sorted[Math.floor(sorted.length * .95)]!, longestFrameMs: sorted.at(-1)!, over22ms: values.filter(v => v > 22).length, frameTimes: values, stats: s.stats, heapBytes: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? null };
  });
  const afterMetrics = await cdp.send('Performance.getMetrics');
  const completed = new Promise<{ stream: string }>((resolve, reject) => cdp.once('Tracing.tracingComplete', payload => { if (payload.stream) resolve({ stream: payload.stream }); else reject(new Error('Missing CDP trace stream')); }));
  await cdp.send('Tracing.end'); const { stream } = await completed; const trace: Buffer[] = [];
  for (;;) { const part = await cdp.send('IO.read', { handle: stream }); trace.push(Buffer.from(part.data, part.base64Encoded ? 'base64' : 'utf8')); if (part.eof) break; }
  await cdp.send('IO.close', { handle: stream });
  const result = { viewport: info.project.name, browserVersion: browser.version(), environment, ...sample, stats: sample.stats as EngineStats[], cdpBefore: beforeMetrics.metrics, cdpAfter: afterMetrics.metrics };
  await fs.mkdir('docs/progress/performance/P2', { recursive: true });
  await fs.writeFile(`docs/progress/performance/P2/${info.project.name}.trace.json.gz`, gzipSync(Buffer.concat(trace)));
  await fs.writeFile(`docs/progress/performance/P2/${info.project.name}.json`, JSON.stringify(result, null, 2) + '\n');
  await page.screenshot({ path: `docs/progress/performance/P2/${info.project.name}.png` });
  console.log(JSON.stringify({ device: info.project.name, fps: sample.meanFps, p95: sample.p95FrameMs, heap: sample.heapBytes, qualities: result.stats.map(s => s.quality) }));
  const longitudes = result.stats.map(s => s.pose.lon), distances = result.stats.map(s => s.pose.distance);
  expect(Math.max(...longitudes) - Math.min(...longitudes)).toBeGreaterThan(.2);
  expect(Math.max(...distances) - Math.min(...distances)).toBeGreaterThan(100);
  expect(sample.frames).toBeGreaterThan(100); expect(sample.meanFps).toBeGreaterThanOrEqual(50); expect(result.stats.every(s => s.drawCalls <= 250)).toBe(true);
});
