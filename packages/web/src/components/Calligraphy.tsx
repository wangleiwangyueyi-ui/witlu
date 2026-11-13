import { useEffect, useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { useReducedEffects } from './Glass';
import { useChapterSettings } from '../state/chapters';
import { useShell } from '../state/shell';
interface Glyph { strokes: string[]; medians: [number, number][][] }
let loaded: Promise<Record<string, Glyph>> | undefined;
export function Calligraphy({ text, label }: { text: string; label: string }) {
  const [glyphs, setGlyphs] = useState<Record<string, Glyph>>(); const id = useId().replaceAll(':', '');
  const reduced = useReducedEffects(), enabled = useChapterSettings(s => s.opening), replay = useChapterSettings(s => s.replay), quality = useShell(s => s.quality);
  useEffect(() => { let active = true; loaded ??= fetch('/calligraphy/strokes.json').then(r => { if (!r.ok) throw new Error('strokes'); return r.json(); }).then(d => d.characters); loaded.then(g => { if (active) setGlyphs(g); }).catch(() => { loaded = undefined; }); return () => { active = false; }; }, []);
  const count = [...text].reduce((n, c) => n + (glyphs?.[c]?.strokes.length ?? 0), 0), duration = quality === 'eco' ? 1000 : 1600;
  let cursor = 0;
  const animated = enabled && !reduced && Boolean(glyphs);
  return <span className="calligraphy" key={`${text}:${replay}`} role="img" aria-label={label} data-animated={animated} style={{ '--opening-duration': `${animated ? duration : 0}ms` } as CSSProperties}>
    <span className="calligraphy-glyphs" aria-hidden="true">{[...text].map((char, ci) => {
      const glyph = glyphs?.[char]; if (!glyph) return <span key={ci}>{char}</span>;
      return <svg key={ci} viewBox="0 0 1024 1024"><g transform="translate(0 900) scale(1 -1)">{glyph.strokes.map((path, i) => {
        const median = glyph.medians[i]!, points = median.map(p => p.join(' ')).join(' L '), clip = `${id}-${ci}-${i}`, delay = cursor++ / Math.max(1, count) * duration;
        return <g key={i}><defs><clipPath id={clip}><path d={path}/></clipPath></defs><path className="calligraphy-stroke" d={`M ${points}`} clipPath={`url(#${clip})`} pathLength="1" style={{ animationDelay: `${delay}ms`, animationDuration: `${duration / Math.max(1, count) * 1.35}ms` }}/></g>;
      })}</g></svg>;
    })}</span><span className="chapter-stamp calligraphy-stamp" aria-hidden="true">江山</span>
  </span>;
}
