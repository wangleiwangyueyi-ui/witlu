import { Color, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import type { WebGLRendererParameters } from 'three';
import type { PlatformAdapter } from './platform/PlatformAdapter';
import { MapCamera } from './camera/MapCamera';
import { QualityController, QUALITY } from './Quality';
import type { Quality } from './Quality';
import { TerrainManager } from './terrain/TerrainManager';
import type { TerrainPalette } from './terrain/TerrainTile';
import { pickTerrain } from './picking/pickTerrain';
import type { TerrainPick } from './picking/pickTerrain';
import { Environment } from './atmosphere/Environment';
export interface EngineStats { fps: number; frameMs: number; cpuMs: number; drawCalls: number; triangles: number; tiles: number; cached: number; loading: number; errors: number; zoom: number; quality: Quality; pixelRatio: number; context: 'ready' | 'lost'; pose: ReturnType<AtlasRenderer['pose']>; environment: ReturnType<Environment['stats']> }
export class AtlasRenderer {
  readonly camera: MapCamera; readonly quality: QualityController; readonly terrain: TerrainManager; readonly environment: Environment;
  readonly renderer: WebGLRenderer; private scene = new Scene(); private frame = 0; private alive = true; private visible = true; private lost = false;
  private previous = 0; private lastLod = -Infinity; private lastReport = 0; private samples: number[] = []; private cpu: number[] = [];
  private cleanup: (() => void)[] = [];
  onStats: ((stats: EngineStats) => void) | null = null;
  onQuality: ((quality: Quality) => void) | null = null;
  onPick: ((pick: TerrainPick | null) => void) | null = null;
  constructor(private platform: PlatformAdapter, palette: TerrainPalette, initialQuality: Quality = 'high') {
    const viewport = platform.viewport(); this.camera = new MapCamera(viewport.mobile); this.quality = new QualityController(initialQuality);
    this.renderer = new WebGLRenderer({ canvas: platform.canvas as NonNullable<WebGLRendererParameters['canvas']>, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.outputColorSpace = SRGBColorSpace; this.scene.background = new Color(palette.sky);
    this.environment = new Environment(platform, palette.environment ?? { sky: palette.sky, horizon: palette.sky, shelf: palette.sea, coast: palette.sea, flow: palette.sea, wave: palette.sea, cloud: palette.sky }, this.scene);
    void this.environment.load();
    this.terrain = new TerrainManager(platform, this.scene, palette, initialQuality, viewport.mobile, this.environment.uniforms);
    this.camera.onPick = (x, y) => this.onPick?.(pickTerrain(x, y, this.camera.width, this.camera.height, this.camera.camera, this.terrain.visible));
    this.cleanup.push(platform.bindInput(this.camera), platform.onResize(() => this.resize()), platform.onContextChange(() => {
      this.lost = true; platform.cancelFrame(this.frame); this.report(platform.now());
    }, () => { if (!this.alive) return; this.lost = false; this.previous = 0; this.terrain.restore(); this.environment.restore(); this.resize(); this.start(); }), platform.onVisibility(visible => { this.visible = visible; platform.cancelFrame(this.frame); this.previous = 0; if (visible) this.start(); }));
    this.resize(); this.start();
  }
  pose() { return { ...this.camera.pose }; }
  setQuality(level: Quality) { this.quality.set(level); this.terrain.setQuality(level); this.resize(); }
  resize() { const v = this.platform.viewport(); this.camera.resize(Math.max(1, v.width), Math.max(1, v.height)); this.renderer.setPixelRatio(Math.min(v.pixelRatio, QUALITY[this.quality.level].pixelRatio)); this.renderer.setSize(Math.max(1, v.width), Math.max(1, v.height), false); this.lastLod = -Infinity; }
  private start() { if (this.alive && !this.lost && this.visible) this.frame = this.platform.requestFrame(now => this.tick(now)); }
  private tick(now: number) {
    if (!this.alive || this.lost || !this.visible) return;
    const start = this.platform.now(), dt = this.previous ? now - this.previous : 16.67; this.previous = now;
    this.camera.update(dt);
    this.environment.update(dt, this.camera, this.quality.level);
    if (now - this.lastLod >= 120) { this.terrain.update(this.camera.camera, this.camera.height, now); this.lastLod = now; }
    this.renderer.render(this.scene, this.camera.camera);
    if (dt < 250) { this.samples.push(dt); this.cpu.push(this.platform.now() - start); }
    const change = this.quality.sample(dt); if (change) { this.terrain.setQuality(change); this.resize(); this.onQuality?.(change); }
    if (now - this.lastReport >= 500) this.report(now);
    this.start();
  }
  private report(now: number) {
    const mean = (values: number[]) => values.reduce((s, n) => s + n, 0) / Math.max(1, values.length);
    const frameMs = mean(this.samples); this.onStats?.({ fps: this.lost ? 0 : frameMs ? 1000 / frameMs : 0, frameMs, cpuMs: mean(this.cpu), drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, tiles: this.terrain.visible.length, cached: this.terrain.cacheSize, loading: this.terrain.loading, errors: this.terrain.errors, zoom: this.terrain.maxZoom, quality: this.quality.level, pixelRatio: this.renderer.getPixelRatio(), context: this.lost ? 'lost' : 'ready', pose: this.pose(), environment: this.environment.stats() });
    this.samples = []; this.cpu = []; this.lastReport = now;
  }
  renderNow() { if (!this.lost) this.renderer.render(this.scene, this.camera.camera); }
  dispose() { this.alive = false; this.platform.cancelFrame(this.frame); this.cleanup.forEach(fn => fn()); this.camera.cancel(); this.terrain.dispose(); this.environment.dispose(); this.renderer.dispose(); }
}
