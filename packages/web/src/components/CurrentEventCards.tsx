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
import { mapObstacles, mapOverlap } from './map-placement';
import type { MapRect } from './map-placement';

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
    if (!choices.length || placeOpen || exploring) return;
    let frame = 0, last = -Infinity;
    const update = (now:number) => {
      frame = requestAnimationFrame(update);
      const engine = terrainBridge.engine, layer = root.current;
      if (!engine || !layer || now-last < 70) return;
      last = now;

      const surface = layer.getBoundingClientRect(), {width,height} = surface;
      const mobile = engine.camera.mobile;
      const top = mobile ? 58 : 8;
      const sheet = mobile ? document.querySelector('.chapter-sheet') : null;
      const bottom = Math.min(height,sheet ? sheet.getBoundingClientRect().top-surface.top : height)-8;
      const blocked = mapObstacles(surface,
        '.polity-labels [data-neighbor="false"]:not([hidden]),.map-legend,.flat-map-controls,.camera-controls,.sidebar-toggle,.welcome-strip');
      if (mobile) {
        // Leave the central map open even when the event itself lies there.
        blocked.push({x:width*.22,y:height*.29,width:width*.56,height:height*.40});
      }

      for (const node of layer.querySelectorAll<HTMLElement>('.map-event-projection')) {
        const coord = node.dataset.coordinate!.split(',').map(Number) as [number,number];
        const pt = engine.projectSite(coord);
        const card = node.querySelector<HTMLElement>('.map-event-card')!;
        const pin = node.querySelector<HTMLElement>('.map-event-pin')!;
        const leader = node.querySelector<HTMLElement>('.map-event-leader')!;
        node.hidden = !pt.visible || pt.y < top || pt.y > bottom;
        if (node.hidden) continue;
        pin.style.transform = `translate(${pt.x}px,${pt.y}px) translate(-50%,-50%)`;
        card.hidden = false;
        const w = card.offsetWidth, h = card.offsetHeight;
        const left = 8, right = width-w-8;
        const clampX = (x:number) => Math.max(left,Math.min(right,x));
        const clampY = (y:number) => Math.max(top,Math.min(bottom-h,y));
        const adjacent = [[pt.x+14,pt.y-h/2],[pt.x-w-14,pt.y-h/2],[pt.x-w/2,pt.y-h-14],[pt.x-w/2,pt.y+14]];
        const edges = [[left,top],[right,top],[left,bottom-h],[right,bottom-h]];
        const candidates = (mobile ? edges : [...adjacent,...edges]).map(([x,y]) => ({
          x:clampX(x!), y:clampY(y!), width:w, height:h,
        }));
        const value = (r:MapRect) => Math.hypot(pt.x-r.x-r.width/2,pt.y-r.y-r.height/2);
        candidates.sort((a,b) => value(a)-value(b));
        const box = candidates.find(r => bottom-top >= h && !blocked.some(b => mapOverlap(r,b,7)));
        card.hidden = leader.hidden = !box;
        if (!box) continue;
        blocked.push(box);
        card.style.transform = `translate(${box.x}px,${box.y}px)`;
        const endX = Math.min(box.x+w,Math.max(box.x,pt.x)), endY = Math.min(box.y+h,Math.max(box.y,pt.y));
        const dx = endX-pt.x, dy = endY-pt.y;
        leader.style.width = `${Math.hypot(dx,dy)}px`;
        leader.style.transform = `translate(${pt.x}px,${pt.y}px) rotate(${Math.atan2(dy,dx)}rad)`;
      }
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  },[nearby.length,year,choices.length,placeOpen,exploring]);
  if (!data || !choices.length || placeOpen || exploring) return null;

  return <div className="map-event-layer place-labels" ref={root}>{choices.map(({event,coord})=>{
    if(dismissed?.year===year&&dismissed.ids.includes(event.id))return null;
    const style = data.colors.find(row=>row.snapshot===phase?.snapshot)?.colors.find(row=>row.polityId===event.regime);
    const era = tracks.find(row=>row.polity.key===event.regime)?.era ?? eraAt(yearToIndex(year),data.eras.main);
    const name = locale==='en' ? event.siteEn??historicalText(event.site??t('eventPlace'),locale,data) : historicalText(event.site??t('eventPlace'),locale,data);
    const coords = event.siteCoords?.length ? event.siteCoords : [coord];
    const yearLabel = `${formatYear(year,locale)}${era ? ` · ${reignText(era,locale,data)}` : ''}`;
    return <div hidden className="map-event-projection" key={event.id} data-coordinate={coord.join(',')} style={{'--track-color':style?.color??'var(--neighbor)'} as CSSProperties}>
      <span aria-hidden="true" className="map-event-leader" hidden/>
      <span aria-hidden="true" className="map-event-pin"/>
      <article hidden className="map-event-card" data-coordinate={coord.join(',')} data-regime={event.regime}>
      <header><span title={yearLabel}>{yearLabel}</span>
        <button className="event-close" type="button" aria-label={t('close')} onClick={()=>setDismissed({year,ids:[...(dismissed?.year===year?dismissed.ids:[]),event.id]})}>×</button>
      </header>
      <p title={eventTitle(event,locale,data)}>{eventTitle(event,locale,data)}</p>
      <div className="event-sites">{coords.map((site,i)=><button type="button" key={site.join(',')} onClick={()=>openPlace({id:`popup:${event.id}:${i}`,name,coord:site,kind:'lantern',priority:120,description:eventTitle(event,locale,data)})}>{name}{i>0&&` ${i+1}`}</button>)}</div>
      </article>
    </div>;
  })}</div>;
}
