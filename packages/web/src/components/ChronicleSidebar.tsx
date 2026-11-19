import '../styles/chronicle-sidebar.css';
import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { eraAt, yearToIndex } from '@witlu/core/time';
import type { ActiveTrack, ChronicleEvent } from '@witlu/core/time';
import { useWorld } from './World';
import { Sources } from './Sources';
import { useShell } from '../state/shell';
import { usePlaces } from '../state/places';
import { togglePolityFocus, usePolityFocus } from '../state/polity-focus';
import { useChapterSettings } from '../state/chapters';
import { chapterName, eventTitle, historicalText, polityName, reignText } from '../i18n/history';
import { formatYear, useChronicleText } from '../i18n/chronicle';
import { seekYear } from '../store/time';

export default function ChronicleSidebar() {
  const {data,phase,year,tracks} = useWorld(), locale = useShell(s=>s.locale), t = useChronicleText();
  const focus = usePolityFocus(s=>s.focus), placeOpen = usePlaces(s=>Boolean(s.selected));
  const [filter,setFilter] = useState<{dynasty: string; key: string} | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const dynasty = data?.dynasties.find(d=>d.key===phase?.dynastyKey);
  const candidates = data?.events.filter(e=>(e.kind==='milestone' && e.dynastyKey===dynasty?.key) || e.year===year) ?? [];
  const style = data?.colors.find(row=>row.snapshot===phase?.snapshot)?.colors;
  const filterKey = filter?.dynasty===dynasty?.key ? filter?.key : null;
  const regimes = new Set(candidates.map(event=>event.regime));
  const choices = data?.registry.filter(polity=>regimes.has(polity.key) && polity.occurrences.some(o=>o.role!=='neighbor')) ?? [];
  const trackOrder = new Map(tracks.map((track,i)=>[track.polity.key,i]));
  const rank = (event: ChronicleEvent) => trackOrder.get(event.regime??'')??tracks.length;
  const events = candidates.filter(e=>!filterKey||e.regime===filterKey)
    .sort((a,b)=>a.year-b.year || rank(a)-rank(b) || (rank(a)<tracks.length ? b.importance-a.importance : 0));
  useLayoutEffect(() => {
    const node = list.current, current = node?.querySelector<HTMLElement>('[data-current=true]');
    if (!node || !current) return;
    const parent = node.getBoundingClientRect(), row = current.getBoundingClientRect();
    if (row.top < parent.top || row.bottom > parent.bottom)
      node.scrollTop += row.top - parent.top - 5;
  },[year,filterKey,dynasty?.key,events.length]);
  if (!data || !phase || !dynasty) return null;

  const primaryEra = eraAt(yearToIndex(year), data.eras.main);
  const dated = formatYear(year, locale);
  const heading = locale!=='en' && year>0 ? `公元 ${year} 年` : dated;
  const seat = locale==='en' ? data.translations.en.dynasties[dynasty.key]?.capital || dynasty.seat : historicalText(dynasty.seat,locale,data).replaceAll(/\s*\/\s*/g,'/');
  const boundaries = new Set(data.phases.filter((p,i)=>p.snapshot!==data.phases[i-1]?.snapshot).map(p=>p.from));
  const changed = (e: ChronicleEvent) => e.isMapChange || boundaries.has(e.year);
  const styleFor = (key: string | null, snapshot?: string | null) => {
    const observed = snapshot && data.colors.find(row=>row.snapshot===snapshot)?.colors.find(row=>row.polityId===key);
    return {'--track-color':observed ? observed.color : style?.find(row=>row.polityId===key)?.color??'var(--neighbor)'} as CSSProperties;
  };
  const era = (track: ActiveTrack) => track.era ? reignText(track.era,locale,data) : t('noRuler');

  return <div className="chronicle-content" inert={placeOpen}>
    <header className="chronicle-meta">
      <p className="chronicle-reign">{heading}{primaryEra && ` · ${reignText(primaryEra,locale,data)}`}</p>
      <div className="chronicle-dynasty"><h1>{chapterName(dynasty,locale,data)}</h1>{' '}{dynasty.fromYear<0 ? formatYear(dynasty.fromYear,locale) : dynasty.fromYear}—{dynasty.toYear}{' · '}{t('capital')} {seat}</div>
    </header>
    <section className="world-tracks" aria-label={t('chronology')} data-track-count={tracks.length}>
      <h2>{t('worldNow')}</h2>
      <div className="tracks-grid">
        {tracks.map(track=>{
          const {polity,occurrence} = track;
          const latest = track.events.find(e=>e.year<=year && e.kind!=='journey');
          const active = focus?.snapshot===phase.snapshot && focus.key===polity.key;
          return <article className="world-track" key={polity.key} data-polity={polity.key} style={styleFor(polity.key)}>
            <button type="button" className="polity-focus" aria-pressed={active} onClick={()=>togglePolityFocus(polity,phase.snapshot,data)}>
              <strong>{polityName(polity,locale,data)}</strong>
              <span>{era(track)}</span>
              <span>{t('capital')} · {historicalText(occurrence.capitals.map(c=>c.name).join(' / ')||polity.seatZh||'—',locale,data)}</span>
              {latest ? <span className="polity-recent">{latest.year!==year&&`${formatYear(latest.year,locale)} · `}{eventTitle(latest,locale,data)}</span> : <span className="polity-recent">{t('noEvent')}</span>}
            </button>
            <button type="button" className="track-title" aria-label={`${t('dossier')} · ${polityName(polity,locale,data)}`} onClick={()=>useChapterSettings.getState().select(polity.key)}>{t('dossier')} ›</button>
          </article>;
        })}
      </div>
    </section>
    <section className="chronicle-section">
      <h2>{t('dynasticEvents')}</h2>
      {choices.length>0&&<div className="event-filters" role="group" aria-label={t('filterPolities')}>
        <button type="button" aria-pressed={!filterKey} onClick={()=>setFilter(null)}>{t('allPolities')}</button>
        {choices.map(polity=><button type="button" key={polity.key} aria-pressed={filterKey===polity.key} style={styleFor(polity.key)} onClick={()=>setFilter(filterKey===polity.key?null:{dynasty:dynasty.key,key:polity.key})}><i/>{polityName(polity,locale,data)}</button>)}
      </div>}
      <div className="chronicle-events" ref={list}>
        {events.map(e=><div className="chronicle-row" key={e.id}>
          <button type="button" className="chronicle-event" style={styleFor(e.regime,e.snapshot)} data-current={e.year===year} data-year={e.year} data-regime={e.regime} aria-current={e.year===year?'date':undefined} onClick={()=>seekYear(e.year)}>
            <i className="event-dot" aria-hidden="true"/><time>{formatYear(e.year,locale)}</time>
            <span>{eventTitle(e,locale,data)}</span>
            {changed(e)&&<svg className="event-map-change" role="img" aria-label={t('mapChange')} viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M2 5 6 2l4 2 4-2v10l-4 2-4-2-4 2ZM6 2v10m4-8v10"/></svg>}
          </button>
          <Sources event={e} hideEmpty/>
        </div>)}
        {!events.length&&<p>{t('noEvent')}</p>}
      </div>
    </section>
  </div>;
}
