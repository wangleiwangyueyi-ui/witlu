/// <reference lib="webworker" />
import { buildGrowth, ByteLRU } from '@witlu/core/morph';
import type { GrowthInput, GrowthResult } from '@witlu/core/morph';
const worker = self as unknown as DedicatedWorkerGlobalScope, cache = new ByteLRU<GrowthResult>(96 * 1024 * 1024);
worker.onmessage = (event: MessageEvent<{
    request: number;
    key: string;
    input?: GrowthInput;
    warm?: boolean;
}>) => {
    const { request, key, input, warm } = event.data, start = performance.now();
    try {
        let result = cache.get(key);
        const hit = Boolean(result);
        if (!result) {
            if (!input) {
                worker.postMessage({ request, miss: true });
                return;
            }
            result = buildGrowth(input);
            cache.set(key, result, result.bytes);
        }
        if (warm) {
            worker.postMessage({ request, warm: true, hit, ms: performance.now() - start, cacheBytes: cache.bytes });
            return;
        }
        // Cached buffers stay owned by the worker; transfer independent copies.
        const fields = result.fields.slice(), particles = result.particles.slice();
        worker.postMessage({ request, result: { ...result, fields, particles }, hit, ms: performance.now() - start, cacheBytes: cache.bytes }, [fields.buffer, particles.buffer]);
    }
    catch (error) {
        worker.postMessage({ request, error: error instanceof Error ? error.message : String(error) });
    }
};
