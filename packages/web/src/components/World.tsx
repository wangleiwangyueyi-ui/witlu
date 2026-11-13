import { storyLock } from '../state/weather';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { activeTracks, sameYearSites } from '@witlu/core/time';
import { GlassPanel, SegmentedControl, useReducedEffects } from './Glass';
import { useChronicle } from '../store/chronicle';
import { useShell } from '../state/shell';
import { useChapterSettings } from '../state/chapters';
import { useChronicleText, formatYear } from '../i18n/chronicle';
import { eventTitle, historicalText, polityName } from '../i18n/history';
import { seekYear, timeStore } from '../store/time';
import { frameSites, focusPolity } from '../state/camera-story';
import { terrainBridge } from '../state/terrain';
export function useWorld() {
  const { data } = useChronicle(), year = useShell(s => s.year);
  const phase = data?.phases.slice().reverse().find(p => p.from <= year);
  const tracks = data && phase ? activeTracks(year, phase, data.registry, data.eras, data.events) : [];
  return { data, year, phase, tracks };
}
export function WorldTracks({ mobile = false }: { mobile?: boolean }) {
  const { data, year, phase, tracks } = useWorld(), locale = useShell(s => s.locale), t = useChronicleText();
  const reduced=useReducedEffects();
  const [page, setPage] = useState(0), [selected, setSelected] = useState(''), strip = useRef<HTMLDivElement>(null);
  const group = Math.min(page, Math.max(0, Math.ceil(tracks.length / 4) - 1)), visible = mobile ? tracks : tracks.slice(group * 4, group * 4 + 4);
  const selectedKey = tracks.some(r => r.polity.key === selected) ? selected : tracks[0]?.polity.key ?? '';
  if (!data || !phase) return null;
  return <section className={`world-tracks ${mobile ? 'mobile-tracks' : ''}`} aria-label={t('chronology')} data-track-count={tracks.length}>
    <div className="tracks-heading"><h2>{t('chronology')}</h2><small>{formatYear(year, locale)}</small>{!mobile && tracks.length > 4 && <div><button aria-label={t('previousPage')} disabled={group === 0} onClick={() => setPage(group - 1)}>‹</button><span>{group + 1}/{Math.ceil(tracks.length / 4)}</span><button aria-label={t('nextPage')} disabled={(group + 1) * 4 >= tracks.length} onClick={() => setPage(group + 1)}>›</button></div>}</div>
    {mobile && <SegmentedControl label={t('eraTracks')} value={selectedKey} options={tracks.map(r => ({value:r.polity.key,label:polityName(r.polity,locale,data)}))} onChange={key => {setSelected(key);const i=tracks.findIndex(r=>r.polity.key===key);strip.current?.scrollTo({left:i*strip.current.clientWidth,behavior:reduced?'auto':'smooth'});}}/>}
    <div className="tracks-grid" ref={strip} style={{'--track-count':visible.length} as CSSProperties} onScroll={e=>{if(mobile){const i=Math.round(e.currentTarget.scrollLeft/e.currentTarget.clientWidth);setSelected(tracks[i]?.polity.key??'');}}}>
      {visible.map(({polity,occurrence,era,events}) => { const color=data.colors.find(c=>c.snapshot===phase.snapshot)?.colors.find(c=>c.polityId===polity.key)?.color;
        const same=events.filter(e=>e.year===year), nearby=events.filter(e=>e.year!==year).slice(0,Math.max(0,2-same.length)), entries=[...same,...nearby];
        return <GlassPanel className="world-track" key={polity.key} data-polity={polity.key} style={{'--track-color':color??'var(--polity-main)'} as CSSProperties}>
          <button className="track-title" onClick={()=>useChapterSettings.getState().select(polity.key)}>{polityName(polity,locale,data)}<small>{t('dossier')} ›</small></button>
          <p className="track-era">{era ? <>{locale==='en'?era.rulerEn:historicalText(era.ruler,locale,data)} · {historicalText(era.name,locale,data)} {era.ordinal}</> : t('noRuler')}</p>
          <p className="track-capital">{t('capital')} · {historicalText(occurrence.capitals.map(c=>c.name).join(' / ')||polity.seatZh||'—',locale,data)}</p>
          <div className="track-events">{entries.map(e=><button key={e.id} className="track-event" data-current={e.year===year} onClick={()=>{seekYear(e.year);frameSites(sameYearSites(e.year,data.events));}}><time>{formatYear(e.year,locale)}</time><span>{eventTitle(e,locale,data)}</span></button>)}{!entries.length&&<p>{t('noEvent')}</p>}</div>
        </GlassPanel>;
      })}
    </div>
  </section>;
}
export function WorldLegend() {
  const { data, phase, tracks }=useWorld(), t=useChronicleText(),locale=useShell(s=>s.locale);
  return <section className="world-legend" aria-label={t('legend')}><h2>{t('eraTracks')}</h2><p>{t('legendHint')}</p><div className="era-tracks">{tracks.map(({polity,occurrence,era})=>{
    const color=data?.colors.find(c=>c.snapshot===phase?.snapshot)?.colors.find(c=>c.polityId===polity.key)?.color;
    return <div className="legend-entry" key={polity.key} onMouseEnter={()=>terrainBridge.engine?.morph.focusPolity(polity.key)} onMouseLeave={()=>terrainBridge.engine?.morph.focusPolity(null)} onFocus={()=>terrainBridge.engine?.morph.focusPolity(polity.key)} onBlur={()=>terrainBridge.engine?.morph.focusPolity(null)} style={{'--track-color':color??'var(--polity-main)'} as CSSProperties}><button title={`${polityName(polity,locale,data)} · ${era ? locale==='en'?era.rulerEn:era.ruler : t('noRuler')} · ${Math.round(occurrence.areaKm2).toLocaleString()} km²`} onClick={()=>focusPolity(polity,phase!.snapshot)}><i/><span>{polityName(polity,locale,data)}{era&&<small className="legend-era">{locale==='en'?era.rulerEn:historicalText(era.ruler,locale,data)} · {historicalText(era.name,locale,data)} {era.ordinal}</small>}</span></button><button onClick={()=>useChapterSettings.getState().select(polity.key)} aria-label={`${t('dossier')} · ${polityName(polity,locale,data)}`}>↗</button></div>;
  })}</div></section>;
}
export function PolityDossier() {
  const { data, phase, tracks }=useWorld(), selected=useChapterSettings(s=>s.selected),t=useChronicleText(),locale=useShell(s=>s.locale),ref=useRef<HTMLDivElement>(null);
  const polity=data?.registry.find(p=>p.key===selected),track=tracks.find(r=>r.polity.key===selected);
  useEffect(()=>{if(!selected)return;const before=document.activeElement;ref.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')useChapterSettings.getState().select(null);if(e.key==='Tab'){const buttons=ref.current?.querySelectorAll<HTMLElement>('button,a');if(!buttons?.length)return;const first=buttons[0]!,last=buttons[buttons.length-1]!;if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);if(before instanceof HTMLElement)before.focus();};},[selected]);
  if(!polity)return null;
  const rulers = track?.spans.filter((e,i,a)=>i===0||e[3]!==a[i-1]?.[3])??[];
  return <div className="dossier-backdrop" onClick={()=>useChapterSettings.getState().select(null)}><div className="glass glass-panel polity-dossier" role="dialog" aria-modal="true" aria-label={t('dossier')} tabIndex={-1} ref={ref} onClick={e=>e.stopPropagation()}><button className="dossier-close" aria-label={t('close')} onClick={()=>useChapterSettings.getState().select(null)}>×</button><p className="eyebrow">{t('dossier')}</p><h2>{polityName(polity,locale,data)}</h2><p>{formatYear(polity.from,locale)} — {formatYear(polity.to,locale)}</p><p>{t('capital')} · {locale==='en'?polity.seatEn??polity.seatZh:historicalText(polity.seatZh??'—',locale,data)}</p><p>{locale==='en'?polity.summaryEn??polity.summaryZh:historicalText(polity.summaryZh??'',locale,data)}</p><button className="dossier-focus" onClick={()=>{if(phase)focusPolity(polity,phase.snapshot);useChapterSettings.getState().select(null);}}>{t('focus')}</button><h3>{t('lineage')}</h3><p>{locale==='en'?polity.rulersEn??polity.rulersZh:historicalText(polity.rulersZh??t('noRuler'),locale,data)}</p><ol className="ruler-lineage">{rulers.map((r,i)=><li key={`${r[0]}:${r[3]}`}><time>{formatYear(r[0],locale)}</time><strong>{locale==='en'?r[4]:historicalText(r[3],locale,data)}</strong><span>{historicalText(r[1],locale,data)}</span>{i===rulers.length-1&&<small>{t('reignYears')}</small>}</li>)}</ol><p className="dossier-source">{t('source')} · jiangshan-map / CHGIS · {t('approximation')}</p></div></div>;
}
export function ResonanceDriver() {
  const {data,year}=useWorld(), enabled=useChapterSettings(s=>s.resonance), reduced=useReducedEffects();
  useEffect(()=>{const engine=terrainBridge.engine;if(!engine||!data)return;engine.resonance.enabled=enabled;if(!enabled||reduced)return;const timer=setTimeout(()=>{if(storyLock.active || timeStore.getState().scrubbing || Math.abs(timeStore.getState().velocity)>0)return;const sites=sameYearSites(year,data.events);if(sites.length>1){engine.resonance.trigger(sites);frameSites(sites,800);}},300);return()=>clearTimeout(timer);},[data,year,enabled,reduced]);
  return null;
}
