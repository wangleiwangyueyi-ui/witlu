import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib/upstream.mjs';
const cache = path.join(ROOT, '.cache/fonts'), out = path.join(ROOT, 'packages/web/public/fonts');
fs.mkdirSync(cache, { recursive: true }); fs.mkdirSync(out, { recursive: true });
const sourceURL = 'https://raw.githubusercontent.com/adobe-fonts/source-han-serif/release/OTF/SimplifiedChinese/SourceHanSerifSC-SemiBold.otf';
const source = process.argv.includes('--source') ? path.resolve(process.argv[process.argv.indexOf('--source') + 1]) : path.join(cache, 'SourceHanSerifSC-SemiBold.otf');
async function download(url, target) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font download ${response.status}: ${url}`);
  fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
}
if (!fs.existsSync(source)) await download(sourceURL, source);
const license = path.join(out, 'OFL-SourceHanSerif.txt');
if (!fs.existsSync(license)) await download('https://raw.githubusercontent.com/adobe-fonts/source-han-serif/release/LICENSE.txt', license);
let text = '0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz—·，。江山';
const messages = fs.readFileSync(path.join(ROOT, 'packages/web/src/i18n/messages.ts'), 'utf8');
for (const match of messages.matchAll(/\b(?:brand|chapterName|intro|aboutTitle|wei|shu|wu):\s*'([^']+)'/g)) text += match[1];
const dynastyFile = path.join(ROOT, 'packages/web/public/data/dynasties.json');
if (fs.existsSync(dynastyFile)) for (const d of JSON.parse(fs.readFileSync(dynastyFile, 'utf8'))) text += d.title + d.badge;
const dictionary = path.join(ROOT, 'packages/web/public/data/i18n.json');
if (fs.existsSync(dictionary)) { const conversion = JSON.parse(fs.readFileSync(dictionary, 'utf8')).hant.CHAR_S2T; text += [...text].map(c => conversion[c] ?? c).join(''); }
const chars = [...new Set(text.match(/[\p{Script=Han}\p{Punctuation}A-Za-z0-9 ]/gu))].sort().join('');
const textFile = path.join(cache, 'title-characters.txt'); fs.writeFileSync(textFile, chars);
const env = { ...process.env, PYTHONPATH: [path.join(ROOT, '.cache/font-tools'), process.env.PYTHONPATH].filter(Boolean).join(path.delimiter) };
const result = spawnSync(process.env.WITLU_PYTHON ?? 'python', [path.join(ROOT, 'scripts/subset-font.py'), source, textFile, path.join(out, 'witlu-song-semibold.woff2')], { env, encoding: 'utf8' });
if (result.status !== 0) throw new Error(`Install Python fonttools[woff] and brotli (see docs/FONTS.md).\n${result.stderr}`);
const meta = { sourceURL, sourceSHA256: createHash('sha256').update(fs.readFileSync(source)).digest('hex'), characters: chars.length, bytes: fs.statSync(path.join(out, 'witlu-song-semibold.woff2')).size, family: 'Witlu Song', license: 'SIL OFL 1.1; subset renamed to avoid reserved font names' };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(meta);
