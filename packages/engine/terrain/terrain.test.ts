import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Scene } from 'three';
import { decodeTerrarium, elevationKm, latFromY, mercatorY, project, sampleHeight, tileBounds, unproject } from './geo';
import { ancestors, screenError, selectTiles } from './Quadtree';
import { MapCamera } from '../camera/MapCamera';
import { QualityController } from '../Quality';
import { TerrainTile } from './TerrainTile';
import { pickTerrain } from '../picking/pickTerrain';
describe('geographic coordinates and height encoding', () => {
  it.each([[60, 0], [105, 35], [150, 60], [88.8, 29.5]])('roundtrips %s %s', (lon, lat) => { const p = project(lon, lat), back = unproject(p.x, p.z); expect(back.lon).toBeCloseTo(lon, 10); expect(back.lat).toBeCloseTo(lat, 10); expect(latFromY(mercatorY(lat))).toBeCloseTo(lat, 10); });
  it('keeps negative seabed and 1/256 metre fractions', () => { expect(decodeTerrarium(128, 0, 0)).toBe(0); expect(decodeTerrarium(127, 255, 128)).toBe(-.5); expect(decodeTerrarium(0, 0, 0)).toBe(-32768); expect(decodeTerrarium(255, 255, 255)).toBe(32767.99609375); });
  it('bilinearly interpolates decoded metres across carry bytes', () => { const data = new Uint8Array([127, 255, 0, 255, 128, 1, 0, 255, 128, 0, 0, 255, 128, 2, 0, 255]); expect(sampleHeight(data, 2, 2, .5, .5)).toBe(.5); expect(sampleHeight(data, 2, 2, 0, 0)).toBe(-1); expect(sampleHeight(data, 2, 2, 1, 1)).toBe(2); });
  it('uses exactly 1.8× land and .5× seabed in geographical metres', () => { expect(elevationKm(1000, 0)).toBe(1.8); expect(elevationKm(-1000, 0)).toBe(-.5); expect(elevationKm(1000, 60)).toBeCloseTo(3.6); expect(elevationKm(1000, 0, false)).toBe(0); });
  it('tile edges share exact projected coordinates', () => { const a = tileBounds({ z: 8, x: 200, y: 100 }), b = tileBounds({ z: 8, x: 201, y: 100 }); expect(a.x + a.size).toBeCloseTo(b.x, 9); });
});
describe('screen-space quadtree', () => {
  it('refines with larger viewport and smaller camera distance', () => { const tile = { z: 4, x: 12, y: 6 }; expect(screenError(tile, 1000, 900, 42)).toBeGreaterThan(screenError(tile, 6000, 900, 42)); expect(screenError(tile, 1000, 1800, 42)).toBeCloseTo(screenError(tile, 1000, 900, 42) * 2); });
  it('caps visible leaves, respects max zoom, loads parents first', () => { const camera = new MapCamera(); camera.resize(1440, 900); camera.flyTo({ distance: 800 }, 0); const leaves = selectTiles(camera.camera, 900, 6, 1.2, 40); expect(leaves.length).toBeGreaterThan(0); expect(leaves.length).toBeLessThanOrEqual(40); expect(Math.max(...leaves.map(t => t.z))).toBeLessThanOrEqual(6); const all = ancestors(leaves); expect(all[0]!.z).toBe(3); expect(all.every((t, i) => i === 0 || t.z >= all[i - 1]!.z)).toBe(true); });
});
describe('camera controls', () => {
  const event = (id: number, x: number, y: number, time = 0) => ({ id, x, y, time, shift: false, button: 0 });
  it('starts at 45° desktop / 40° mobile and never offers a 2D pitch', () => { const camera = new MapCamera(); expect(camera.pose.pitch).toBe(45); expect(new MapCamera(true).pose.pitch).toBe(40); camera.flyTo({ pitch: 0, lon: 200, lat: -50, distance: 1 }, 0); expect(camera.pose).toMatchObject({ pitch: 25, lon: 149, lat: 1, distance: 180 }); camera.flyTo({ pitch: 100, distance: 1e9 }, 0); expect(camera.pose.pitch).toBe(65); expect(camera.pose.distance).toBe(11000); });
  it('pans and continues with bounded decaying inertia', () => { const camera = new MapCamera(); camera.resize(1000, 800); camera.down(event(1, 100, 100)); camera.move(event(1, 180, 110, 20)); camera.up(event(1, 180, 110, 22)); const lon = camera.pose.lon; camera.update(16); expect(camera.pose.lon).not.toBe(lon); for (let i = 0; i < 500; i++) camera.update(16); const stop = camera.pose.lon; camera.update(16); expect(camera.pose.lon).toBeCloseTo(stop, 8); });
  it('reduced motion disables inertia and flyTo interpolation', () => { const c = new MapCamera(); c.resize(1000, 800); c.reducedMotion = true; c.down(event(1, 100, 100)); c.move(event(1, 150, 100, 20)); c.up(event(1, 150, 100, 22)); const lon = c.pose.lon; c.update(16); expect(c.pose.lon).toBe(lon); c.flyTo({ lon: 88.8, lat: 29.5 }); expect(c.pose.lon).toBe(88.8); });
  it('supports two-pointer pinch, rotation and inclination', () => { const c = new MapCamera(true); c.resize(390, 844); c.down(event(1, 120, 250)); c.down(event(2, 220, 250)); c.move(event(2, 280, 280, 20)); expect(c.pose.distance).toBeLessThan(6300); expect(c.pose.bearing).not.toBe(0); expect(c.pose.pitch).toBeGreaterThan(40); });
  it('uses a short rotation arc in flyTo and lets gesture interrupt it', () => { const c = new MapCamera(); c.flyTo({ bearing: 179 }, 0); c.flyTo({ bearing: -179 }, 100); c.update(50); expect(Math.abs(c.pose.bearing)).toBeCloseTo(180); c.down(event(1, 100, 100)); const pose = { ...c.pose }; c.update(50); expect(c.pose.bearing).toBe(pose.bearing); });
  it('only picks a short click, not a drag', () => { const c = new MapCamera(); c.resize(1000, 800); let picks = 0; c.onPick = () => picks++; c.down(event(1, 10, 10)); c.up(event(1, 10, 10, 100)); expect(picks).toBe(1); c.down(event(1, 10, 10)); c.move(event(1, 40, 10, 20)); c.up(event(1, 40, 10, 30)); expect(picks).toBe(1); });
});
describe('automatic quality hysteresis', () => {
  it('requires continuous two seconds above 22ms', () => { const q = new QualityController('ultra'); for (let i = 0; i < 79; i++) expect(q.sample(25)).toBeNull(); expect(q.sample(25)).toBe('high'); for (let i = 0; i < 50; i++) q.sample(30); q.sample(16); expect(q.sample(30)).toBeNull(); });
  it('requires continuous ten seconds below 12ms and can be disabled', () => { const q = new QualityController('eco'); for (let i = 0; i < 999; i++) expect(q.sample(10)).toBeNull(); expect(q.sample(10)).toBe('high'); q.automatic = false; for (let i = 0; i < 1000; i++) q.sample(30); expect(q.level).toBe('high'); });
  it('does not count background pauses or zero duration', () => { const q = new QualityController(); for (let i = 0; i < 79; i++) q.sample(25); q.sample(5000); expect(q.sample(25)).toBeNull(); expect(q.sample(0)).toBeNull(); });
});
it('raycasts the exact displaced surface, not the sea-level plane', () => {
  const dem = { width: 2, height: 2, data: new Uint8Array(Array.from({ length: 4 }, () => [131, 232, 0, 255]).flat()) }; // 1000m
  const color = { ...dem, data: new Uint8Array(16).fill(255) };
  const tile = new TerrainTile({ z: 8, x: 202, y: 101 }, dem, color, 4, { sky: 'navy', land: 'teal', sea: 'blue' });
  const b = tileBounds(tile.id), camera = new PerspectiveCamera(42, 1, .1, 2000); camera.position.set(b.x + b.size / 2, 500, b.z + b.size / 2); camera.up.set(0, 0, -1); camera.lookAt(b.x + b.size / 2, 0, b.z + b.size / 2); camera.updateMatrixWorld();
  new Scene().add(tile.group); const pick = pickTerrain(50, 50, 100, 100, camera, [tile]); expect(pick).not.toBeNull(); expect(pick!.elevation).toBeCloseTo(1000, 2); tile.effects(false, true, true); expect(pickTerrain(50, 50, 100, 100, camera, [tile])!.elevation).toBeCloseTo(0); tile.dispose();
});
