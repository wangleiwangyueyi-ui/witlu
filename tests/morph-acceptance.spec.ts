import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import type { EngineStats } from '../packages/engine/Renderer';
const cases = [
    ['b a-shu', 's_zhanguo_a2', 's_zhanguo_b0'],
    ['qin-conquests', 's_zhanguo_d', 's_qin_a'],
    ['qin-chuhan', 's_qin', 's_qin_chuhan'],
    ['han-three-kingdoms', 's_donghan_f', 's_sanguo_a'],
    ['jin-sixteen-states', 's_xijin_b', 's_dongjin_317'],
    ['nanbei-sui', 's_nanbei_f', 's_sui'],
    ['tang-anxi', 's_tang_a2', 's_tang_a2b'],
    ['song-south', 's_beisong_d', 's_nansong_a0'],
    ['ming-qing', 's_ming_c2', 's_qing_a00'],
    ['1945-1946', 's_roc_c', 's_roc_d']
].map(([name, a, b]) => ({ name: name!.replace(' ', ''), a: a!, b: b! }));
for (const [index, c] of cases.entries())
    test(`P4 acceptance ${c.name}`, async ({ browser }, info) => {
        test.skip(!process.env.P4_ACCEPTANCE, 'Run pnpm test:morph in isolation');
        const profile = info.project.use, viewport = profile.viewport ?? { width: 1440, height: 900 }, stem = `${info.project.name}-${c.name}`;
        const context = await browser.newContext({ viewport, baseURL: 'http://127.0.0.1:4173', deviceScaleFactor: profile.deviceScaleFactor ?? 1, isMobile: profile.isMobile ?? false, hasTouch: profile.hasTouch ?? false, ...(profile.userAgent ? { userAgent: profile.userAgent } : {}), recordVideo: { dir: 'test-results/videos', size: viewport } });
        const page = await context.newPage(), video = page.video()!, errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', e => { if (e.type() === 'error')
            errors.push(e.text()); });
        for (const kind of ['recordings', 'screenshots', 'performance'])
            await fs.mkdir(`docs/progress/${kind}/P4`, { recursive: true });
        const stats = async () => JSON.parse((await page.getByTestId('terrain').getAttribute('data-stats'))!) as EngineStats;
        try {
            await page.goto(`/lab/morph?case=${index}`);
            await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
            await expect.poll(async () => (await stats()).morph.ready, { timeout: 60000 }).toBe(true);
            await expect.poll(async () => (await stats()).loading, { timeout: 30000 }).toBe(0);
            const initial = await stats();
            expect(initial.morph.snapshotA).toBe(c.a);
            expect(initial.morph.snapshotB).toBe(c.b);
            expect(initial.morph.error).toBeNull();
            const environment = await page.evaluate(() => { const gl = document.querySelector('canvas')!.getContext('webgl2')!, ext = gl.getExtension('WEBGL_debug_renderer_info'); return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string : gl.getParameter(gl.RENDERER) as string, userAgent: navigator.userAgent, dpr: devicePixelRatio }; });
            // Hold a true intermediate state, then compare categorical GPU ownership to
            // the CPU oracle and the same instant traversed in reverse canonical order.
            const proof = await page.evaluate(async ({ a, b }) => {
                const { terrainBridge } = await import('/src/state/terrain.ts' as string);
                const m = terrainBridge.engine!.morph;
                const frame = () => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
                const result = [];
                for (const t of [0, .25, .5, .75, 1]) {
                    m.setProgress(t, 'seek');
                    await frame();
                    result.push(await m.audit());
                }
                await m.prepare(b, a);
                m.setProgress(.5, 'seek');
                await frame();
                const reverse = await m.audit();
                await m.prepare(a, b);
                m.setProgress(.5, 'seek');
                await frame();
                return { forward: result, reverse };
            }, c);
            await page.screenshot({ path: `docs/progress/screenshots/P5/regression/p4/${stem}-mid.png` });
            for (const sample of [...proof.forward, proof.reverse]) {
                expect(sample.gaps).toBe(0);
                expect(sample.invalid).toBe(0);
                expect(sample.mismatches).toBe(0);
            }
            expect(proof.reverse.hash).toBe(proof.forward[2]!.hash);
            // Six complete 1200 ms traversals, with the production environment and
            // prefetch enabled. No screenshot/readback occurs inside this frame sample.
            const performance = await page.evaluate(async () => {
                const { terrainBridge } = await import('/src/state/terrain.ts' as string);
                const e = terrainBridge.engine!;
                return new Promise<{
                    meanFps: number;
                    p95FrameMs: number;
                    elapsedMs: number;
                    frames: number;
                    frameTimes: number[];
                    qualities: string[];
                    drawCalls: number;
                }>(resolve => {
                    const values: number[] = [], qualities = new Set<string>();
                    let previous = 0, segment = 0, drawCalls = 0;
                    const start = window.performance.now();
                    e.morph.playPrepared(false, 1200);
                    const tick = (now: number) => {
                        if (previous)
                            values.push(now - previous);
                        previous = now;
                        qualities.add(e.quality.level);
                        drawCalls = Math.max(drawCalls, e.renderer.info.render.calls);
                        const next = Math.floor((now - start) / 1350);
                        if (next > segment && next < 6) {
                            segment = next;
                            e.morph.playPrepared(segment % 2 === 1, 1200);
                        }
                        if (now - start < 8100)
                            requestAnimationFrame(tick);
                        else {
                            const sorted = [...values].sort((a, b) => a - b);
                            resolve({ meanFps: 1000 / (values.reduce((a, b) => a + b, 0) / values.length), p95FrameMs: sorted[Math.floor(sorted.length * .95)]!, elapsedMs: now - start, frames: values.length, frameTimes: values, qualities: [...qualities], drawCalls });
                        }
                    };
                    requestAnimationFrame(tick);
                });
            });
            const result = { case: c, viewport: info.project.name, browserVersion: browser.version(), environment, preparation: initial.morph, proof, performance, errors };
            await fs.writeFile(`docs/progress/performance/P5/regression/p4/${stem}.json`, JSON.stringify(result, null, 2) + '\n');
            console.log(JSON.stringify({ case: stem, preparationMs: initial.morph.preparationMs, fps: performance.meanFps, p95: performance.p95FrameMs, proof: proof.reverse.hash }));
            expect(performance.drawCalls).toBeLessThanOrEqual(250);
            expect(errors).toEqual([]);
        }
        finally {
            await context.close();
            await video.saveAs(`docs/progress/recordings/P5/regression/p4/${stem}.webm`);
        }
    });
