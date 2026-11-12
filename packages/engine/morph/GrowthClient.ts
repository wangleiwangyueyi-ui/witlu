import type { GrowthInput, GrowthResult } from '@witlu/core/morph';
import type { PlatformAdapter, WorkerPort } from '../platform/PlatformAdapter';
export interface GrowthReply {
    request: number;
    result?: GrowthResult;
    miss?: boolean;
    warm?: boolean;
    hit: boolean;
    ms: number;
    cacheBytes: number;
    error?: string;
}
export class GrowthClient {
    private worker: WorkerPort;
    private serial = 0;
    private disposed=false;
    private pending = new Map<number, {
        resolve: (v: GrowthReply) => void;
        reject: (e: Error) => void;
    }>();
    constructor(platform: PlatformAdapter) { this.worker = platform.createWorker('growth'); this.worker.onMessage(value => { const reply = value as GrowthReply, p = this.pending.get(reply.request); if (p) {
        this.pending.delete(reply.request);
        if (reply.error)
            p.reject(new Error(reply.error));
        else
            p.resolve(reply);
    } }); this.worker.onError(message => { this.pending.forEach(p => p.reject(new Error(message))); this.pending.clear(); }); }
    request(key: string, input?: GrowthInput, warm = false) { if(this.disposed)return Promise.reject(new Error('Growth worker disposed'));const request = ++this.serial; return new Promise<GrowthReply>((resolve, reject) => { this.pending.set(request, { resolve, reject }); this.worker.post({ request, key, input, warm }, input ? [input.a.buffer as ArrayBuffer, input.b.buffer as ArrayBuffer] : []); }); }
    dispose() { this.disposed=true;this.worker.terminate(); this.pending.forEach(p => p.reject(new Error('Growth worker disposed'))); this.pending.clear(); }
}
