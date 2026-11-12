export const WORLD_KM = 40075.016686;
export const BOUNDS = { west: 60, south: 0, east: 150, north: 60 };
const originX = (105 + 180) / 360, originY = mercatorY(35);
export function mercatorY(latitude: number) { return (1 - Math.asinh(Math.tan(Math.max(-85, Math.min(85, latitude)) * Math.PI / 180)) / Math.PI) / 2; }
export function latFromY(y: number) { return Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI; }
export function project(lon: number, lat: number) { return { x: ((lon + 180) / 360 - originX) * WORLD_KM, z: (mercatorY(lat) - originY) * WORLD_KM }; }
export function unproject(x: number, z: number) { return { lon: (x / WORLD_KM + originX) * 360 - 180, lat: latFromY(z / WORLD_KM + originY) }; }
export interface TileId { z: number; x: number; y: number }
export const tileKey = (tile: TileId) => `${tile.z}/${tile.x}/${tile.y}`;
export function tileBounds(tile: TileId) {
  const size = WORLD_KM / 2 ** tile.z;
  return { x: tile.x * size - originX * WORLD_KM, z: tile.y * size - originY * WORLD_KM, size };
}
export function intersectsBounds(tile: TileId) { const n = 2 ** tile.z; return tile.x < (BOUNDS.east + 180) / 360 * n && tile.x + 1 > (BOUNDS.west + 180) / 360 * n && tile.y < mercatorY(BOUNDS.south) * n && tile.y + 1 > mercatorY(BOUNDS.north) * n; }
export function children(tile: TileId): TileId[] { return [0, 1].flatMap(dy => [0, 1].map(dx => ({ z: tile.z + 1, x: tile.x * 2 + dx, y: tile.y * 2 + dy }))).filter(intersectsBounds); }
export function roots(): TileId[] { return Array.from({ length: 64 }, (_, i) => ({ z: 3, x: i % 8, y: Math.floor(i / 8) })).filter(intersectsBounds); }
export function decodeTerrarium(r: number, g: number, b: number) { return r * 256 + g + b / 256 - 32768; }
export function sampleHeight(data: Uint8Array, width: number, height: number, u: number, v: number) {
  const x = Math.max(0, Math.min(width - 1, u * width - .5)), y = Math.max(0, Math.min(height - 1, v * height - .5));
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
  const at = (px: number, py: number) => { const i = (py * width + px) * 4; return decodeTerrarium(data[i]!, data[i + 1]!, data[i + 2]!); };
  const a = at(x0, y0) * (1 - tx) + at(Math.min(width - 1, x0 + 1), y0) * tx;
  const b = at(x0, Math.min(height - 1, y0 + 1)) * (1 - tx) + at(Math.min(width - 1, x0 + 1), Math.min(height - 1, y0 + 1)) * tx;
  return a * (1 - ty) + b * ty;
}
export const elevationKm = (metres: number, latitude: number, enabled = true) => enabled ? metres / 1000 * (metres >= 0 ? 1.8 : .5) / Math.cos(latitude * Math.PI / 180) : 0;
