import type { IUniform, PerspectiveCamera, Scene } from 'three';
import type { PlatformAdapter } from '../platform/PlatformAdapter';
import type { Quality } from '../Quality';
import { QUALITY } from '../Quality';
import { ancestors, selectTiles } from './Quadtree';
import { roots, tileKey } from './geo';
import type { TileId } from './geo';
import { TerrainTile } from './TerrainTile';
import type { TerrainPalette } from './TerrainTile';

export class TerrainManager {
  private cache = new Map<string, TerrainTile>(); private pending = new Set<string>();
  private failures = new Map<string, { tries: number; retryAfter: number }>();
  private disposed = false; private generation = 0; private clock = 0;
  visible: TerrainTile[] = []; loading = 0; errors = 0;
  effects = { displacement: true, relief: true, water: true };
  private needed = new Set<string>(); private jobs: TileId[] = [];
  constructor(private platform: PlatformAdapter, private scene: Scene, private palette: TerrainPalette, private quality: Quality, private mobile: boolean, private environment: Record<string, IUniform> = {}) {}
  setQuality(quality: Quality) {
    if (quality === this.quality) return;
    this.quality = quality;
    // Existing mesh density remains valid. Newly acquired tiles use the new budget;
    // cached tiles avoid a loading flash during a quality transition.
  }
  update(camera: PerspectiveCamera, height: number, now: number) {
    if (this.disposed) return; this.clock = now;
    const preset = QUALITY[this.quality];
    const leaves = selectTiles(camera, height, Math.min(preset.zoom, this.mobile ? 7 : 8), preset.error, preset.tiles);
    const jobs = ancestors(leaves); this.jobs = jobs; this.needed = new Set(jobs.map(tileKey));
    for (const tile of this.cache.values()) tile.group.visible = false;
    this.visible = [];
    const visit = (node: TileId) => {
      const key = tileKey(node); if (!this.needed.has(key)) return;
      const relevantChildren = jobs.filter(t => t.z === node.z + 1 && Math.floor(t.x / 2) === node.x && Math.floor(t.y / 2) === node.y);
      if (relevantChildren.length && relevantChildren.every(t => this.cache.has(tileKey(t)))) { relevantChildren.forEach(visit); return; }
      const tile = this.cache.get(key); if (tile) { tile.group.visible = true; tile.effects(this.effects.displacement, this.effects.relief, this.effects.water); tile.lastUsed = now; this.visible.push(tile); }
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
      void Promise.all(['dem', 'relief'].map(kind => this.platform.readBytes(`/tiles/${kind}/${key}.webp`).then(bytes => this.platform.decodeImage(bytes)))).then(([dem, relief]) => {
        if (this.disposed || generation !== this.generation) return;
        const resource = new TerrainTile(tile, dem!, relief!, QUALITY[this.quality].segments, this.palette, this.environment); resource.group.visible = false; this.scene.add(resource.group); this.cache.set(key, resource); this.failures.delete(key);
      }).catch(() => { if (!this.disposed) { const tries = (this.failures.get(key)?.tries ?? 0) + 1; this.failures.set(key, { tries, retryAfter: this.clock + 2000 * tries }); this.errors++; } }).finally(() => { this.pending.delete(key); this.loading = this.pending.size; if (!this.disposed) this.pump(); });
    }
  }
  get cacheSize() { return this.cache.size; }
  heightAt(x:number,z:number){for(const tile of this.visible){const height=tile.heightAt(x,z);if(height!==null)return height;}return 0;}
  get maxZoom() { return Math.max(0, ...this.visible.map(t => t.id.z)); }
  restore() { this.cache.forEach(tile => tile.restore()); }
  dispose() { this.disposed = true; this.generation++; this.cache.forEach(tile => tile.dispose()); this.cache.clear(); }
}
