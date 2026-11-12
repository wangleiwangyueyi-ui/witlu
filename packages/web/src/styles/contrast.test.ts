import fs from 'node:fs';
import { expect, it } from 'vitest';
type RGB = [number, number, number];
const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const token = (key: string): RGB => { const hex = css.match(new RegExp(`--${key}:\\s*#([\\da-fA-F]{6})`))![1]!; return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)) as RGB; };
const blend = (fg: RGB, bg: RGB, alpha: number) => fg.map((n, i) => n * alpha + bg[i]! * (1 - alpha)) as RGB;
function luminance(rgb: RGB) { const channels = rgb.map(n => { const c = n / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }); return channels[0]! * .2126 + channels[1]! * .7152 + channels[2]! * .0722; }
const ratio = (a: RGB, b: RGB) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
it('keeps primary white AAA on lowland and panels, including the brightest possible backdrop', () => {
  const white = token('text');
  expect(ratio(white, token('land-low'))).toBeGreaterThanOrEqual(7);
  const base = blend(token('sea-deep'), white, .94);
  const highlight = blend(white, base, .04);
  expect(ratio(white, highlight)).toBeGreaterThanOrEqual(7);
  expect(ratio(blend(white, highlight, .72), highlight)).toBeGreaterThanOrEqual(7);
});
it('keeps the four principal polity colors above 4.5:1 on deep sea', () => {
  for (const c of ['polity-main', 'polity-coral', 'polity-jade', 'polity-blue']) expect(ratio(token(c), token('sea-deep'))).toBeGreaterThanOrEqual(4.5);
});
