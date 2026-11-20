import { useEffect, useRef } from 'react';
import { useWorld } from './World';
import { polityName, historicalText } from '../i18n/history';
import { useShell } from '../state/shell';
import { terrainBridge } from '../state/terrain';
import { mapObstacles, mapOverlap } from './map-placement';
/** Label text stays in React; screen positions are updated directly, never through setState. */
export function PolityLabels({flat=false}:{flat?:boolean}) {
  const {tracks,data,phase}=useWorld(),locale=useShell(s=>s.locale),root=useRef<HTMLDivElement>(null);
  const enabled=useShell(s=>s.layers.territories!==false);
  const styles=data?.colors.find(c=>c.snapshot===phase?.snapshot)?.colors??[];
  const regimes=[...tracks].sort((a,b)=>b.occurrence.areaKm2-a.occurrence.areaKm2).flatMap(({polity,occurrence})=>{
    const anchor=(flat ? styles.find(s=>s.polityId===polity.key)?.anchor : undefined) ?? occurrence.capitals[0]?.coord;
    return anchor ? [{key:polity.key,coord:anchor,name:polityName(polity,locale,data).replace('辽东公孙氏（燕）','燕（公孙氏）'),neighbor:false}] : [];
  });
  const neighbors=flat?styles.flatMap(s=>s.role==='neighbor'&&s.anchor?[{key:s.polityId,coord:s.anchor,name:historicalText(s.title,locale,data),neighbor:true}]:[]):[];
  const labels=[...new Map([...regimes,...neighbors].map(label=>[label.key,label])).values()];
  const signature=labels.map(l=>`${l.key}:${l.coord}:${l.name}`).join('|');
  useEffect(()=>{
    if(!enabled)return;
    let lastLayout=-Infinity, viewportWidth=0, viewportHeight=0, prevDist=0;
    let mapRect: DOMRect | null = null;
    let cachedObstacles: ReturnType<typeof mapObstacles> = [];
    const sizes=new WeakMap<HTMLElement,{width:number;height:number}>();
    const chosenOffsets=new WeakMap<HTMLElement,[number,number]>();
    const update=()=>{
      const engine=terrainBridge.engine, surface=root.current;
      if(!engine||!surface)return;
      const now=performance.now();
      const dist=engine.camera.pose.distance;
      const zooming=Math.abs(dist-prevDist)>1.5;
      prevDist=dist;
      const zoomScale=flat?Math.max(0.76,Math.min(1.24,Math.pow(8200/Math.max(200,dist),0.22))):1;
      const needsLayout=!mapRect||(!zooming&&now-lastLayout>=160);
      if(needsLayout){
        lastLayout=now;
        mapRect=surface.getBoundingClientRect();
        cachedObstacles=flat?mapObstacles(mapRect,'.app-header,.chapter-sheet,.map-legend,.flat-map-controls,.sidebar-toggle,.welcome-strip'):[];
      }
      const map=mapRect!;
      const resized=viewportWidth!==map.width||viewportHeight!==map.height;
      viewportWidth=map.width; viewportHeight=map.height;
      const blocked=[...cachedObstacles];
      for(const node of surface.querySelectorAll<HTMLElement>('[data-site]')){
        const coord=node.dataset.site!.split(',').map(Number) as [number,number];
        const p=engine.projectSite(coord);
        let size=sizes.get(node);
        if(!size||resized){
          node.hidden=false;
          size={width:node.offsetWidth+8,height:node.offsetHeight+4};
          sizes.set(node,size);
        }
        const {width,height}=size;
        const saved=chosenOffsets.get(node);
        if(zooming&&saved){
          if(!p.visible){node.hidden=true;continue;}
          node.hidden=false;
          node.style.transform=`translate3d(${p.x+saved[0]}px,${p.y+saved[1]}px,0) translate(-50%,-50%) scale(${zoomScale.toFixed(3)})`;
          continue;
        }
        const offsets: [number,number][]=flat&&node.dataset.neighbor==='false'?[[0,0],[0,-24],[0,24],[-28,0],[28,0],[-24,-19],[24,-19],[-24,19],[24,19]]:[[0,0]];
        const hit=p.visible ? offsets.map(([ox,oy])=>({ox,oy,box:{x:p.x+ox-width/2,y:p.y+oy-height/2,width,height}})).find(({box})=>
          box.x>=8&&box.y>=8&&box.x+width<=map.width-8&&box.y+height<=map.height-8&&!blocked.some(b=>mapOverlap(box,b))) : undefined;
        node.hidden=!hit;
        if(!hit)continue;
        chosenOffsets.set(node,[hit.ox,hit.oy]);
        blocked.push(hit.box);
        node.style.transform=`translate3d(${hit.box.x+width/2}px,${hit.box.y+height/2}px,0) translate(-50%,-50%) scale(${zoomScale.toFixed(3)})`;
      }
    };
    let unbindFrame: (() => void) | null = null;
    const attach=()=>{
      unbindFrame?.();
      unbindFrame=terrainBridge.engine?.onFrame(update)??null;
      update();
    };
    attach();
    const offBridge=terrainBridge.subscribe(attach);
    return()=>{unbindFrame?.();offBridge();};
  },[signature,flat,enabled]);
  return <div className="polity-labels" ref={root} aria-hidden="true" hidden={!enabled}>{labels.map(l=><div hidden key={l.key} data-site={l.coord.join(',')} data-polity={l.key} data-neighbor={l.neighbor}><strong>{l.name}</strong></div>)}</div>;
}
