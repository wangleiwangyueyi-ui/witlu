import { clamp, tileX, tileY } from './terrain.mjs';
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * clamp(t, 0, 1));
export const luminance = rgb => rgb.map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [.2126, .7152, .0722][i], 0);
export const luma = rgb => (rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722) / 255;
export function shade(height, dx, dy, slope, land, colors) {
  let color;
  if (land) {
    color = mix(colors['land-low'], colors['land-high'], height / 3500);
    color = mix(color, colors['land-snow'], (height - 2900) / 3000);
    const baseLuma = luma(color);
    if (baseLuma > .295) color = color.map(c => c * .295 / baseLuma);
    const nx = -dx * 12, ny = -dy * 12, len = Math.hypot(nx, ny, 1);
    const lights = [[-.6, -.6, .53], [-.85, 0, .53], [0, -.85, .53], [.6, -.6, .53]];
    const illumination = lights.reduce((s, l, i) => s + Math.max(0, (nx * l[0] + ny * l[1] + l[2]) / len) * [.4, .25, .2, .15][i], 0);
    color = illumination > .53 ? mix(color, colors['land-ridge'], (illumination - .53) * .8) : mix(color, colors['terrain-shadow'], (.53 - illumination) * 1.6);
    color = mix(color, colors['terrain-shadow'], Math.min(.18, slope * .15));
  } else {
    const depth = Math.max(0, -height);
    color = depth < 350 ? mix(colors['sea-coast'], colors['sea-shelf'], depth / 350) : mix(colors['sea-shelf'], colors['sea-deep'], (depth - 350) / 3000);
    color = mix(color, colors['sea-deep'], .28);
  }
  // L0: bound display-referred luma, then enforce white-text contrast >= 7.
  // Preserve the blue/slate chromaticity; do not desaturate towards neutral grey.
  const y = luma(color); if (y > .315) color = color.map(c => c * .315 / y);
  while (luminance(color) > .085) color = color.map(c => c * .99);
  return color.map(Math.round);
}
function clipRing(points, minX, minY, maxX, maxY) {
  let polygon = points;
  for (const [axis, value, greater] of [[0, minX, true], [0, maxX, false], [1, minY, true], [1, maxY, false]]) {
    const result = []; if (!polygon.length) return [];
    let a = polygon.at(-1), ain = greater ? a[axis] >= value : a[axis] <= value;
    for (const b of polygon) { const bin = greater ? b[axis] >= value : b[axis] <= value; if (ain !== bin) { const t = (value - a[axis]) / (b[axis] - a[axis]); result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } if (bin) result.push(b); a = b; ain = bin; }
    polygon = result;
  }
  return polygon;
}
export function projectLand(geo, z) {
  return geo.features.flatMap(f => f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]).map(rings => {
    const projected = rings.map(ring => ring.map(([lon, lat]) => [tileX(lon, z) * 256, tileY(clamp(lat, -85, 85), z) * 256]));
    const exterior = projected[0]; let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of exterior) { minX = Math.min(x, minX); minY = Math.min(y, minY); maxX = Math.max(x, maxX); maxY = Math.max(y, maxY); }
    return { rings: projected, minX, minY, maxX, maxY };
  });
}
export function landSVG(polygons, tile) {
  const x = tile.x * 256, y = tile.y * 256;
  const paths = polygons.filter(p => p.minX <= x + 256 && p.maxX >= x && p.minY <= y + 256 && p.maxY >= y).map(p => p.rings.map(r => {
    const points = clipRing(r, x - 1, y - 1, x + 257, y + 257); return points.length < 3 ? '' : 'M' + points.map(([px, py]) => `${(px - x).toFixed(2)},${(py - y).toFixed(2)}`).join('L') + 'Z';
  }).join('')).map(d => `<path fill-rule="evenodd" d="${d}"/>`).join('');
  // White here is a numeric raster mask, not a visible design colour.
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><g fill="white">${paths}</g></svg>`);
}
