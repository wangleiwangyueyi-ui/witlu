import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { eraAt, indexToYear, yearToIndex } from '@witlu/core/time';
import type { ChronicleEvent } from '@witlu/core/time';
import { useStore } from 'zustand';
import { chapterName, eventTitle, historicalText, polityName, reignText } from '../i18n/history';
import { formatYear, useChronicleText } from '../i18n/chronicle';
import { useChronicle } from '../store/chronicle';
import { useShell } from '../state/shell';
import { resetTimeView, seekIndex, seekYear, setTimelineCrop, stepEvent, stepYear, timeBounds, timeStore, toggleTime } from '../store/time';
import { timelineRows } from './timeline-model';
import './parallel-timeline.css';

type Range = readonly [number,number];
type Edge = 0 | 1;
const clamp = (value:number, low:number, high:number) => Math.min(high,Math.max(low,value));
const position = (i:number, [a,b]:Range) => (i-a)/(b-a)*100;
const minimum = Math.min(12,timeBounds[1]-timeBounds[0]);
const compactNames: Record<string,[string,string]> = {
  dongjin:['东晋','E. Jin'], nanbei:['南北朝','N. & S.'], wudai:['五代','Five Dyn.'],
  sanguo:['三国','Three K.'], roc:['民国','Republic'], prc:['现代','Modern'],
};
interface Scrub {
  points: Map<number,number>;
  bounds: DOMRect;
  range: Range;
  original: number;
  start: number;
  lastX: number;
  lastTime: number;
  moved: boolean;
  pinch?: { distance:number; bounds:Range; next:Range };
}
interface Crop {
  pointer:number;
  edge:Edge;
  rect:DOMRect;
  x:number;
  range:Range;
  next:Range;
}
function cropEdge(range:Range, edge:Edge, value:number): Range {
  return edge===0
    ? [clamp(Math.round(value),timeBounds[0],Math.floor(range[1]-minimum)),range[1]]
    : [range[0],clamp(Math.round(value),Math.ceil(range[0]+minimum),timeBounds[1])];
}

