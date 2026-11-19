import type { IUniform, Scene } from 'three';
import type { AtlasCamera } from '../camera/MapCamera';
import type { DecodedImage } from '../platform/PlatformAdapter';
import type { PlatformAdapter } from '../platform/PlatformAdapter';
import type { Quality } from '../Quality';
import { QUALITY } from '../Quality';
import { ancestors, selectTiles } from './Quadtree';
import { roots, tileKey } from './geo';
import type { TileId } from './geo';
import { TerrainTile } from './TerrainTile';
import type { TerrainPalette } from './TerrainTile';

const flatHeight: DecodedImage = {data:new Uint8Array([128,0,0,255]),width:1,height:1};

export class TerrainManager {
  private cache = new Map<string, TerrainTile>(); private pending = new Set<string>();
  private failures = new Map<string, { tries: number; retryAfter: number }>();
  private backdrop: TerrainTile | undefined;
  private disposed = false; private generation = 0; private clock = 0;
  visible: TerrainTile[] = []; loading = 0; errors = 0;
  effects = { displacement: true, relief: true, water: true };
  private needed = new Set<string>(); private jobs: TileId[] = [];
  constructor(private platform: PlatformAdapter, private scene: Scene, private palette: TerrainPalette, private quality: Quality, private mobile: boolean, private environment: Record<string, IUniform> = {}, readonly flat = false) {
    if (flat) void platform.readBytes('/tiles/flat-world.webp').then(bytes => platform.decodeImage(bytes)).then(image => {
      if (this.disposed) return;
      this.backdrop = new TerrainTile({ z: 0, x: 0, y: 0 }, flatHeight, image, 1, palette, environment, true);
      this.backdrop.group.position.y = -1;
      this.scene.add(this.backdrop.group);
    }).catch(() => { /* The detailed atlas tiles remain usable without the outer coastline. */ });
  }
  setQuality(quality: Quality) {
    if (quality === this.quality) return;
    this.quality = quality;
    // Existing mesh density remains valid. Newly acquired tiles use the new budget;
    // cached tiles avoid a loading flash during a quality transition.
  }
  update(camera: AtlasCamera, height: number, now: number) {
    if (this.disposed) return; this.clock = now;
    this.backdrop?.effects(false, this.effects.relief, this.effects.water);
    const preset = QUALITY[this.quality];
    const leaves = selectTiles(camera, height, Math.min(preset.zoom, this.mobile ? 7 : 8), preset.error, preset.tiles);
    const jobs = ancestors(leaves); this.jobs = jobs; this.needed = new Set(jobs.map(tileKey));
    for (const tile of this.cache.values()) tile.group.visible = false;
    this.visible = [];
    const visit = (node: TileId) => {
      const key = tileKey(node); if (!this.needed.has(key)) return;
      const relevantChildren = jobs.filter(t => t.z === node.z + 1 && Math.floor(t.x / 2) === node.x && Math.floor(t.y / 2) === node.y);
      if (relevantChildren.length && relevantChildren.every(t => this.cache.has(tileKey(t)))) { relevantChildren.forEach(visit); return; }
      const tile = this.cache.get(key); if (tile) { tile.group.visible = true; tile.effects(!this.flat && this.effects.displacement, this.effects.relief, this.effects.water); tile.lastUsed = now; this.visible.push(tile); }
    };
    roots().forEach(visit); this.pump();
    if (this.cache.size > preset.cache) {
      const unused = [...this.cache.entries()].filter(([key, t]) => !t.group.visible && !this.needed.has(key)).sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      for (const [key, tile] of unused) { if (this.cache.size <= preset.cache) break; tile.dispose(); this.cache.delete(key); }
    }
  }
  private pump() {
    for (const tile of this.jobs) {
      if (this.pending.size >= 4) break;
      const key = tileKey(tile), failure = this.failures.get(key);
      if (this.cache.has(key) || this.pending.has(key) || (failure && (failure.tries >= 3 || this.clock < failure.retryAfter))) continue;
      this.pending.add(key); this.loading = this.pending.size; const generation = this.generation;
      const read = (kind: string) => this.platform.readBytes(`/tiles/${kind}/${key}.webp`).then(bytes => this.platform.decodeImage(bytes));
      void Promise.all([this.flat ? flatHeight : read('dem'), read('relief')]).then(([dem, relief]) => {
        if (this.disposed || generation !== this.generation) return;
        const resource = new TerrainTile(tile, dem!, relief!, this.flat ? 1 : QUALITY[this.quality].segments, this.palette, this.environment, this.flat); resource.group.visible = false; this.scene.add(resource.group); this.cache.set(key, resource); this.failures.delete(key);
      }).catch(() => { if (!this.disposed) { const tries = (this.failures.get(key)?.tries ?? 0) + 1; this.failures.set(key, { tries, retryAfter: this.clock + 2000 * tries }); this.errors++; } }).finally(() => { this.pending.delete(key); this.loading = this.pending.size; if (!this.disposed) this.pump(); });
    }
  }
  get cacheSize() { return this.cache.size; }
  heightAt(x:number,z:number){if(this.flat)return 0;for(const tile of this.visible){const height=tile.heightAt(x,z);if(height!==null)return height;}return 0;}
  get maxZoom() { return Math.max(0, ...this.visible.map(t => t.id.z)); }
  restore() { this.backdrop?.restore(); this.cache.forEach(tile => tile.restore()); }
  dispose() { this.disposed = true; this.generation++; this.backdrop?.dispose(); this.cache.forEach(tile => tile.dispose()); this.cache.clear(); }
}
