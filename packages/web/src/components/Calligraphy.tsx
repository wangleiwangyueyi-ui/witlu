import { useEffect, useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { useReducedEffects } from './Glass';
import { useChapterSettings } from '../state/chapters';
import { useShell } from '../state/shell';
interface Glyph { strokes: string[]; medians: [number, number][][] }
type Glyphs = Record<string, Glyph>;
let loaded: Promise<Glyphs> | undefined;

export function loadCalligraphy(): Promise<Glyphs> {
  loaded ??= fetch('/calligraphy/strokes.json').then(response => {
    if (!response.ok) throw new Error('Could not load calligraphy strokes');
    return response.json() as Promise<{characters: Glyphs}>;
  }).then(data => data.characters).catch(error => {
    loaded = undefined;
    throw error;
  });
  return loaded;
}

interface OpeningInk { glyphs?: Glyphs | undefined; animated: boolean; duration: number; delay: number; elapsed?: number | undefined }

export function Calligraphy({ text, label, opening }: { text: string; label: string; opening?: OpeningInk }) {
  const [glyphs, setGlyphs] = useState<Record<string, Glyph>>(); const id = useId().replaceAll(':', '');
  const reduced = useReducedEffects(), enabled = useChapterSettings(s => s.opening), replay = useChapterSettings(s => s.replay), quality = useShell(s => s.quality);
  const isOpening = opening !== undefined;
  useEffect(() => {
    if (isOpening) return;
    let active = true;
    void loadCalligraphy().then(g => { if (active) setGlyphs(g); }).catch(() => {});
    return () => { active = false; };
  }, [isOpening]);
  const strokes = isOpening ? opening.glyphs : glyphs;
  const count = [...text].reduce((n, c) => n + (strokes?.[c]?.strokes.length ?? 0), 0);
  const duration = opening?.duration ?? (quality === 'eco' ? 1000 : 1600);
  let cursor = 0;
  const held = opening?.elapsed;
  const animated = held === undefined && (opening?.animated ?? (enabled && !reduced)) && Boolean(strokes);
  return <span className="calligraphy" key={isOpening ? text : `${text}:${replay}`} role="img" aria-label={label} data-animated={animated} style={{ '--opening-duration': `${animated ? duration : 0}ms` } as CSSProperties}>
    <span className="calligraphy-glyphs" aria-hidden="true">{[...text].map((char, ci) => {
      const glyph = strokes?.[char]; if (!glyph) return <span className={isOpening && char === '·' ? 'calligraphy-separator' : undefined} key={ci}>{char}</span>;
      return <svg key={ci} viewBox="0 0 1024 1024"><g transform="translate(0 900) scale(1 -1)">{glyph.strokes.map((path, i) => {
        const median = glyph.medians[i]!, points = median.map(p => p.join(' ')).join(' L '), clip = `${id}-${ci}-${i}`, delay = (opening?.delay ?? 0) + cursor++ / Math.max(1, count) * duration;
        const strokeDuration = duration / Math.max(1, count) * 1.35;
        return <g key={i}><defs><clipPath id={clip}><path d={path}/></clipPath></defs><path className="calligraphy-stroke" d={`M ${points}`} clipPath={`url(#${clip})`} pathLength="1" style={{ animationDelay: `${delay}ms`, animationDuration: `${strokeDuration}ms`, strokeDashoffset: held === undefined ? undefined : 1 - Math.min(1, Math.max(0, (held-delay)/strokeDuration)) }}/></g>;
      })}</g></svg>;
    })}</span>{!isOpening && <span className="chapter-stamp calligraphy-stamp" aria-hidden="true">江山</span>}
  </span>;
}
