import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useWorld } from './World';
import { useShell } from '../state/shell';
import { useChapterSettings } from '../state/chapters';
import { useChronicleText } from '../i18n/chronicle';
import { historicalText, polityName } from '../i18n/history';
import { setPolityPreview, togglePolityFocus, usePolityFocus } from '../state/polity-focus';

export default function WorldLegend() {
  const { data, phase, tracks }=useWorld(), t=useChronicleText(),locale=useShell(s=>s.locale);
  const focus=usePolityFocus(s=>s.focus);
  const selected=focus?.snapshot===phase?.snapshot ? focus?.key : null;
  useEffect(()=>{
    if(usePolityFocus.getState().focus?.snapshot===phase?.snapshot)return;
    usePolityFocus.setState({focus:null});
    setPolityPreview(null);
  },[phase?.snapshot]);
  return <section className="world-legend" aria-label={t('legend')}><h2>{t('eraTracks')}</h2><p>{t('legendHint')}</p><div className="era-tracks">{tracks.map(({polity,occurrence,era})=>{
    const color=data?.colors.find(c=>c.snapshot===phase?.snapshot)?.colors.find(c=>c.polityId===polity.key)?.color;
    return <div className="legend-entry" key={polity.key} onMouseEnter={()=>setPolityPreview(polity.key)} onMouseLeave={()=>setPolityPreview(selected??null)} onFocus={()=>setPolityPreview(polity.key)} onBlur={()=>setPolityPreview(selected??null)} style={{'--track-color':color??'var(--polity-main)'} as CSSProperties}><button title={`${polityName(polity,locale,data)} · ${era ? locale==='en'?era.rulerEn:era.ruler : t('noRuler')} · ${Math.round(occurrence.areaKm2).toLocaleString()} km²`} aria-pressed={selected===polity.key} onClick={()=>togglePolityFocus(polity,phase!.snapshot,data)}><i/><span>{polityName(polity,locale,data)}{era&&<small className="legend-era">{locale==='en'?era.rulerEn:historicalText(era.ruler,locale,data)} · {historicalText(era.name,locale,data)} {era.ordinal}</small>}</span></button><button onClick={()=>useChapterSettings.getState().select(polity.key)} aria-label={`${t('dossier')} · ${polityName(polity,locale,data)}`}>↗</button></div>;
  })}</div></section>;
}
