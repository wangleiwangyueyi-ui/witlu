import { readJSON, writeJSON, report } from './lib/upstream.mjs';
import { classifyMood, MOODS } from './lib/moods.mjs';
const events = readJSON('events').map(e => ({ ...e, ...classifyMood(e) }));
writeJSON('events', events);
writeJSON('moods', events.map(e => ({ id: e.id, year: e.year, title: e.title, mood: e.mood, rule: e.rule })));
report('moods-review.md', `# 情绪人工审校清单\n\n这是关键词初稿，并非审校结论。每条事件保留独立 ID；复用相同文字的记录不合并。近现代惨案规则优先且固定 solemn。全部 ${events.length} 条。修改规则后重跑 pnpm data。\n\n${MOODS.map(mood => {
  const group = events.filter(e => e.mood === mood).sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
  return `## ${mood}（${group.length}）\n\n${group.map(e => `- [ ] ${e.year} · ${e.title} · \`${e.id}\` · ${e.rule}`).join('\n')}`;
}).join('\n\n')}\n`);
console.log(`Classified ${events.length} events for manual mood review`);
