import {useEffect,useRef} from 'react';
import {useWorld,WorldTracks,WorldLegend} from './World';
import {useShell} from '../state/shell';
import {chapterName,eventTitle,historicalText} from '../i18n/history';
import {formatYear} from '../i18n/chronicle';
import {seekYear} from '../store/time';
import {Credits} from './Credits';
import {Sources} from './Sources';
export function ChronicleSidebar(){
 const {data,phase,year,tracks}=useWorld(),locale=useShell(s=>s.locale),dynasty=data?.dynasties.find(d=>d.key===phase?.dynastyKey),era=tracks[0]?.era;
 const events=data?.events.filter(e=>e.kind==='milestone'&&e.dynastyKey===dynasty?.key)??[];
 return <div className="chronicle-content"><header className="chronicle-meta"><span>{year>0?(locale==='en'?'CE ':'公元 '):''}{formatYear(year,locale)}</span>{era&&<span>{historicalText(era.name,locale,data)} {era.ordinal}</span>}<h1 aria-label={dynasty?chapterName(dynasty,locale,data):''}>{dynasty&&chapterName(dynasty,locale,data)}</h1>{dynasty&&<><span>{formatYear(dynasty.fromYear,locale)}–{formatYear(dynasty.toYear,locale)}</span><span>{historicalText(dynasty.seat,locale,data)}</span></>}</header><WorldTracks summary mobile={false}/><section className="chronicle-section"><h2>{locale==='en'?'Dynastic events':'本朝大事'}</h2>{events.map(e=><div key={e.id}><button className="chronicle-event" data-current={e.year===year} onClick={()=>seekYear(e.year)}><time>{formatYear(e.year,locale)}</time><span>{eventTitle(e,locale,data)}</span></button><Sources event={e}/></div>)}</section></div>;
}
export function MapLegend() {
 const locale = useShell(s=>s.locale), ref = useRef<HTMLDetailsElement>(null);
 const {phase,data}=useWorld();
 const dynasty=data?.dynasties.find(d=>d.key===phase?.dynastyKey);
 const phases=data?.phases.filter(p=>p.dynastyKey===phase?.dynastyKey)??[];
 const index=phases.findIndex(p=>p.snapshot===phase?.snapshot);
 const en=locale==='en', hant=locale==='zh-Hant';
 useEffect(()=>{
   const open=()=>{if(ref.current)ref.current.open=true;};
   window.addEventListener('atlas:open-legend',open);
   return()=>window.removeEventListener('atlas:open-legend',open);
 },[]);
 return <details ref={ref} className="map-legend">
   <summary>{en?'Map key':hant?'圖例':'图例'}{dynasty&&<> · {chapterName(dynasty,locale,data)} {index+1}/{phases.length}</>}</summary>
   <div className="phase-dots" aria-label={en?'Phases':hant?'階段':'阶段'}>{phases.map((p,i)=><button type="button" key={p.from} aria-current={i===index?'step':undefined} title={historicalText(p.overview??'',locale,data)} aria-label={formatYear(p.from,locale)} onClick={()=>seekYear(p.from)}>●</button>)}</div>
   <WorldLegend/>
   <p>{en?'◎ Capital · ╌ Prefecture · • City · ▪ Pass':hant?'◎ 都城 · ╌ 州郡 · • 城池 · ▪ 關隘':'◎ 都城 · ╌ 州郡 · • 城池 · ▪ 关隘'}</p>
   <Credits/>
 </details>;
}
