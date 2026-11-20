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
    let lastLayout = -Infinity;
    let surface: DOMRect | null = null;
    let bottom = 0;
    let cachedObstacles: MapRect[] = [];
    const update = () => {
      const engine = terrainBridge.engine, layer = root.current;
      if (!engine || !layer) return;
      const now = performance.now();
      const mobile = engine.camera.mobile;
      const top = mobile ? 58 : 8;
      if (!surface || now - lastLayout >= 140) {
        lastLayout = now;
        surface = layer.getBoundingClientRect();
        const sheet = mobile ? document.querySelector('.chapter-sheet') : null;
        bottom = Math.min(surface.height, sheet ? sheet.getBoundingClientRect().top - surface.top : surface.height) - 8;
        cachedObstacles = mapObstacles(surface,
          '.polity-labels [data-neighbor="false"]:not([hidden]),.map-legend,.flat-map-controls,.camera-controls,.sidebar-toggle,.welcome-strip');
        if (mobile) {
          cachedObstacles.push({x:surface.width*.22,y:surface.height*.29,width:surface.width*.56,height:surface.height*.40});
        }
      }
      const {width} = surface;
      const blocked = [...cachedObstacles];

      for (const node of layer.querySelectorAll<HTMLElement>('.map-event-projection')) {
        const coord = node.dataset.coordinate!.split(',').map(Number) as [number,number];
        const pt = engine.projectSite(coord);
        const card = node.querySelector<HTMLElement>('.map-event-card')!;
        const pin = node.querySelector<HTMLElement>('.map-event-pin')!;
        const leader = node.querySelector<HTMLElement>('.map-event-leader')!;
        node.hidden = !pt.visible || pt.y < top || pt.y > bottom;
        if (node.hidden) continue;
        pin.style.transform = `translate3d(${pt.x}px,${pt.y}px,0) translate(-50%,-50%)`;
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
        card.style.transform = `translate3d(${box.x}px,${box.y}px,0)`;
        const endX = Math.min(box.x+w,Math.max(box.x,pt.x)), endY = Math.min(box.y+h,Math.max(box.y,pt.y));
        const dx = endX-pt.x, dy = endY-pt.y;
        leader.style.width = `${Math.hypot(dx,dy)}px`;
        leader.style.transform = `translate3d(${pt.x}px,${pt.y}px,0) rotate(${Math.atan2(dy,dx)}rad)`;
      }
    };
    let unbindFrame: (() => void) | null = null;
    const attach = () => {
      unbindFrame?.();
      unbindFrame = terrainBridge.engine?.onFrame(update) ?? null;
      update();
    };
    attach();
    const offBridge = terrainBridge.subscribe(attach);
    return () => { unbindFrame?.(); offBridge(); };
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
