import { yearToIndex } from '@witlu/core/time';
import type { ChronicleEvent } from '@witlu/core/time';
import type { Chronicle } from '../store/chronicle';

export function timelineRows(data:Chronicle) {
  const colors=new Map(data.colors.map(s=>[s.snapshot,new Map(s.colors.map(c=>[c.polityId,c.color]))]));
  const registry=new Map(data.registry.map(p=>[p.key,p]));
  const events=new Map<string,Map<number,ChronicleEvent[]>>();
  for(const event of data.events){
    if(!event.regime||event.kind==='journey')continue;
    const bucket=events.get(event.regime)??new Map<number,ChronicleEvent[]>();
    const i=yearToIndex(event.year), records=bucket.get(i)??[];
    records.push(event);
    bucket.set(i,records);
    events.set(event.regime,bucket);
  }
  const polities=data.polities.map(polity=>({
    ...polity,
    intervals:polity.stages.filter(s=>['main','rival'].includes(s.role)).map(s=>({
      from:yearToIndex(s.from),to:yearToIndex(s.to),area:s.areaKm2,role:s.role,color:colors.get(s.snapshot)?.get(polity.key),
    })).sort((a,b)=>a.from-b.from),
  })).filter(polity=>polity.intervals.length);
  return ([left,right]:readonly [number,number])=>{
    const center=(left+right)/2;
    return polities.flatMap(polity=>{
      const visible=polity.intervals.filter(stage=>stage.to>=left&&stage.from<=right);
      if(!visible.length)return [];
      const bars: {from:number;to:number;color:string|undefined}[]=[];
      for(const s of visible){
        const from=Math.max(left,s.from),to=Math.min(right,s.to),last=bars.at(-1);
        if(last&&last.to>=from&&last.color===s.color)last.to=Math.max(last.to,to);
        else bars.push({from,to,color:s.color});
      }
      const active=visible.find(s=>s.from<=center&&center<s.to), representative=active??visible[0]!;
      const profile=registry.get(polity.key);
      const from=profile?yearToIndex(profile.from):polity.intervals[0]!.from;
      const to=profile?yearToIndex(profile.to):polity.intervals.at(-1)!.to;
      const endpoints=([{kind:'start',index:from},{kind:'end',index:to}] as const)
        .filter(e=>e.index>=left&&e.index<=right&&(e.kind==='start'||e.index<yearToIndex(2027)));
      return [{
        key:polity.key,title:polity.title,polity:profile,bars,endpoints,
        color:representative.color,rank:active?(active.role==='main'?2:1):0,area:representative.area,
        events:[...events.get(polity.key)??[]].filter(([year])=>year>=left&&year<=right).sort(([a],[b])=>a-b),
      }];
    }).sort((a,b)=>b.rank-a.rank||b.area-a.area||a.key.localeCompare(b.key));
  };
}
