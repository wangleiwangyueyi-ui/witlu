import { lazy, Suspense, useEffect, useRef } from 'react';
import { useWorld } from './World';
import { useShell } from '../state/shell';
import { chapterName, historicalText } from '../i18n/history';
import { formatYear } from '../i18n/chronicle';
import { seekYear } from '../store/time';
import { Credits } from './Credits';

const WorldLegend = lazy(() => import('./WorldLegend'));

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
   <Suspense fallback={null}><WorldLegend/></Suspense>
   <p>{en?'◎ Capital · ╌ Prefecture · • City · ▪ Pass':hant?'◎ 都城 · ╌ 州郡 · • 城池 · ▪ 關隘':'◎ 都城 · ╌ 州郡 · • 城池 · ▪ 关隘'}</p>
   <Credits/>
 </details>;
}
