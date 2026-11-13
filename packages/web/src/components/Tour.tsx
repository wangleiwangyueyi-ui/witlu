import { useEffect } from 'react';
import { useTour } from '../store/tour';
import { useChronicle } from '../store/chronicle';
import { useChronicleText, formatYear } from '../i18n/chronicle';
import { chapterName, eventTitle, historicalText } from '../i18n/history';
import { useShell } from '../state/shell';
import { useChapterSettings } from '../state/chapters';
export function TourDriver() {
  const running = useTour(s => s.running), index = useTour(s => s.index);
  useEffect(() => { if (!running) return; const id = setTimeout(() => { if (!document.hidden) useTour.getState().advance(); else useTour.getState().pause(); }, 5000); return () => clearTimeout(id); }, [running, index]);
  return null;
}
export function TourControls() {
  const { data } = useChronicle(), t = useChronicleText(), locale = useShell(s => s.locale), year = useShell(s => s.year);
  const s = useTour(), stop = s.stops[s.index], chapter = data?.dynasties.find(d => d.key === stop?.chapter);
  const event = data?.events.find(e => e.id === stop?.event), phase = data?.phases.find(p => p.snapshot === stop?.phase);
  return <section className="tour-controls" aria-label={t('guide')}><div className="tour-buttons">
    {!s.active ? <button disabled={!data} onClick={() => { if (data) s.start(data, data.phases.slice().reverse().find(p => p.from <= year)?.dynastyKey); }}>{t('startGuide')}</button> : <><button onClick={s.running ? s.pause : s.resume}>{t(s.running ? 'pauseGuide' : 'resumeGuide')}</button><button onClick={s.stop}>{t('stopGuide')}</button><button onClick={() => s.skip(-1)} aria-label={t('previousChapter')}>‹</button><button onClick={() => s.skip(1)} aria-label={t('nextChapter')}>›</button></>}
  </div>{s.active && stop && <div className="tour-caption" role="status"><strong>{chapter && chapterName(chapter, locale, data)} · {t(stop.kind === 'phase' ? 'phaseStep' : stop.kind)} · {formatYear(stop.year, locale)}</strong><p>{event ? eventTitle(event, locale, data) : phase ? historicalText(phase.overview, locale, data) : chapter ? locale === 'en' ? data?.translations.en.dynasties[chapter.key]?.desc ?? chapter.summary : historicalText(chapter.summary, locale, data) : ''}</p><small>{s.index + 1} / {s.stops.length}</small></div>}</section>;
}
export function ChapterEffectControls() {
  const s = useChapterSettings(), t = useChronicleText();
  return <div className="time-effects"><button role="switch" aria-checked={s.opening} onClick={() => s.toggle('opening')}>{t('opening')}</button><button role="switch" aria-checked={s.resonance} onClick={() => s.toggle('resonance')}>{t('sameYear')}</button><button onClick={s.replayOpening}>{t('replayOpening')}</button></div>;
}
