import '../styles/map-event-cards.css';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { distance } from '@witlu/core/places';
import { eraAt, yearToIndex } from '@witlu/core/time';
import type { ChronicleEvent } from '@witlu/core/time';
import { useWorld } from './World';
import { useShell } from '../state/shell';
import { useExplore } from '../state/explore';
import { openPlace, usePlaces } from '../state/places';
import { terrainBridge } from '../state/terrain';
import { formatYear, useChronicleText } from '../i18n/chronicle';
import { eventTitle, historicalText, reignText } from '../i18n/history';

export default function CurrentEventCards() {
  const {data,year,phase,tracks} = useWorld(), locale = useShell(s=>s.locale), t = useChronicleText();
  const placeOpen = usePlaces(s=>Boolean(s.selected));
  const exploring = useExplore(s=>Boolean(s.keys.length || s.story || s.quiz.length));
  const [dismissed,setDismissed] = useState<{year:number; ids:string[]}>();
  const root = useRef<HTMLDivElement>(null);
  const choices: {event: ChronicleEvent; coord: [number, number]}[] = [];
  const nearby = data?.events.filter(e=>e.year===year && e.kind!=='journey').sort((a,b)=>b.importance-a.importance) ?? [];
  for (const event of nearby) {
    const coord = event.coord ?? event.siteCoords?.[0];
    if (!coord || choices.some(other=>distance(other.coord,coord)<35)) continue;
    choices.push({event,coord});
    if (choices.length===2) break;
  }
  useEffect(() => {
    if(!choices.length || placeOpen || exploring)return;
    let frame = 0, last = -Infinity;
    const update = (now:number) => {
      frame=requestAnimationFrame(update);
      const engine=terrainBridge.engine, layer=root.current;
      if(!engine||!layer||now-last<42)return;
      last=now;
      const boxes: {x:number;y:number;w:number;h:number}[]=[];
      const width=layer.clientWidth,height=layer.clientHeight;
      const top=engine.camera.mobile?58:10;
      const sheet=engine.camera.mobile?document.querySelector('.chapter-sheet'):null;
      const sheetTop=sheet?sheet.getBoundingClientRect().top-layer.getBoundingClientRect().top:height;
      const bottom=Math.min(height,sheetTop)-10;
      for(const card of layer.querySelectorAll<HTMLElement>('[data-coordinate]')) {
        const coord=card.dataset.coordinate!.split(',').map(Number) as [number,number];
        const pt=engine.projectSite(coord);
        if(!pt.visible||pt.y>bottom){card.hidden=true;continue;}
        card.hidden=false;
        const w=card.offsetWidth,h=card.offsetHeight;
        if(bottom-top<h){card.hidden=true;continue;}
        const x=Math.max(8,Math.min(width-w-8,pt.x-w/2));
        let y=Math.max(top,Math.min(bottom-h,pt.y-h-12));
        for(const other of boxes)if(x<other.x+other.w+8&&x+w+8>other.x&&y<other.y+other.h+8&&y+h+8>other.y)y=other.y+other.h+8;
        if(y+h>bottom){card.hidden=true;continue;}
        boxes.push({x,y,w,h});
        card.style.transform=`translate(${x}px,${y}px)`;
      }
    };
    frame=requestAnimationFrame(update);
    return()=>cancelAnimationFrame(frame);
  },[nearby.length,year,choices.length,placeOpen,exploring]);
  if (!data || !choices.length || placeOpen || exploring) return null;

  return <div className="map-event-layer place-labels" ref={root}>{choices.map(({event,coord})=>{
    if(dismissed?.year===year&&dismissed.ids.includes(event.id))return null;
    const style = data.colors.find(row=>row.snapshot===phase?.snapshot)?.colors.find(row=>row.polityId===event.regime);
    const era = tracks.find(row=>row.polity.key===event.regime)?.era ?? eraAt(yearToIndex(year),data.eras.main);
    const name = locale==='en' ? event.siteEn??historicalText(event.site??t('eventPlace'),locale,data) : historicalText(event.site??t('eventPlace'),locale,data);
    const coords = event.siteCoords?.length ? event.siteCoords : [coord];
    return <article hidden className="map-event-card" key={event.id} data-coordinate={coord.join(',')} data-regime={event.regime} style={{'--track-color':style?.color??'var(--neighbor)'} as CSSProperties}>
      <header><span>{formatYear(year,locale)}{era&&` · ${reignText(era,locale,data)}`}</span>
        <button className="event-close" type="button" aria-label={t('close')} onClick={()=>setDismissed({year,ids:[...(dismissed?.year===year?dismissed.ids:[]),event.id]})}>×</button>
      </header>
      <p>{eventTitle(event,locale,data)}</p>
      <div className="event-sites">{coords.map((site,i)=><button type="button" key={site.join(',')} onClick={()=>openPlace({id:`popup:${event.id}:${i}`,name,coord:site,kind:'lantern',priority:120,description:eventTitle(event,locale,data)})}>{name}{i>0&&` ${i+1}`}</button>)}</div>
    </article>;
  })}</div>;
}
