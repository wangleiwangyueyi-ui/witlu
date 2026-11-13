import { Color, DataArrayTexture, DataTexture, FloatType, GLSL3, HalfFloatType, LinearFilter, Mesh, NoColorSpace, OrthographicCamera, PlaneGeometry, RGFormat, RGBAFormat, Scene, ShaderMaterial } from 'three';
import type { IUniform, WebGLRenderer, WebGLRenderTarget } from 'three';
import type { PlatformAdapter } from '../platform/PlatformAdapter';
import type { TerrainManager } from '../terrain/TerrainManager';
import type { Quality } from '../Quality';
import { ownerAt } from '@witlu/core/morph';
import type { GrowthResult, Seed } from '@witlu/core/morph';
import { GrowthClient } from './GrowthClient';
import { Rasterizer, renderTarget, territoryTransform, territoryUV } from './Rasterizer';
import { resolveFragment, resolveVertex } from './shaders';
import { Boundaries } from './Boundaries';
import { FrontParticles } from './FrontParticles';
import { DEFAULT_MORPH_EFFECTS, MORPH_QUALITY } from './types';
import type { Capital, ColorSnapshot, MorphEffects, PolityColor, PolityGeometry, Snapshot } from './types';
export interface MorphPalette {
    gold: string;
    white: string;
    cinnabar: string;
    dust: string;
}
export class Morph {
    readonly uniforms: Record<string, IUniform>;
    effects: MorphEffects = { ...DEFAULT_MORPH_EFFECTS };
    enabled = false;
    reducedMotion = false;
    fillOpacity = .4;
    snapshots: Snapshot[] = [];
    private colors: ColorSnapshot[] = [];
    private modernCapitals: Capital[] = [];
    private ids = new Map<string, number>();
    private client: GrowthClient | null = null;
    private raster: Rasterizer;
    private data = new Map<string, PolityGeometry>();
    private preparingTargets = new Set<WebGLRenderTarget>();
    private warmingTarget: WebGLRenderTarget | null = null;
    private targetCache = new Map<string, WebGLRenderTarget>();
    private preview = false;
    private rasterHits = 0;
    private labelCache = new Map<string, Uint16Array>();
    private initPromise: Promise<void> | null = null;
    private targetA: WebGLRenderTarget | null = null;
    private targetB: WebGLRenderTarget | null = null;
    private current: WebGLRenderTarget;
    private field: DataArrayTexture;
    private paletteTexture: DataTexture;
    private resolveScene = new Scene();
    private resolveCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    private resolveMesh: Mesh;
    private linesA: Boundaries | null = null;
    private linesB: Boundaries | null = null;
    private particles: FrontParticles | null = null;
    private generation = 0;
    private alive = true;
    private queue: Promise<void> = Promise.resolve();
    private result: GrowthResult | null = null;
    private initializeResolve = true;
    private canonicalA = '';
    private canonicalB = '';
    private flip = false;
    private dirty = false;
    private progress = 0;
    private previousProgress = 0;
    private flight: {
        start: number;
        from: number;
        to: number;
        duration: number;
    } | null = null;
    private lastDrag = 0;
    private crossfade = false;
    private effectUntil = 0;
    private trailAt = -Infinity;
    private trailSide = 0;
    private warmAt = Infinity;
    private warming = false;
    private prefetched = false;
    private ready = false;
    private preparing = false;
    private error: string | null = null;
    private preparationMs = 0;
    private workerMs = 0;
    private rasterMs = 0;
    private cacheHit = false;
    private cacheBytes = 0;
    private resolveMs = 0;
    private size: number;
    private labelsSize: number;
    constructor(private platform: PlatformAdapter, private renderer: WebGLRenderer, private terrain: TerrainManager, private scene: Scene, private palette: MorphPalette) {
        const mobile = platform.viewport().mobile;
        this.labelsSize = mobile ? 2048 : 4096;
        this.size = mobile ? 512 : 1024;
        this.raster = new Rasterizer(renderer);
        const empty = new Uint8Array([0, 0, 0, 0]);
        const dummy = new DataTexture(empty, 1, 1);
        dummy.needsUpdate = true;
        this.current = renderTarget(this.size);
        this.field = new DataArrayTexture(new Uint16Array(2), 1, 1, 1);
        this.field.format = RGFormat;
        this.field.type = HalfFloatType;
        this.field.needsUpdate = true;
        this.paletteTexture = new DataTexture(new Float32Array(1024 * 4 * 4), 1024, 4, RGBAFormat, FloatType);
        this.paletteTexture.needsUpdate = true;
        this.uniforms = { polityFocus: { value: 0 }, territoryEdges: { value: 0 }, territoryEnabled: { value: 0 }, polityA: { value: dummy }, polityB: { value: dummy }, polityCurrent: { value: this.current.texture }, polityPalette: { value: this.paletteTexture }, territoryBounds: { value: territoryTransform }, territoryProgress: { value: 0 }, territoryCrossfade: { value: 0 }, territoryOpacity: { value: .4 }, territoryFront: { value: 0 }, territoryInk: { value: 0 }, territoryGold: { value: new Color(palette.gold) }, particleEnabled: { value: 0 }, particleRatio: { value: 1 } };
        const material = new ShaderMaterial({ glslVersion: GLSL3, depthTest: false, depthWrite: false, uniforms: { fields: { value: this.field }, labelsA: { value: dummy }, labelsB: { value: dummy }, palette: { value: this.paletteTexture }, progress: { value: 0 }, count: { value: 0 }, ids: { value: new Float32Array(96) } }, vertexShader: resolveVertex, fragmentShader: resolveFragment });
        this.resolveMesh = new Mesh(new PlaneGeometry(2, 2), material);
        this.resolveScene.add(this.resolveMesh);
        // Dummy is no longer needed after the first pair, but retained for context reset.
        this.empty = dummy;
    }
    private empty: DataTexture;
    async init() { if (!this.initPromise)
        this.initPromise = (async () => { const [snapshots, colors, registry] = await Promise.all([this.platform.readJSON<Snapshot[]>('/data/snapshots.json'), this.platform.readJSON<ColorSnapshot[]>('/data/polity-colors.json'), this.platform.readJSON<{
                key: string;
                occurrences: {snapshot:string;capitals:Capital[]}[];
            }[]>('/data/polities.json')]); if (!this.alive)
            return; this.snapshots = snapshots; this.colors = colors; this.modernCapitals=registry.flatMap(p=>p.occurrences.filter(o=>o.snapshot==='s_prc').flatMap(o=>o.capitals)); registry.map(p => p.key).sort().forEach((key, i) => this.ids.set(key, i + 1)); if (registry.length >= 1024)
            throw new Error('Polity palette needs a larger ID table'); this.client = new GrowthClient(this.platform); })(); await this.initPromise; }
    focusPolity(key: string | null) { this.uniforms.polityFocus!.value = key ? this.ids.get(key) ?? 0 : 0; }
    private styles(key: string) { return this.colors.find(c => c.snapshot === key)?.colors ?? []; }
    private async geometry(key: string) { let data = this.data.get(key); if (!data) {
        data = await this.platform.readJSON<PolityGeometry>(`/data/territories/${key}.geojson`);
        if (key === 's_prc' && !data.features.length) {
            const modern = await this.platform.readJSON<PolityGeometry>('/data/modern-provinces.geojson'), style = this.styles(key)[0]!;
            data = { ...modern, features: modern.features.map(f => ({ ...f, properties: { ...f.properties, polityId: style.polityId, title: style.polityId, role: 'main', capitals: this.modernCapitals } })) };
        }
        this.data.set(key, data);
        while (this.data.size > 8)
            this.data.delete(this.data.keys().next().value!);
    } return data; }
    private active(key: string) { return new Set(this.styles(key).filter(c => c.role !== 'neighbor').map(c => this.ids.get(c.polityId)!)); }
    private seedList(data: PolityGeometry, size: number): Seed[] { const seeds: Seed[] = []; for (const f of data.features) {
        const capital = f.properties.capitals?.[0], id = this.ids.get(f.properties.polityId);
        if (capital && id) {
            const uv = territoryUV(...capital.coord);
            if (!seeds.some(s => s.id === id))
                seeds.push({ id, x: uv.x * size - .5, y: uv.y * size - .5, source: 'capital' });
        }
    } return seeds; }
    private async labels(key: string, target: WebGLRenderTarget) { const cacheKey = `${key}:${this.size}`; let labels = this.labelCache.get(cacheKey); if (!labels) {
        labels = await this.raster.labels(target, this.size, this.active(key));
        this.labelCache.set(cacheKey, labels);
        while (this.labelCache.size > 4)
            this.labelCache.delete(this.labelCache.keys().next().value!);
    } return labels; }
    private cachedTarget(key: string, data: PolityGeometry) {
        const cached = this.targetCache.get(key);
        if (cached) { this.rasterHits++; this.targetCache.delete(key); this.targetCache.set(key,cached); return cached; }
        const target = this.raster.rasterize(data,this.ids,this.labelsSize); this.targetCache.set(key,target); return target;
    }
    private trimTargets() { for (const [key,target] of this.targetCache) { if(this.targetCache.size<=3) break; if(target!==this.targetA&&target!==this.targetB&&target!==this.warmingTarget&&!this.preparingTargets.has(target)){target.dispose();this.targetCache.delete(key);} } }
    prefetchGeometry(a: string,b: string) { if(this.initPromise) void Promise.all([this.geometry(a),this.geometry(b)]).catch(()=>{}); }
    prepare(a: string, b: string, preview = false) {
        const generation = ++this.generation;
        this.preparing = true;
        this.error = null;
        const run = async () => {
            if (generation !== this.generation || !this.alive)
                return;
            const start = this.platform.now();
            await this.init();
            if (generation !== this.generation || !this.alive)
                return;
            const [ca, cb] = [a, b].sort(), flip = a !== ca;
            if (this.canonicalA === ca && this.canonicalB === cb && this.ready && (preview || !this.preview)) {
                this.flip = flip;
                this.preparing = false;
                this.setProgress(0, 'seek');
                return;
            }
            const [dataA, dataB] = await Promise.all([this.geometry(ca!), this.geometry(cb!)]);
            if (generation !== this.generation || !this.alive)
                return;
            const rasterStart = this.platform.now(), ta = this.cachedTarget(ca!, dataA), tb = ca === cb ? ta : this.cachedTarget(cb!, dataB);

            this.rasterMs = this.platform.now() - rasterStart;
            this.preparingTargets.add(ta); this.preparingTargets.add(tb);
            try {
                const key = `${ca}|${cb}|${this.size}`;
                let reply = preview ? { miss: false, hit: false, ms: 0, cacheBytes: this.cacheBytes, result: { size: this.size, ids: [], fields: new Uint16Array(2), changed: 0, bounds: {x:0,y:0,width:0,height:0}, births: [], deaths: [], seeds: [], particles: new Float32Array(), bytes: 0 } as GrowthResult } : await this.client!.request(key);
                if (reply.miss) {
                    const [la, lb] = await Promise.all([this.labels(ca!, ta), this.labels(cb!, tb)]);
                    this.rasterMs = this.platform.now() - rasterStart;
                    reply = await this.client!.request(key, { a: la.slice(), b: lb.slice(), size: this.size, seedsA: this.seedList(dataA, this.size), seedsB: this.seedList(dataB, this.size) });
                }
                if (generation !== this.generation || !this.alive)
                    return;
                const result = reply.result!;
                if (result.ids.length > 96)
                    throw new Error('More than 96 changing polities; cannot silently omit IDs');
                this.releasePair();
                this.targetA = ta;
                this.targetB = tb;

                this.canonicalA = ca!;
                this.canonicalB = cb!;
                this.flip = flip;
                this.result = result;
                this.preview = preview;
                this.initializeResolve = true;
                this.workerMs = reply.ms;
                this.cacheHit = reply.hit;
                this.cacheBytes = reply.cacheBytes;
                this.field.dispose();
                this.field = new DataArrayTexture(new Uint16Array(result.fields.buffer as ArrayBuffer), preview ? 1 : this.size, preview ? 1 : this.size, Math.max(1, result.ids.length));
                this.field.format = RGFormat;
                this.field.type = HalfFloatType;
                this.field.minFilter = this.field.magFilter = LinearFilter;
                this.field.colorSpace = NoColorSpace;
                this.field.needsUpdate = true;
                this.makePalette(this.styles(ca!), this.styles(cb!), result);
                const uniforms = (this.resolveMesh.material as ShaderMaterial).uniforms;
                uniforms.fields!.value = this.field;
                uniforms.labelsA!.value = ta.texture;
                uniforms.labelsB!.value = tb.texture;
                uniforms.count!.value = result.ids.length;
                (uniforms.ids!.value as Float32Array).fill(0);
                (uniforms.ids!.value as Float32Array).set(result.ids);
                this.uniforms.polityA!.value = ta.texture;
                this.uniforms.polityB!.value = tb.texture;
                if (!preview) this.linesA = new Boundaries(dataA, this.styles(ca!), this.terrain, this.scene, this.palette.white, this.palette.cinnabar);
                if (!preview) this.linesB = new Boundaries(dataB, this.styles(cb!), this.terrain, this.scene, this.palette.white, this.palette.cinnabar);
                if (!preview) this.particles = new FrontParticles(result.particles, this.uniforms, this.scene, this.palette.dust, this.terrain);
                this.ready = true;
                this.preparing = false;
                this.preparationMs = this.platform.now() - start;
                this.trailAt = -Infinity;
                this.setProgress(0, 'seek');
                this.warmAt = this.platform.now() + 1500;
                this.prefetched = false;
                this.trimTargets();
            }
            finally {
                this.preparingTargets.delete(ta); this.preparingTargets.delete(tb);
                this.trimTargets();
            }
        };
        this.queue = this.queue.catch(() => { }).then(run).catch(error => { if (generation === this.generation && this.alive) {
            this.error = error instanceof Error ? error.message : String(error);
            this.preparing = false;
        } throw error; });
        return this.queue;
    }
    private makePalette(a: PolityColor[], b: PolityColor[], result: GrowthResult) { const data = this.paletteTexture.image.data as Float32Array; data.fill(0); for (const [row, styles] of [[0, a], [1, b]] as const)
        for (const s of styles) {
            const id = this.ids.get(s.polityId)!;
            const c = new Color(s.color), offset = (row * 1024 + id) * 4;
            data.set([c.r, c.g, c.b, s.fillOpacity], offset);
            if (s.role !== 'neighbor')
                data[(3 * 1024 + id) * 4] = 1;
        } for (const seed of result.seeds)
        data.set([seed.x / this.size, seed.y / this.size, 1, 0], (2 * 1024 + seed.id) * 4); this.paletteTexture.needsUpdate = true; }
    setProgress(t: number, mode: 'drag' | 'seek' = 'drag', speed = 0) {
        if (!Number.isFinite(t))
            return;
        const now = this.platform.now(), clamped = Math.max(0, Math.min(1, t)), previous = this.progress;
        this.flight = null;
        this.previousProgress = previous;
        this.crossfade = this.preview || this.reducedMotion || !this.effects.growth || mode === 'drag' && (Math.abs(speed) > 300 || this.lastDrag > 0 && now - this.lastDrag < 150 && Math.abs(clamped - previous) / Math.max(1, now - this.lastDrag) * 1000 > 2.5);
        if (mode === 'drag')
            this.lastDrag = now;
        // Fast input follows its latest target through a bounded 120 ms blend.
        if (mode === 'drag' && this.crossfade && clamped !== previous)
            this.flight = { start: now, from: previous, to: clamped, duration: 120 };
        else
            this.progress = clamped;
        this.dirty = true;
        this.effectUntil = now + 2000;
        if (!this.flight && ((clamped === 1 && previous < 1) || (clamped === 0 && previous > 0))) {
            this.trailAt = now;
            this.trailSide = clamped === 1 ? 0 : 1;
        }
    }
    animateTo(t: number, duration = 1200) {
        if (!Number.isFinite(t))
            return;
        this.crossfade = this.preview || this.reducedMotion || !this.effects.growth;
        this.flight = { start: this.platform.now(), from: this.progress, to: Math.max(0, Math.min(1, t)), duration: this.crossfade ? 120 : Math.max(900, Math.min(1400, duration)) };
        this.effectUntil = this.platform.now() + this.flight.duration;
    }
    async play(a: string,b: string,duration=1200,target=1) {
        const pending=this.prepare(a,b),generation=this.generation;
        await pending;
        if(this.alive&&generation===this.generation&&!this.error)this.animateTo(target,duration);
    }
    playPrepared(reverse=false,duration=1200) {
        if(!this.ready||this.preparing)return;
        this.setProgress(reverse?1:0,'seek');this.animateTo(reverse?0:1,duration);
    }
    private async precompute() {
        if (this.warming || this.prefetched || !this.client)
            return;
        this.prefetched = true;
        const index = this.snapshots.findIndex(s => s.key === (this.flip ? this.canonicalA : this.canonicalB)), next = this.snapshots[index + 1];
        if (!next)
            return;
        this.warming = true;
        let target: WebGLRenderTarget | null = null;
        try {
            const from = this.snapshots[index]!, keys = [from.key, next.key].sort(), data = await this.geometry(next.key);
            if (!this.alive)
                return;
            target = this.cachedTarget(next.key,data);
            this.warmingTarget = target;
            const labels = await this.labels(next.key, target), oldKey = `${from.key}:${this.size}`, old = this.labelCache.get(oldKey);
            if (!old)
                return;
            const oldData = await this.geometry(from.key), normal = keys[0] === from.key;
            await this.client.request(`${keys[0]}|${keys[1]}|${this.size}`, { a: (normal ? old : labels).slice(), b: (normal ? labels : old).slice(), size: this.size, seedsA: this.seedList(normal ? oldData : data, this.size), seedsB: this.seedList(normal ? data : oldData, this.size) }, true);
        }
        catch { /* Optional prefetch never replaces the visible pair. */ }
        finally {
            this.trimTargets();
            this.warming = false;
            this.warmingTarget = null;
            this.trimTargets();
        }
    }
    update(now: number, quality: Quality) {
        const active = this.enabled && this.ready;
        this.uniforms.territoryEnabled!.value = Number(active && this.effects.fill);
        this.uniforms.territoryOpacity!.value = this.fillOpacity;
        this.uniforms.territoryEdges!.value = Number(active && this.effects.boundaries && !this.preview && !this.crossfade && !this.flight && now-this.lastDrag>200);
        if (this.flight) {
            const f = this.flight, t = Math.min(1, (now - f.start) / f.duration);
            this.progress = f.from + (f.to - f.from) * t;
            this.dirty = true;
            if (t === 1) {
                this.flight = null;
                this.trailAt = now;
                this.trailSide = this.progress === 1 ? 0 : 1;
            }
        }
        const t = this.flip ? 1 - this.progress : this.progress;
        this.uniforms.territoryProgress!.value = t;
        this.uniforms.territoryCrossfade!.value = Number(this.crossfade || this.reducedMotion || !this.effects.growth);
        const transient = active && !this.reducedMotion && !this.crossfade && now < this.effectUntil;
        this.uniforms.territoryFront!.value = Number(transient && this.effects.front);
        this.uniforms.territoryInk!.value = Number(transient && this.effects.ink);
        this.uniforms.particleEnabled!.value = Number(transient && this.effects.particles);
        this.uniforms.particleRatio!.value = Math.min(1, MORPH_QUALITY[quality].particles / Math.max(1, (this.result?.particles.length ?? 0) / 4));
        if (active && this.dirty && !this.preview && !this.crossfade) {
            const start = this.platform.now();
            (this.resolveMesh.material as ShaderMaterial).uniforms.progress!.value = t;
            this.raster.draw(this.resolveScene, this.resolveCamera, this.current, this.initializeResolve ? undefined : this.result?.bounds);
            this.initializeResolve = false;
            this.resolveMs = this.platform.now() - start;
            this.dirty = false;
        }
        const lineOn = active && this.effects.boundaries, fadeA = this.crossfade ? 1 - t : 1 - Math.min(1, t / .1), fadeB = this.crossfade ? t : Math.max(0, (t - .9) / .1), trail = active && (t === 0 || t === 1) && this.effects.trails && !this.reducedMotion ? Math.max(0, 1 - (now - this.trailAt) / 3000) * .4 : 0;
        const previousCanonical = (this.trailSide === 0) !== this.flip ? 0 : 1;
        this.linesA?.update(this.renderer, lineOn ? Math.max(fadeA, previousCanonical === 0 ? trail : 0) : 0, MORPH_QUALITY[quality].glow, fadeA < .01 && trail > 0 && previousCanonical === 0);
        this.linesB?.update(this.renderer, lineOn ? Math.max(fadeB, previousCanonical === 1 ? trail : 0) : 0, MORPH_QUALITY[quality].glow, fadeB < .01 && trail > 0 && previousCanonical === 1);
        if (active && now > this.warmAt && !this.preparing && !this.flight && !this.preview && now - this.lastDrag > 500)
            void this.precompute();
    }
    stats() { return { preview: this.preview, rasterCacheHits: this.rasterHits, rasterCacheEntries: this.targetCache.size, enabled: this.enabled, ready: this.ready, preparing: this.preparing, error: this.error, snapshotA: this.flip ? this.canonicalB : this.canonicalA, snapshotB: this.flip ? this.canonicalA : this.canonicalB, t: this.progress, playing: Boolean(this.flight), mode: this.crossfade ? 'crossfade' : 'sdf', labelSize: this.labelsSize, fieldSize: this.size, preparationMs: this.preparationMs, rasterMs: this.rasterMs, workerMs: this.workerMs, resolveMs: this.resolveMs, changedPixels: this.result?.changed ?? 0, involved: this.result?.ids.length ?? 0, fieldBytes: this.result?.bytes ?? 0, cacheHit: this.cacheHit, cacheBytes: this.cacheBytes, prefetched: this.prefetched, capitalFallbacks: this.result?.seeds.filter(s => s.source === 'centroid').length ?? 0, seedSources: this.result?.seeds.map(seed => ({ ...seed, polity: [...this.ids].find(([, id]) => id === seed.id)?.[0] })) ?? [], fillOpacity: this.fillOpacity, effects: { ...this.effects } }; }
    /** Explicit debug audit; never read back pixels in the animation loop. */
    async audit() {
        if (!this.result || !this.targetA || !this.targetB)
            throw new Error('No prepared pair');
        const a = await this.labels(this.canonicalA, this.targetA), b = await this.labels(this.canonicalB, this.targetB), pixels = new Uint8Array(this.size * this.size * 4);
        await this.renderer.readRenderTargetPixelsAsync(this.current, 0, 0, this.size, this.size, pixels);
        const t = this.flip ? 1 - this.progress : this.progress;
        let gaps = 0, invalid = 0, mismatches = 0, hash = 2166136261;
        const valid = new Set(a);
        for (const id of b)
            valid.add(id);
        for (let i = 0; i < a.length; i++) {
            const id = pixels[i * 4]! + pixels[i * 4 + 1]! * 256;
            if (a[i] !== 0 && b[i] !== 0 && id === 0)
                gaps++;
            if (!valid.has(id))
                invalid++;
            if (ownerAt(this.result, a[i]!, b[i]!, i, t) !== id)
                mismatches++;
            hash = Math.imul(hash ^ id, 16777619);
        }
        return { t: this.progress, pixels: a.length, gaps, invalid, mismatches, hash: hash >>> 0 };
    }
    restore() { this.field.needsUpdate = this.paletteTexture.needsUpdate = true; this.ready = false; this.targetCache.forEach(t=>t.dispose()); this.targetCache.clear(); this.initializeResolve = true; const a = this.flip ? this.canonicalB : this.canonicalA, b = this.flip ? this.canonicalA : this.canonicalB, t = this.progress; this.canonicalA = ''; this.canonicalB = ''; if (a && b)
        void this.prepare(a, b).then(() => this.setProgress(t, 'seek')).catch(() => { }); }
    private releasePair() { this.linesA?.dispose(); this.linesB?.dispose(); this.particles?.dispose(); this.linesA = this.linesB = null; this.particles = null; }
    dispose() { this.alive = false; this.generation++; this.client?.dispose(); this.releasePair(); this.targetCache.forEach(t=>t.dispose()); this.targetCache.clear(); this.current.dispose(); this.field.dispose(); this.paletteTexture.dispose(); this.empty.dispose(); this.resolveMesh.geometry.dispose(); (this.resolveMesh.material as ShaderMaterial).dispose(); }
}
