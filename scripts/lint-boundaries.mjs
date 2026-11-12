import fs from 'node:fs';
import path from 'node:path';
import { ROOT, listFiles } from './lib/upstream.mjs';
import { hasHardcodedColor } from './lib/style-rules.mjs';
const failures = [];
for (const folder of ['core', 'engine', 'web/src']) {
  for (const file of listFiles(path.join(ROOT, 'packages', folder), '').filter(f => /\.(ts|tsx|css)$/.test(f) && !f.endsWith('.test.ts'))) {
    const text = fs.readFileSync(file, 'utf8');
    if (folder === 'core' && /\b(window|document|HTMLElement|HTMLCanvasElement|WebGL\w*|three)\b/.test(text)) failures.push(`Nonportable core: ${file}`);
    if (folder === 'engine' && /\b(window|document)\b/.test(text)) failures.push(`Direct platform access: ${file}`);
    if (folder === 'web/src' && !file.endsWith('tokens.css') && hasHardcodedColor(text)) failures.push(`Hardcoded color: ${file}`);
  }
}
const tokens = fs.readFileSync(path.join(ROOT, 'packages/web/src/styles/tokens.css'), 'utf8');
const allowed = new Set('0B1F3A 12345C 1C4F80 4F8FD6 6FB3FF 1A2E3B 26404F 3D5E72 9CC0D6 0F1E28 3C7FBF 0A1830 2C5A8C F2C46D FF8A7A 5FD3B5 7DB8FF B79CFF 8FB0D8 FFFFFF E8553E FFD27A 6CB4FF'.split(' '));
for (const [, hex] of tokens.matchAll(/#([a-f\d]{3,8})\b/gi)) if (!allowed.has(hex.toUpperCase())) failures.push(`Color outside PLAN 1.2: ${hex}`);
const withoutWhiteText = tokens.replace(/rgb\(255 255 255 \/ (?:72|50)%\)/g, '');
if (/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/i.test(withoutWhiteText)) failures.push('Color function outside PLAN 1.2 text tokens');
if (failures.length) throw new Error(failures.join('\n'));
console.log('Portable layer boundaries and color tokens verified');
