import { Box3, Frustum, Matrix4, Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import { children, roots, tileBounds, tileKey } from './geo';
import type { TileId } from './geo';

export function screenError(tile: TileId, distance: number, viewportHeight: number, fov: number) { return tileBounds(tile).size / 256 * viewportHeight / (2 * Math.tan(fov * Math.PI / 360) * Math.max(distance, 1)); }
export function selectTiles(camera: PerspectiveCamera, height: number, maxZoom: number, error: number, budget: number): TileId[] {
  const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const box = new Box3(), center = new Vector3();
  const visible = (tile: TileId) => { const b = tileBounds(tile); box.min.set(b.x, -12, b.z); box.max.set(b.x + b.size, 30, b.z + b.size); return frustum.intersectsBox(box); };
  const score = (tile: TileId) => { const b = tileBounds(tile); center.set(b.x + b.size / 2, 0, b.z + b.size / 2); const distance = Math.max(camera.position.y, camera.position.distanceTo(center) - b.size * .55); return screenError(tile, distance, height, camera.fov); };
  const leaves = roots().filter(visible);
  while (leaves.length < budget) {
    let best = -1, largest = error;
    for (let i = 0; i < leaves.length; i++) { const t = leaves[i]!; if (t.z < maxZoom) { const s = score(t); if (s > largest) { best = i; largest = s; } } }
    if (best < 0) break;
    const next = children(leaves[best]!).filter(visible); if (leaves.length - 1 + next.length > budget) break;
    leaves.splice(best, 1, ...next);
  }
  return leaves;
}
export function ancestors(leaves: TileId[]) {
  const result = new Map<string, TileId>();
  for (const leaf of leaves) { let node = leaf; while (node.z >= 3) { result.set(tileKey(node), node); node = { z: node.z - 1, x: Math.floor(node.x / 2), y: Math.floor(node.y / 2) }; } }
  return [...result.values()].sort((a, b) => a.z - b.z);
}
