import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { sameYearSites } from '@witlu/core/time';
import { Sources } from './Sources';
import { GlassPanel, SegmentedControl, useReducedEffects } from './Glass';
import { useWorld } from './World';
import { useShell } from '../state/shell';
import { useChapterSettings } from '../state/chapters';
import { useChronicleText, formatYear } from '../i18n/chronicle';
import { eventTitle, historicalText, polityName } from '../i18n/history';
import { seekYear } from '../store/time';
import { frameSites } from '../state/camera-story';

export function WorldTracks({ mobile = false, summary = false }: { mobile?: boolean; summary?: boolean }) {
  const { data, year, phase, tracks } = useWorld(), locale = useShell(s => s.locale), t = useChronicleText();
  const reduced=useReducedEffects();
  const [page, setPage] = useState(0), [selected, setSelected] = useState(''), strip = useRef<HTMLDivElement>(null);
  const group = Math.min(page, Math.max(0, Math.ceil(tracks.length / 4) - 1)), visible = mobile || summary ? tracks : tracks.slice(group * 4, group * 4 + 4);
  const selectedKey = tracks.some(r => r.polity.key === selected) ? selected : tracks[0]?.polity.key ?? '';
  if (!data || !phase) return null;
  return <section className={`world-tracks ${mobile ? 'mobile-tracks' : ''}`} aria-label={t('chronology')} data-track-count={tracks.length}>
    <div className="tracks-heading"><h2>{summary?(locale==='en'?'The world now':'此刻天下'):t('chronology')}</h2>{!summary&&<small>{formatYear(year, locale)}</small>}{!mobile && !summary && tracks.length > 4 && <div><button aria-label={t('previousPage')} disabled={group === 0} onClick={() => setPage(group - 1)}>‹</button><span>{group + 1}/{Math.ceil(tracks.length / 4)}</span><button aria-label={t('nextPage')} disabled={(group + 1) * 4 >= tracks.length} onClick={() => setPage(group + 1)}>›</button></div>}</div>
    {mobile && <SegmentedControl label={t('eraTracks')} value={selectedKey} options={tracks.map(r => ({value:r.polity.key,label:polityName(r.polity,locale,data)}))} onChange={key => {setSelected(key);const i=tracks.findIndex(r=>r.polity.key===key);strip.current?.scrollTo({left:i*strip.current.clientWidth,behavior:reduced?'auto':'smooth'});}}/>}
    <div className="tracks-grid" ref={strip} style={{'--track-count':visible.length} as CSSProperties} onScroll={e=>{if(mobile){const i=Math.round(e.currentTarget.scrollLeft/e.currentTarget.clientWidth);setSelected(tracks[i]?.polity.key??'');}}}>
      {visible.map(({polity,occurrence,era,events}) => { const color=data.colors.find(c=>c.snapshot===phase.snapshot)?.colors.find(c=>c.polityId===polity.key)?.color;
        const same=events.filter(e=>e.year===year), nearby=events.filter(e=>e.year!==year).slice(0,Math.max(0,2-same.length)), entries=[...same,...nearby];
        return <GlassPanel className="world-track" key={polity.key} data-polity={polity.key} style={{'--track-color':color??'var(--polity-main)'} as CSSProperties}>
          <button className="track-title" onClick={()=>useChapterSettings.getState().select(polity.key)}>{polityName(polity,locale,data)}<small>{t('dossier')} ›</small></button>
          <p className="track-era">{era ? <>{locale==='en'?era.rulerEn:historicalText(era.ruler,locale,data)} · {historicalText(era.name,locale,data)} {era.ordinal}</> : t('noRuler')}</p>
          <p className="track-capital">{t('capital')} · {historicalText(occurrence.capitals.map(c=>c.name).join(' / ')||polity.seatZh||'—',locale,data)}</p>
          {!summary&&<div className="track-events">{entries.map(e=><div key={e.id}><button className="track-event" data-current={e.year===year} onClick={()=>{seekYear(e.year);frameSites(sameYearSites(e.year,data.events));}}><time>{formatYear(e.year,locale)}</time><span>{eventTitle(e,locale,data)}</span></button><Sources event={e}/></div>)}{!entries.length&&<p>{t('noEvent')}</p>}</div>}
        </GlassPanel>;
      })}
    </div>
  </section>;
}
