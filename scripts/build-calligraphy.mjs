import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const commit = 'bddc96d41bef78427ed0e034e9f7e31d71fd1b92';
const root = path.resolve(import.meta.dirname, '..');
const asset = path.join(root, 'assets/calligraphy');
await fs.mkdir(asset, { recursive: true });
const dynasties = JSON.parse(await fs.readFile(path.join(root, 'packages/web/public/data/dynasties.json'), 'utf8'));
const translations = JSON.parse(await fs.readFile(path.join(root, 'packages/web/public/data/i18n.json'), 'utf8'));
const titles = dynasties.map(d => d.title);
const chars = new Set(titles.flatMap(t => [...t, ...[...t].map(c => translations.hant.CHAR_S2T[c] ?? c)]).filter(c => /\p{Script=Han}/u.test(c)));
const subsetPath = path.join(asset, 'strokes.json');
let subset;
try { subset = JSON.parse(await fs.readFile(subsetPath, 'utf8')); } catch { /* First build downloads only the pinned source. */ }
if (!subset || subset.commit !== commit || [...chars].some(c => !subset.characters[c])) {
  const response = await fetch(`https://raw.githubusercontent.com/skishore/makemeahanzi/${commit}/graphics.txt`);
  if (!response.ok) throw new Error(`Make Me a Hanzi: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const characters = Object.fromEntries(bytes.toString('utf8').split('\n').filter(Boolean).map(s => JSON.parse(s)).filter(g => chars.has(g.character)).map(g => [g.character, { strokes: g.strokes, medians: g.medians }]));
  for (const c of chars) if (!characters[c]) throw new Error(`Missing title glyph: ${c}`);
  subset = { source: 'https://github.com/skishore/makemeahanzi', commit, sourceSha256: createHash('sha256').update(bytes).digest('hex'), license: 'Arphic Public License', characters };
  await fs.writeFile(subsetPath, JSON.stringify(subset) + '\n');
  const copying = await fetch(`https://raw.githubusercontent.com/skishore/makemeahanzi/${commit}/COPYING`);
  if (!copying.ok) throw new Error('Cannot read pinned COPYING');
  await fs.writeFile(path.join(asset, 'COPYING'), await copying.text());
}
// Keep the complete license alongside the distributable subset, including on cached builds.
const licensePath = path.join(asset,'ARPHIC-LICENSE.txt');
try { await fs.access(licensePath); } catch {
  const listingResponse = await fetch(`https://api.github.com/repos/skishore/makemeahanzi/git/trees/${commit}?recursive=1`);
  if(!listingResponse.ok) throw new Error('Cannot read pinned Arphic license tree');
  const listing = await listingResponse.json();
  const entry = listing.tree.find(e=>e.type==='blob' && e.path.startsWith('APL/english/') && /license|licence|arphic/i.test(e.path));
  if(!entry) throw new Error('Pinned Arphic license not found');
  const r=await fetch(`https://raw.githubusercontent.com/skishore/makemeahanzi/${commit}/${entry.path}`);
  if(!r.ok) throw new Error('Cannot read Arphic license');
  await fs.writeFile(licensePath,await r.text());
}
const output = path.join(root, 'packages/web/public/calligraphy');
await fs.mkdir(output, { recursive: true });
for (const file of await fs.readdir(asset)) await fs.copyFile(path.join(asset, file), path.join(output, file));
console.log(`Calligraphy: ${Object.keys(subset.characters).length} title glyphs, ${commit}, ${(await fs.stat(subsetPath)).size} bytes`);
