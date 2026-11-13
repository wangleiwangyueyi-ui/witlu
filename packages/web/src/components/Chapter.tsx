import { eraAt, yearToIndex } from '@witlu/core/time';
import { GlassPanel } from './Glass';
import { useI18n } from '../i18n';
import { useShell } from '../state/shell';
import { Credits } from './Credits';
import { River } from './River';
import { RollingYear, TimeControls } from './TimeDock';
import { useChronicle } from '../store/chronicle';
import { resetTimeView, seekYear } from '../store/time';
export function ChapterHeading({ mobile = false }: {
    mobile?: boolean;
}) {
    const { t, locale } = useI18n(), { data } = useChronicle(), year = useShell(s => s.year);
    const dynasty = data?.dynasties.slice().reverse().find(d => d.fromYear <= year && d.toYear >= year);
    const title = dynasty?.title ?? t('chapterName');
    return <div className={`chapter-heading ${mobile ? 'mobile-heading' : ''}`}><p className="eyebrow">历史章节 · {dynasty?.title}</p><div className="chapter-title">{mobile && <RollingYear />}<h1>{locale === 'zh-Hant' && title === '三国' ? '三國' : title}</h1><span className="chapter-stamp" aria-hidden="true">江山</span></div>{!mobile && <p className="chapter-range">{dynasty?.fromYear} — {dynasty?.toYear}</p>}</div>;
}
export function ChapterContent({ mobile = false }: {
    mobile?: boolean;
}) {
    const { data, error } = useChronicle(), year = useShell(s => s.year), { locale } = useI18n();
    const phase = data?.phases.slice().reverse().find(p => p.from <= year), dynasty = data?.dynasties.find(d => d.key === phase?.dynastyKey);
    const eras = data ? [{ regime: '主纪年', value: eraAt(yearToIndex(year), data.eras.main) }, ...data.eras.regional.map(r => ({ regime: r.regime, value: eraAt(yearToIndex(year), r.spans, r.until) }))].filter(r => r.value) : [];
    const events = data?.events.filter(e => e.kind === 'milestone' && Math.abs(e.year - year) < 8).sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year)).slice(0, 6) ?? [];
    return <div className="chapter-content">
    {mobile && <><River compact/><TimeControls /></>}
    <nav className="chronicle-breadcrumb" aria-label="历史位置"><span>中国历代</span><span>›</span><button onClick={() => { if (dynasty) {
        seekYear(dynasty.fromYear);
        resetTimeView();
    } }}>{dynasty?.title}</button><span>› {year < 0 ? `前${-year}` : year}年</span></nav>
    <section><h2>此刻天下 · 君主与年号</h2><div className="era-tracks">{eras.map(r => <article key={r.regime}><strong>{r.regime}</strong><span>{locale === 'en' ? r.value!.rulerEn : r.value!.ruler}</span><span>{r.value!.name}{r.value!.ordinal}年</span></article>)}</div></section>
    <section className="chapter-intro"><h2>时代概述</h2><p>{phase?.overview ?? dynasty?.summary}</p></section>
    <section className="chronicle-section"><h2>附近大事</h2>{events.map(e => <button className="chronicle-event" key={e.id} onClick={() => seekYear(e.year)}><time>{e.year < 0 ? `前${-e.year}` : e.year}</time><span>{e.title}</span></button>)}</section>
    {error && <p role="alert">{error}</p>}<Credits />
  </div>;
}
export function ChapterPanel() { return <GlassPanel className="chapter-panel"><ChapterHeading /><div className="chapter-scroll"><ChapterContent /></div></GlassPanel>; }
