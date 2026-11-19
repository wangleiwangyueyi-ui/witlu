import {useEffect,useRef} from 'react';
import {useWorld} from './World';
import {useShell} from '../state/shell';
import {useChapterSettings} from '../state/chapters';
import {useChronicleText,formatYear} from '../i18n/chronicle';
import {historicalText,polityName} from '../i18n/history';
import {focusPolity} from '../state/camera-story';

export function PolityDossier() {
  const { data, phase, tracks }=useWorld(), selected=useChapterSettings(s=>s.selected),t=useChronicleText(),locale=useShell(s=>s.locale),ref=useRef<HTMLDivElement>(null);
  const polity=data?.registry.find(p=>p.key===selected),track=tracks.find(r=>r.polity.key===selected);
  useEffect(()=>{if(!selected)return;const before=document.activeElement;ref.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')useChapterSettings.getState().select(null);if(e.key==='Tab'){const buttons=ref.current?.querySelectorAll<HTMLElement>('button,a');if(!buttons?.length)return;const first=buttons[0]!,last=buttons[buttons.length-1]!;if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);if(before instanceof HTMLElement)before.focus();};},[selected]);
  if(!polity)return null;
  const rulers = track?.spans.filter((e,i,a)=>i===0||e[3]!==a[i-1]?.[3])??[];
  return <div className="dossier-backdrop" onClick={()=>useChapterSettings.getState().select(null)}><div className="glass glass-panel polity-dossier" role="dialog" aria-modal="true" aria-label={t('dossier')} tabIndex={-1} ref={ref} onClick={e=>e.stopPropagation()}><button className="dossier-close" aria-label={t('close')} onClick={()=>useChapterSettings.getState().select(null)}>×</button><p className="eyebrow">{t('dossier')}</p><h2>{polityName(polity,locale,data)}</h2><p>{formatYear(polity.from,locale)} — {formatYear(polity.to,locale)}</p><p>{t('capital')} · {locale==='en'?polity.seatEn??polity.seatZh:historicalText(polity.seatZh??'—',locale,data)}</p><p>{locale==='en'?polity.summaryEn??polity.summaryZh:historicalText(polity.summaryZh??'',locale,data)}</p><button className="dossier-focus" onClick={()=>{if(phase)focusPolity(polity,phase.snapshot);useChapterSettings.getState().select(null);}}>{t('focus')}</button><h3>{t('lineage')}</h3><p>{locale==='en'?polity.rulersEn??polity.rulersZh:historicalText(polity.rulersZh??t('noRuler'),locale,data)}</p><ol className="ruler-lineage">{rulers.map((r,i)=><li key={`${r[0]}:${r[3]}`}><time>{formatYear(r[0],locale)}</time><strong>{locale==='en'?r[4]:historicalText(r[3],locale,data)}</strong><span>{historicalText(r[1],locale,data)}</span>{i===rulers.length-1&&<small>{t('reignYears')}</small>}</li>)}</ol><p className="dossier-source">{t('source')} · jiangshan-map / CHGIS · {t('approximation')}</p></div></div>;
}
