import { Raycaster, Vector2 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { TerrainTile } from '../terrain/TerrainTile';
import { BOUNDS, unproject } from '../terrain/geo';
export interface TerrainPick { lon: number; lat: number; elevation: number }
export function pickTerrain(x: number, y: number, width: number, height: number, camera: PerspectiveCamera, tiles: TerrainTile[]): TerrainPick | null {
  const ray = new Raycaster(); ray.setFromCamera(new Vector2(x / width * 2 - 1, 1 - y / height * 2), camera);
  const hit = ray.intersectObjects(tiles.map(t => t.pickMesh), false)[0]; if (!hit) return null;
  const location = unproject(hit.point.x, hit.point.z);
  if (location.lon < BOUNDS.west || location.lon > BOUNDS.east || location.lat < BOUNDS.south || location.lat > BOUNDS.north) return null;
  return { ...location, elevation: hit.point.y * 1000 * Math.cos(location.lat * Math.PI / 180) / (hit.point.y >= 0 ? 1.8 : .5) };
}
