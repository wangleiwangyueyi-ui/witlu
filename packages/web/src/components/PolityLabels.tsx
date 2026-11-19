import { useEffect, useRef } from 'react';
import { useWorld } from './World';
import { polityName, historicalText } from '../i18n/history';
import { useShell } from '../state/shell';
import { terrainBridge } from '../state/terrain';
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
    let frame=0,last=-Infinity,viewportWidth=0;
    const sizes=new WeakMap<HTMLElement,{width:number;height:number}>();
    const update=(now:number)=>{
      frame=requestAnimationFrame(update);
      const engine=terrainBridge.engine, surface=root.current;
      if(!engine||!surface||now-last<90)return;
      last=now;
      const map=surface.getBoundingClientRect();
      const resized=viewportWidth!==map.width;
      viewportWidth=map.width;
      const blocked=flat?[...document.querySelectorAll('.app-header,.chapter-sheet,.map-legend,.flat-map-controls,.sidebar-toggle')].filter(n=>n.getClientRects().length).map(node=>{
        const r=node.getBoundingClientRect();return {x:r.x-map.x,y:r.y-map.y,width:r.width,height:r.height};
      }):[];
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
        const box={x:p.x-width/2,y:p.y-height/2,width,height};
        node.hidden=!p.visible||box.x<8||box.x+width>map.width-8||box.y<8||box.y+height>map.height-8||blocked.some(b=>box.x<b.x+b.width&&b.x<box.x+width&&box.y<b.y+b.height&&b.y<box.y+height);
        if(node.hidden)continue;
        blocked.push(box);
        node.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
      }
    };
    if(enabled)frame=requestAnimationFrame(update);
    return()=>cancelAnimationFrame(frame);
  },[signature,flat,enabled]);
  return <div className="polity-labels" ref={root} aria-hidden="true" hidden={!enabled}>{labels.map(l=><div hidden key={l.key} data-site={l.coord.join(',')} data-neighbor={l.neighbor}><strong>{l.name}</strong></div>)}</div>;
}
