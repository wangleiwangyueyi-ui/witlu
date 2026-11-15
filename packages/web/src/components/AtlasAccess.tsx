import {usePlaces} from '../state/places';
import {useChapterSettings} from '../state/chapters';
import {terrainBridge} from '../state/terrain';
import {useEffect,useState} from 'react';
import {atlasAPI,applyQuery,inspect,isRestoringQuery} from '../state/atlas-api';
import type {AtlasArgs} from '../state/atlas-api';
import {useShell} from '../state/shell';
import {useExploreText} from './Explore';
import {GlassButton} from './Glass';
interface ModelTool {name:string;description:string;inputSchema:object;annotations?:object;execute(args:AtlasArgs):Promise<unknown>}
interface ModelContext {registerTool?(tool:ModelTool,options?:{signal:AbortSignal}):void;unregisterTool?(name:string):void;provideContext?(context:{tools:ModelTool[]}):void}
declare global {interface Window {atlasAPI:typeof atlasAPI}}
export function AtlasAccess(){useEffect(()=>{
 const places=usePlaces.subscribe((s,p)=>{if(isRestoringQuery()||s.selected===p.selected)return;const url=new URL(location.href);if(s.route.length>1&&s.selected){url.searchParams.set('stop',String(Math.max(0,s.route.indexOf(s.selected))));}else if(s.selected){if(!url.searchParams.has('place')||p.selected){url.searchParams.delete('person');url.searchParams.delete('event');url.searchParams.delete('journey');url.searchParams.delete('stop');url.searchParams.delete('q');url.searchParams.set('trace',s.selected.coord.join(','));url.searchParams.delete('place');}}else if(p.selected){url.searchParams.delete('trace');if(!s.route.length)url.searchParams.delete('place');}history.replaceState(null,'',url);});
 const polity=useChapterSettings.subscribe((s,p)=>{if(isRestoringQuery()||s.selected===p.selected)return;const url=new URL(location.href);if(s.selected)url.searchParams.set('polity',s.selected);else url.searchParams.delete('polity');history.replaceState(null,'',url);});
 let cameraTimer:ReturnType<typeof setTimeout>|undefined;const camera=(event:Event)=>{if(!(event.target instanceof HTMLCanvasElement))return;clearTimeout(cameraTimer);cameraTimer=setTimeout(()=>{const pose=terrainBridge.engine?.pose();if(!pose)return;const url=new URL(location.href);url.searchParams.set('center',pose.lon.toFixed(4)+','+pose.lat.toFixed(4));url.searchParams.set('zoom',Math.min(8,Math.max(1,8200/pose.distance)).toFixed(3));history.replaceState(null,'',url);},900);};document.addEventListener('pointerup',camera);document.addEventListener('wheel',camera,{passive:true});

 window.atlasAPI=atlasAPI;
 const current=(document as Document&{modelContext?:ModelContext}).modelContext;
 const legacy=(navigator as Navigator&{modelContext?:ModelContext}).modelContext;
 const mc=current??legacy,controller=new AbortController();
 const inputSchema={type:'object',properties:{year:{type:['integer','string']},place:{type:'string'},person:{type:'string'},stop:{type:'integer'},zoom:{type:'number',minimum:1,maximum:8},lang:{type:'string'}}};
 const tools:ModelTool[]=[{name:'jiangshan_locate',description:'Locate historical places and routes on witlu.com.',inputSchema,execute:atlasAPI.locate},{name:'jiangshan_inspect',description:'Read historical regimes, eras, divisions and biographies without moving the map.',inputSchema,annotations:{readOnlyHint:true},execute:atlasAPI.inspect},{name:'jiangshan_open_person',description:'Open one to four historical biographies and their geocoded stops.',inputSchema:{...inputSchema,required:['person']},execute:args=>atlasAPI.openPerson(args.person??'',args.stop)}];
 const registered:string[]=[];for(const tool of tools){try{if(mc?.registerTool){mc.registerTool(tool,{signal:controller.signal});registered.push(tool.name);}}catch(e){console.warn('WebMCP registration unavailable',tool.name,e);}}
 if(!mc?.registerTool)mc?.provideContext?.({tools});
 const restore=()=>void applyQuery(Object.fromEntries(new URLSearchParams(location.search))).catch(console.error);window.addEventListener('popstate',restore);
 let alive=true;void inspect(Object.fromEntries(new URLSearchParams(location.search))).then(result=>{if(!alive)return;const node=document.createElement('script');node.id='atlas-inspect-json';node.type='application/json';node.textContent=JSON.stringify(result);document.getElementById(node.id)?.remove();document.body.append(node);}).catch(console.error);
 return()=>{places();polity();clearTimeout(cameraTimer);document.removeEventListener('pointerup',camera);document.removeEventListener('wheel',camera);alive=false;controller.abort();for(const name of registered)mc?.unregisterTool?.(name);window.removeEventListener('popstate',restore);document.getElementById('atlas-inspect-json')?.remove();};
 },[]);return null;}
export function EmbedControls(){const t=useExploreText(),year=useShell(s=>s.year),[active,setActive]=useState(false);const url=new URL(location.href);if(url.searchParams.get('embed')!=='1')return null;url.searchParams.delete('embed');url.searchParams.delete('lock');url.searchParams.delete('debug');url.searchParams.set('year',String(year));return <><div className="embed-title glass"><img src="/brand/seal.svg" alt="" width="32" height="32"/>江山 · {year}</div><a className="embed-open glass" href={url.href} target="_blank" rel="noopener noreferrer">{t('在江山中打开 ↗','Open full atlas ↗')}</a>{!active?<button className="embed-activate" onClick={()=>setActive(true)}>{t('点击探索地图','Click to explore map')}</button>:<GlassButton className="embed-release" onClick={()=>setActive(false)}>{t('释放滚动','Release scrolling')}</GlassButton>}</>;}
