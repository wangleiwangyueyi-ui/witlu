import pointInPolygon from '@turf/boolean-point-in-polygon';
import turfArea from '@turf/area';
export const feature = (geometry, properties = {}) => ({ type: 'Feature', geometry, properties });
export function closeRing(ring) {
  const result = ring.map(p => [...p]);
  if (result.length && (result[0][0] !== result.at(-1)[0] || result[0][1] !== result.at(-1)[1])) result.push([...result[0]]);
  return result;
}
export function polygonal(shape) {
  if (!shape || !['Polygon', 'MultiPolygon'].includes(shape.type)) throw new Error('Expected polygon geometry');
  return { type: shape.type, coordinates: shape.type === 'Polygon' ? shape.coordinates.map(closeRing) : shape.coordinates.map(p => p.map(closeRing)) };
}
export function contains(coord, shape) {
  return !!coord && pointInPolygon({ type: 'Point', coordinates: coord }, shape.type === 'Feature' ? shape : feature(polygonal(shape)));
}
export const areaKm2 = shape => turfArea(shape.type === 'Feature' ? shape : feature(polygonal(shape))) / 1e6;
export function resolveProfile(title, from, to, profiles) {
  const start = p => p.matchFrom ?? p.from, end = p => p.matchTo ?? p.to;
  return profiles.filter(p => (p.titles ?? [p.zh]).includes(title) && start(p) <= to && end(p) >= from)
    .sort((a, b) => (Math.min(end(b), to) - Math.max(start(b), from)) - (Math.min(end(a), to) - Math.max(start(a), from)) || a.key.localeCompare(b.key))[0];
}