export default function ParallelTimeline() {
  const {data,error}=useChronicle(),locale=useShell(s=>s.locale),t=useChronicleText();
  const view=useStore(timeStore,s=>s.view),cropped=useStore(timeStore,s=>s.cropped);
  const range=cropped?view:timeBounds;
  const rail=useRef<HTMLDivElement>(null), playhead=useRef<HTMLSpanElement>(null), guide=useRef<HTMLDivElement>(null);
  const axis=useRef<HTMLDivElement>(null), tip=useRef<HTMLOutputElement>(null);
  const scrub=useRef<Scrub|null>(null), crop=useRef<Crop|null>(null), tap=useRef<{edge:Edge;x:number;at:number}|undefined>(undefined);
  const frame=useRef(0), pending=useRef<{index:number;velocity:number}|null>(null);
  const tipKind=useRef<'year'|'event'|'crop'|null>(null);
  const initial=indexToYear(Math.floor(timeStore.getState().index));
  const model=useMemo(()=>data&&timelineRows(data),[data]);
  const rows=useMemo(()=>model?.(view)??[],[model,view]);
  const label=(index:number)=>formatYear(indexToYear(Math.floor(index)),locale);

  function showTip(text:string, x:number, kind:typeof tipKind.current) {
    const node=tip.current, track=rail.current;
    if(!node||!track)return;
    tipKind.current=kind;
    node.hidden=false;
    if(node.textContent!==text)node.textContent=text;
    const half=node.offsetWidth/2;
    node.style.left=`${clamp(x,half,Math.max(half,track.clientWidth-half))}px`;
  }
  function hideTip() { if(tip.current)tip.current.hidden=true;tipKind.current=null; }
  function describe(index:number) {
    const year=indexToYear(Math.floor(index)), era=data&&eraAt(Math.floor(index),data.eras.main);
    const date=locale==='en'?formatYear(year,locale):year<0?`公元前 ${-year} 年`:`公元 ${year} 年`;
    return era?`${date} · ${reignText(era,locale,data,' · ')}`:date;
  }
  useEffect(()=>{
    let last=NaN,spoken='';
    const update=()=>{
      if(!rail.current||!playhead.current||!guide.current)return;
      const {index}=timeStore.getState(), year=Math.floor(index);
      if(index===last)return;
      last=index;
      const x=clamp(position(index,range),0,100);
      playhead.current.style.left=`${x}%`;
      guide.current.style.setProperty('--timeline-position',`${clamp(position(index,view),0,100)}%`);
      guide.current.dataset.inView=String(index>=view[0]&&index<=view[1]);
      const current=String(indexToYear(year));
      if(spoken!==current){
        spoken=current;
        rail.current.setAttribute('aria-valuenow',current);
        rail.current.setAttribute('aria-valuetext',describe(year));
      }
      if(tipKind.current==='year')showTip(rail.current.getAttribute('aria-valuetext')??'',x/100*rail.current.clientWidth,'year');
    };
    update();
    return timeStore.subscribe(update);
    // Current formatters and positioning share these data, locale and range inputs.
  },[data, locale, range, view]);
  useEffect(()=>{
    const lanes=guide.current;
    if(!lanes)return;
    const sync=()=>lanes.parentElement?.style.setProperty('--timeline-scrollbar',`${lanes.offsetWidth-lanes.clientWidth}px`);
    const observer=new ResizeObserver(sync);
    observer.observe(lanes,{box:'content-box'});
    sync();
    return ()=>observer.disconnect();
  },[]);
  useEffect(()=>()=>{cancelAnimationFrame(frame.current);if(scrub.current)timeStore.setState({scrubbing:false,velocity:0});},[]);

  function currentTip() {
    const i=timeStore.getState().index, width=rail.current?.clientWidth??0;
    showTip(describe(i),clamp(position(i,range),0,100)/100*width,'year');
  }
  function seekOnFrame(index:number,velocity:number) {
    pending.current={index,velocity};
    if(frame.current)return;
    frame.current=requestAnimationFrame(()=>{
      frame.current=0;
      const target=pending.current;
      pending.current=null;
      if(target)seekIndex(target.index,'drag',target.velocity);
    });
  }
  function railDown(event:PointerEvent<HTMLDivElement>) {
    if(event.button!==0)return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({preventScroll:true});
    if(scrub.current) {
      const state=scrub.current;
      if(state.points.size!==1)return;
      state.points.set(event.pointerId,event.clientX);
      const other=[...state.points.values()][0]!;
      state.pinch={distance:Math.max(10,Math.abs(event.clientX-other)),bounds:view,next:view};
      return;
    }
    scrub.current={points:new Map([[event.pointerId,event.clientX]]),bounds:event.currentTarget.getBoundingClientRect(),range,original:timeStore.getState().index,start:event.clientX,lastX:event.clientX,lastTime:event.timeStamp,moved:false};
    timeStore.setState({scrubbing:true,playing:false});
    currentTip();
  }
  function railMove(event:PointerEvent<HTMLDivElement>) {
    const state=scrub.current;
    if(!state?.points.has(event.pointerId))return;
    state.points.set(event.pointerId,event.clientX);
    if(state.pinch&&state.points.size===2){
      const [a,b]=state.points.values(), [left,right]=state.pinch.bounds, center=(left+right)/2;
      const half=(right-left)/2*state.pinch.distance/Math.max(10,Math.abs(a!-b!));
      state.pinch.next=[clamp(center-half,timeBounds[0],center),clamp(center+half,center,timeBounds[1])];
      return;
    }
    if(state.pinch)return;
    state.moved ||= Math.abs(event.clientX-state.start)>2;
    if(!state.moved)return;
    const [a,b]=state.range, factor=(b-a)/state.bounds.width;
    const index=clamp(a+(event.clientX-state.bounds.left)*factor,a,b);
    const velocity=(event.clientX-state.lastX)*factor*1000/Math.max(10,event.timeStamp-state.lastTime);
    state.lastX=event.clientX;
    state.lastTime=event.timeStamp;
    seekOnFrame(index,velocity);
  }
  function railUp(event:PointerEvent<HTMLDivElement>,commit:boolean) {
    const state=scrub.current;
    if(!state?.points.has(event.pointerId))return;
    scrub.current=null;
    cancelAnimationFrame(frame.current);frame.current=0;pending.current=null;
    if(commit&&state.pinch){
      seekIndex(state.original,'drag',0);
      setTimelineCrop(...state.pinch.next);
    }else if(commit) {
      const [a,b]=state.range, target=clamp(Math.round(a+(event.clientX-state.bounds.left)/state.bounds.width*(b-a)),Math.ceil(a),Math.floor(b));
      seekIndex(target,state.moved?'drag':'jump',0);
    }else timeStore.setState({velocity:0});
    timeStore.setState({scrubbing:false});
    hideTip();
  }
  function handleDown(event:PointerEvent<HTMLDivElement>,edge:Edge) {
    if(event.button!==0||!rail.current)return;
    event.currentTarget.focus({preventScroll:true});
    const now=event.timeStamp;
    if(event.pointerType!=='mouse'&&tap.current?.edge===edge&&now-tap.current.at<300&&Math.abs(tap.current.x-event.clientX)<14){
      tap.current=undefined;
      resetTimeView();
      return;
    }
    crop.current={pointer:event.pointerId,edge,rect:rail.current.getBoundingClientRect(),x:event.clientX,range,next:range};
    event.currentTarget.setPointerCapture(event.pointerId);
    timeStore.setState({playing:false});
  }
  function handleMove(event:PointerEvent<HTMLDivElement>) {
    const drag=crop.current;
    if(!drag||event.pointerId!==drag.pointer)return;
    const [a,b]=drag.range;
    drag.next=cropEdge(drag.range,drag.edge,drag.range[drag.edge]+(event.clientX-drag.x)/drag.rect.width*(b-a));
    const x=clamp(position(drag.next[drag.edge],drag.range),0,100);
    axis.current?.style.setProperty(drag.edge===0?'--trim-left':'--trim-right',`${drag.edge===0?x:100-x}%`);
    showTip(`${t(drag.edge===0?'timelineCropStart':'timelineCropEnd')} · ${label(drag.next[drag.edge])}`,x/100*drag.rect.width,'crop');
  }
  function handleUp(event:PointerEvent<HTMLDivElement>,commit:boolean) {
    const drag=crop.current;
    if(!drag||event.pointerId!==drag.pointer)return;
    if(commit)handleMove(event);
    crop.current=null;
    axis.current?.style.removeProperty('--trim-left');
    axis.current?.style.removeProperty('--trim-right');
    if(commit){
      const changed=drag.next[drag.edge]!==drag.range[drag.edge];
      if(changed)setTimelineCrop(...drag.next);
      else if(event.pointerType!=='mouse')tap.current={edge:drag.edge,x:event.clientX,at:event.timeStamp};
    }
    hideTip();
  }
  function handleKey(event:KeyboardEvent<HTMLDivElement>,edge:Edge) {
    const key=event.key;
    if(!['ArrowLeft','ArrowRight','Home','End','Enter'].includes(key))return;
    event.preventDefault();
    if(key==='Enter'){ resetTimeView();return; }
    const [a,b]=range, point=key==='Home'?(edge===0?timeBounds[0]:a+minimum) : key==='End'?(edge===0?b-minimum:timeBounds[1]) :
      range[edge]+Math.max(1,Math.round((b-a)*(event.shiftKey ? .2 : .04)))*(key==='ArrowRight'?1:-1);
    setTimelineCrop(...cropEdge(range,edge,point));
  }
  function onSliderKey(event:KeyboardEvent) {
    const {key}=event;
    if(!['ArrowLeft','ArrowRight',' ','Home','End'].includes(key))return;
    event.preventDefault();
    if(key===' ')toggleTime();
    else if(key==='Home'||key==='End')seekIndex(key==='Home'?Math.ceil(range[0]):Math.floor(range[1]));
    else { const direction=key==='ArrowLeft'?-1:1; if(event.shiftKey)stepEvent(direction);else stepYear(direction); }
    currentTip();
  }
  function eventTip(events:ChronicleEvent[],element:HTMLElement) {
    const event=events[0]!, rect=rail.current?.getBoundingClientRect(), target=element.getBoundingClientRect();
    showTip(`${formatYear(event.year,locale)} · ${events.map(e=>eventTitle(e,locale,data)).join(' / ')}`,rect?target.left+target.width/2-rect.left:0,'event');
  }

  return <div className="timeline-chart" aria-busy={!data&&!error}>
    <div className="timeline-overview">
      <button type="button" className="timeline-full" aria-label={t('timelineRestore')} title={t('timelineRestore')} onClick={resetTimeView}>
        {cropped?t('timelineFull'):timeBounds[0]===yearToIndex(-403)&&timeBounds[1]===yearToIndex(2027)?locale==='en'?'403 BCE–Now':'前403–今':t('timelineFull')}
      </button>
      <div className="timeline-axis" ref={axis} data-start={range[0]} data-end={range[1]}>
        <div className="timeline-year-track" ref={rail} role="slider" tabIndex={0} aria-label={t('dynastyAxis')} aria-valuemin={indexToYear(Math.ceil(range[0]))} aria-valuemax={indexToYear(Math.floor(range[1]))} aria-valuenow={initial}
          onPointerDown={railDown} onPointerMove={railMove} onPointerUp={event=>railUp(event,true)} onPointerCancel={event=>railUp(event,false)} onLostPointerCapture={event=>railUp(event,false)}
          onPointerEnter={currentTip} onPointerLeave={()=>{if(!scrub.current)hideTip();}} onFocus={currentTip} onBlur={hideTip} onKeyDown={onSliderKey} onDoubleClick={resetTimeView}>
          {data?.dynasties.map((d,i)=>{
            const a=Math.max(range[0],yearToIndex(d.fromYear)), b=Math.min(range[1],yearToIndex(data.dynasties[i+1]?.fromYear??d.toYear));
            if(b<=a)return null;
            const phase=data.phases.find(p=>p.dynastyKey===d.key), tone=data.colors.find(c=>c.snapshot===phase?.snapshot)?.colors.find(c=>c.role==='main')?.color;
            const full=chapterName(d,locale,data), short=compactNames[d.key];
            const name=short?(locale==='en'?short[1]:historicalText(short[0],locale,data)):full;
            return <div key={d.key} className="dynasty-band" data-short={name.length===1} aria-hidden="true" title={full}
              style={{left:`${position(a,range)}%`,width:`${position(b,range)-position(a,range)}%`,'--band-tone':tone??'var(--sea-flow)'} as CSSProperties}><span>{name}</span></div>;
          })}
          <span ref={playhead} className="timeline-handle" aria-hidden="true"/>
        </div>
        {[0,1].map(edge=>{
          const side=edge as Edge, caption=t(side===0?'timelineCropStart':'timelineCropEnd');
          return <div key={side} className="timeline-edge" data-edge={side===0?'left':'right'} role="slider" tabIndex={0} aria-label={caption} title={`${caption} · ${t('timelineRestore')}`}
            aria-valuemin={indexToYear(Math.ceil(side===0?timeBounds[0]:range[0]+minimum))} aria-valuemax={indexToYear(Math.floor(side===0?range[1]-minimum:timeBounds[1]))}
            aria-valuenow={indexToYear(Math.floor(range[side]))} aria-valuetext={label(range[side])}
            onPointerDown={event=>handleDown(event,side)} onPointerMove={handleMove} onPointerUp={event=>handleUp(event,true)} onPointerCancel={event=>handleUp(event,false)}
            onLostPointerCapture={event=>handleUp(event,false)} onDoubleClick={resetTimeView} onKeyDown={event=>handleKey(event,side)}/>;
        })}
        <output ref={tip} className="timeline-tooltip" hidden role="tooltip"/>
      </div>
    </div>
    <div className="parallel-lanes" ref={guide} aria-label={t('timelineLanes')} role="region" tabIndex={0} data-start={view[0]} data-end={view[1]}>
      {error&&<p role="alert">{t('loadError')}</p>}
      {rows.map(row=>{
        const translated=row.polity?polityName(row.polity,locale,data):historicalText(row.title,locale,data);
        return <div key={row.key} className="timeline-lane" data-polity={row.key} style={{'--lane-tone':row.color??'var(--neighbor)'} as CSSProperties}>
          <span className="lane-name" title={translated}><i aria-hidden="true"/>{translated}</span>
          <div className="lane-band">
            {row.bars.map(bar=><span key={bar.from} className="lane-span" style={{left:`${position(bar.from,view)}%`,width:`${position(bar.to,view)-position(bar.from,view)}%`,background:bar.color}}/>)}
            {row.endpoints.map(endpoint=><span key={endpoint.kind} className="lane-endpoint" data-endpoint={endpoint.kind} style={{left:`${position(endpoint.index,view)}%`}}
              title={`${translated} · ${t(endpoint.kind==='start'?'timelineFounding':'timelineFall')} · ${label(endpoint.index)}`}/>)}
            {row.events.map(([i,events],n)=>{
              const before=row.events[n-1]?.[0]??-Infinity, after=row.events[n+1]?.[0]??Infinity;
              const space=Math.min(i-before,after-i);
              return <button type="button" className="lane-tick" key={i} style={{left:`${position(i,view)}%`,'--tick-width':Number.isFinite(space)?`${space/(view[1]-view[0])*100}%`:'100%'} as CSSProperties}
              data-year={events[0]!.year} aria-label={`${formatYear(events[0]!.year,locale)} · ${translated} · ${events.map(e=>eventTitle(e,locale,data)).join(' / ')}`}
              onPointerEnter={event=>eventTip(events,event.currentTarget)} onPointerLeave={hideTip} onFocus={event=>eventTip(events,event.currentTarget)} onBlur={hideTip}
              onClick={()=>{seekYear(events[0]!.year);hideTip();}}/>;
            })}
          </div>
        </div>;
      })}
    </div>
  </div>;
}
