import { useEffect, useRef } from 'react';
import { useWorld } from './World';
import { polityName, historicalText } from '../i18n/history';
import { useShell } from '../state/shell';
import { terrainBridge } from '../state/terrain';
/** Label text stays in React; screen positions are updated directly, never through setState. */
export function PolityLabels(){
  const {tracks,data}=useWorld(),locale=useShell(s=>s.locale),root=useRef<HTMLDivElement>(null);
  const labels=tracks.flatMap(t=>t.occurrence.capitals[0]?[{key:t.polity.key,name:polityName(t.polity,locale,data).replace('辽东公孙氏（燕）','燕（公孙氏）'),capital:historicalText(t.occurrence.capitals[0].name,locale,data),coord:t.occurrence.capitals[0].coord}]:[]);
  const key=labels.map(l=>`${l.key}:${l.coord.join(',')}`).join('|');
  useEffect(()=>{let frame=0,last=0;const update=(now:number)=>{frame=requestAnimationFrame(update);if(now-last<80)return;last=now;const engine=terrainBridge.engine;if(!engine)return;const mobile=matchMedia('(max-width:768px)').matches;const maxY=mobile?innerHeight*.45:engine.camera.height-80;const maxX=mobile?innerWidth-20:engine.camera.width-20;for(const node of root.current?.querySelectorAll<HTMLElement>('[data-site]')??[]){const coord=node.dataset.site!.split(',').map(Number) as [number,number];const p=engine.projectSite(coord);node.hidden=!p.visible||p.y<145||p.y>maxY||p.x<40||p.x>maxX;node.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;}};frame=requestAnimationFrame(update);return()=>cancelAnimationFrame(frame);},[key]);
  return <div className="polity-labels" ref={root} aria-hidden="true">{labels.map(l=><div hidden key={l.key} data-site={l.coord.join(',')}><strong>{l.name}</strong></div>)}</div>;
}
