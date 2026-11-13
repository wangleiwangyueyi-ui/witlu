import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { parseHistoricalYear } from '@witlu/core/time';
import { GlassButton, GlassPanel } from './Glass';
import { useI18n } from '../i18n';
import { useShell } from '../state/shell';
import { useChronicleText, formatYear } from '../i18n/chronicle';
import { River } from './River';
import { useChronicle } from '../store/chronicle';
import { resetTimeView, seekYear, stepYear, timeStore, toggleTime } from '../store/time';
export function TimeControls() {
    const ct=useChronicleText();
    const { t, locale } = useI18n(), { data } = useChronicle();
    const year = useShell(s => s.year), playing = useShell(s => s.playing), speed = useStore(timeStore, s => s.speed);
    const [input, setInput] = useState(String(year)), [error, setError] = useState(''), [matches, setMatches] = useState<{
        year: number;
        label: string;
    }[]>([]);
    useEffect(() => setInput(String(year)), [year]);
    const choose = (y: number) => { if (y < -403 || y > 2027) {
        setError(ct('yearRange'));
        return;
    } seekYear(y); resetTimeView(); setInput(String(y)); setError(''); setMatches([]); };
    return <div className="time-controls">
    <form className="year-form" onSubmit={e => { e.preventDefault(); if (!data)
        return; const hantToHans=new Map(Object.entries(data.translations.hant.CHAR_S2T).map(([s,t])=>[t,s])); const normalized=locale==='zh-Hant'?[...input].map(c=>hantToHans.get(c)??c).join(''):input; const found = parseHistoricalYear(normalized, data.eras); if (found.length === 1)
        choose(found[0]!.year);
    else {
        setMatches(found);
        setError(ct(found.length ? 'ambiguousEra' : 'invalidYear'));
    } }}>
      <label htmlFor="history-year">{t('year')}</label><div className="year-entry"><input id="history-year" onFocus={() => timeStore.setState({ playing: false })} aria-label={t('year')} value={input} onChange={e => setInput(e.target.value)} autoComplete="off" spellCheck={false}/><button type="submit" aria-label={ct('jumpYear')}>↵</button></div>
      {error && <div className="year-results" role="status">{error}{matches.map(m => <button key={m.label} type="button" onClick={() => choose(m.year)}>{m.label}</button>)}</div>}
    </form>
    <div className="playback"><GlassButton icon="previous" label={t('previous')} onClick={e => stepYear(e.shiftKey ? -10 : -1)}/><GlassButton icon={playing ? 'pause' : 'play'} label={playing ? t('pause') : t('play')} aria-pressed={playing} className="play-button" onClick={toggleTime}/><GlassButton icon="next" label={t('next')} onClick={e => stepYear(e.shiftKey ? 10 : 1)}/><select aria-label={ct('speed')} value={speed} onChange={e => timeStore.setState({ speed: Number(e.target.value) })}>{[.5, 1, 2, 4].map(v => <option key={v} value={v}>{v}×</option>)}</select></div>
  </div>;
}
export function RollingYear() {
    const year = useShell(s => s.year),locale=useShell(s=>s.locale);
    return <strong className="rolling-year" aria-label={formatYear(year,locale)}>{year < 0 && <small>{locale==='en'?'BCE':'前'}</small>}{String(Math.abs(year)).split('').map((digit, i) => <span className="digit-window" key={i}><span style={{ transform: `translateY(-${Number(digit) * 10}%)` }}>{'0123456789'.split('').map(d => <b key={d}>{d}</b>)}</span></span>)}</strong>;
}
export function TimeDock() {
    const ct=useChronicleText();
    return <GlassPanel className="time-dock"><div className="time-dock-year"><RollingYear /><TimeControls /></div><div className="time-stream"><div className="time-stream-title"><span>{ct('river')}</span><span>{ct('riverHint')}</span></div><River /></div></GlassPanel>;
}
export function TimeEffectControls() {
    const ct=useChronicleText();
    const flow = useStore(timeStore, s => s.flow), flight = useStore(timeStore, s => s.flight), haptics = useStore(timeStore, s => s.haptics);
    return <div className="time-effects">{([['flow', ct('flow'), flow], ['flight', ct('flight'), flight], ['haptics', ct('haptics'), haptics]] as const).map(([key, label, value]) => <button key={key} role="switch" aria-checked={value} onClick={() => timeStore.setState({ [key]: !value })}>{label} {ct(value ? 'on' : 'off')}</button>)}</div>;
}
