import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { parseHistoricalYear } from '@witlu/core/time';
import { GlassButton, GlassPanel } from './Glass';
import { useI18n } from '../i18n';
import { useShell } from '../state/shell';
import { River } from './River';
import { useChronicle } from '../store/chronicle';
import { resetTimeView, seekYear, stepYear, timeStore, toggleTime } from '../store/time';
export function TimeControls() {
    const { t } = useI18n(), { data } = useChronicle();
    const year = useShell(s => s.year), playing = useShell(s => s.playing), speed = useStore(timeStore, s => s.speed);
    const [input, setInput] = useState(String(year)), [error, setError] = useState(''), [matches, setMatches] = useState<{
        year: number;
        label: string;
    }[]>([]);
    useEffect(() => setInput(String(year)), [year]);
    const choose = (y: number) => { if (y < -403 || y > 2027) {
        setError('年份范围：前403—2027');
        return;
    } seekYear(y); resetTimeView(); setInput(String(y)); setError(''); setMatches([]); };
    return <div className="time-controls">
    <form className="year-form" onSubmit={e => { e.preventDefault(); if (!data)
        return; const found = parseHistoricalYear(input, data.eras); if (found.length === 1)
        choose(found[0]!.year);
    else {
        setMatches(found);
        setError(found.length ? '年号重名，请选择：' : '未识别年份或年号，请试「前221」「贞观三年」');
    } }}>
      <label htmlFor="history-year">{t('year')}</label><div className="year-entry"><input id="history-year" onFocus={() => timeStore.setState({ playing: false })} aria-label={t('year')} value={input} onChange={e => setInput(e.target.value)} autoComplete="off" spellCheck={false}/><button type="submit" aria-label="跳转年份">↵</button></div>
      {error && <div className="year-results" role="status">{error}{matches.map(m => <button key={m.label} type="button" onClick={() => choose(m.year)}>{m.label}</button>)}</div>}
    </form>
    <div className="playback"><GlassButton icon="previous" label={t('previous')} onClick={e => stepYear(e.shiftKey ? -10 : -1)}/><GlassButton icon={playing ? 'pause' : 'play'} label={playing ? t('pause') : t('play')} aria-pressed={playing} className="play-button" onClick={toggleTime}/><GlassButton icon="next" label={t('next')} onClick={e => stepYear(e.shiftKey ? 10 : 1)}/><select aria-label="播放倍速" value={speed} onChange={e => timeStore.setState({ speed: Number(e.target.value) })}>{[.5, 1, 2, 4].map(v => <option key={v} value={v}>{v}×</option>)}</select></div>
  </div>;
}
export function RollingYear() {
    const year = useShell(s => s.year);
    return <strong className="rolling-year" aria-label={`${year < 0 ? '前' : ''}${Math.abs(year)}年`}>{year < 0 && <small>前</small>}{String(Math.abs(year)).split('').map((digit, i) => <span className="digit-window" key={i}><span style={{ transform: `translateY(-${Number(digit) * 10}%)` }}>{'0123456789'.split('').map(d => <b key={d}>{d}</b>)}</span></span>)}</strong>;
}
export function TimeDock() {
    return <GlassPanel className="time-dock"><div className="time-dock-year"><RollingYear /><TimeControls /></div><div className="time-stream"><div className="time-stream-title"><span>历史长河</span><span>拖动 · 双指缩放 · 空格播放</span></div><River /></div></GlassPanel>;
}
export function TimeEffectControls() {
    const flow = useStore(timeStore, s => s.flow), flight = useStore(timeStore, s => s.flight), haptics = useStore(timeStore, s => s.haptics);
    return <div className="time-effects">{([['flow', '河面光点', flow], ['flight', '穿越云层', flight], ['haptics', '边界轻触', haptics]] as const).map(([key, label, value]) => <button key={key} role="switch" aria-checked={value} onClick={() => timeStore.setState({ [key]: !value })}>{label} {value ? '开' : '关'}</button>)}</div>;
}
