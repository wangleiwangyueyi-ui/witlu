import {useEffect,useState} from 'react';
import {useShell} from '../state/shell';
interface StaticSnapshot {key:string;from:number;to:number;caption:string;image:string}
export function StaticAtlas({unavailable=false}:{unavailable?:boolean}){
 const year=useShell(s=>s.year),locale=useShell(s=>s.locale),[snapshots,setSnapshots]=useState<StaticSnapshot[]>([]);
 useEffect(()=>{const c=new AbortController();void fetch('/fallback/manifest.json',{signal:c.signal}).then(r=>{if(!r.ok)throw Error('Static atlas unavailable');return r.json() as Promise<StaticSnapshot[]>;}).then(setSnapshots).catch(()=>{});return()=>c.abort();},[]);
 const current=snapshots.find(s=>year>=s.from&&year<s.to)??(year>=2026?snapshots.at(-1):undefined);
 return <div className="static-atlas" data-testid={unavailable?'static-atlas':'initial-atlas'}><figure><img src={current?.image??'/fallback/initial.webp'} fetchPriority="high" alt={`${locale==='en'?'Static atlas':'静态疆域图'} · ${year} · ${current?.caption??''}`}/>{unavailable&&<figcaption role="status">{locale==='en'?'3D rendering is unavailable. Explore the prerendered atlas with the timeline.':locale==='zh-Hant'?'無法啟用 3D 顯示；仍可用時間軸瀏覽各朝代靜態圖。':'无法启用 3D 显示；仍可用时间轴浏览各朝代静态图。'}<button type="button" onClick={()=>location.reload()}>{locale==='en'?'Retry 3D':'重试 3D'}</button></figcaption>}</figure></div>;
}
