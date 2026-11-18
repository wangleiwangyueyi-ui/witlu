import {parseDeepLink} from '@witlu/core/deep-link';
import type {Query} from '@witlu/core/deep-link';
import {atPoint,distance} from '@witlu/core/places';
import type {Site} from '@witlu/core/places';
import {phaseAtYear,eraAt,yearToIndex,parseHistoricalYear} from '@witlu/core/time';
import type {SearchEntry} from '@witlu/core/explore';
import {normalize,personStops,mergeRoutes,greatCircleKm,resolvePeople,searchEntries} from '@witlu/core/explore';
import type {Chronicle} from '../store/chronicle';
import {loadChronicle} from '../store/chronicle';
import {loadExplore,openPeople,startQuiz,useExplore} from './explore';
import {loadPlaces,findPlace,openPlace,snapshotData,usePlaces,inspectCoordinate} from './places';
import {historicalText} from '../i18n/history';
import {useShell} from './shell';
import {seekYear,timeStore,lockTime} from '../store/time';
import {frameSites} from './camera-story';
import {terrainBridge} from './terrain';
import {useChapterSettings} from './chapters';
const toHans=(value:string,c:Chronicle)=>[...value].map(char=>Object.entries(c.translations.hant.CHAR_S2T).find(([,v])=>v===char)?.[0]??char).join('');
export interface AtlasArgs {year?:number|string;place?:string;lng?:number;lat?:number;zoom?:number;person?:string;stop?:number;lang?:string}
export async function resolvePlace(name:string,year=useShell.getState().year):Promise<Site|null>{
 const [d,c]=await Promise.all([loadPlaces(),loadChronicle()]);
 const simple=toHans(name,c);
 const fold=(s:string)=>normalize(s).replace(/[-_.]/g,'');
 const canonical=d.settlements.filter(s=>s.ancient===simple||(s.aliases?.includes(simple)&&c.phases.some(p=>p.dynastyKey===s.dynastyKey&&p.from<=year&&p.to>=year))).sort((a,b)=>Number(c.phases.some(p=>p.dynastyKey===b.dynastyKey&&p.from<=year&&p.to>=year))-Number(c.phases.some(p=>p.dynastyKey===a.dynastyKey&&p.from<=year&&p.to>=year)))[0];
 let site:Site|null=canonical?{id:canonical.id,name:canonical.ancient,coord:canonical.coord,modern:canonical.modern,kind:canonical.isCapital?'seal':'bead',priority:120}:findPlace(d,simple);
 if(!site){const gaz=d.gazetteer.find(g=>g.asciiAliases?.some(a=>fold(a)===fold(simple)));if(gaz)site=findPlace(d,gaz.name);}
 if(!site){const names=[...d.gazetteer.flatMap(g=>[g.name,...g.aliases??[]]),...d.settlements.map(s=>s.ancient),...d.passes.map(p=>p.ancientZh)];const match=names.find(n=>[n,historicalText(n,'en',c)].some(s=>fold(s)===fold(simple)));if(match)site=findPlace(d,match);}
 if(!site)return null;
 const settlement=d.settlements.find(s=>s.ancient===site!.name&&c.phases.some(p=>p.dynastyKey===s.dynastyKey&&p.from<=year&&p.to>=year));
 return {...site,coord:settlement?.coord??site.coord,en:site.en??historicalText(site.name,'en',c),year};
}
const queryArgs=(args:AtlasArgs):Query=>Object.fromEntries(Object.entries(args).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)]));
export async function inspect(args:AtlasArgs={}){
 const [c,d,e]=await Promise.all([loadChronicle(),loadPlaces(),loadExplore()]);
 const link=parseDeepLink({...queryArgs(args),year:args.year===undefined?undefined:toHans(String(args.year),c)},c.eras),locale=link.locale??useShell.getState().locale;
 const people=link.person?resolvePeople(toHans(link.person,c),e.people):[],biographies=people.map(p=>({...p,stops:personStops(p,e.journeys,e.details,e.events)}));
 const stops=biographies.length>1?mergeRoutes(biographies.map(p=>p.stops)):biographies[0]?.stops??[],stop=Math.min(Math.max(0,link.stop??0),Math.max(0,stops.length-1)),active=stops[stop];
 const year=link.years[0]??active?.year??useShell.getState().year,phase=phaseAtYear(year,c.phases),dynasty=c.dynasties.find(d=>d.key===c.phases.find(p=>p.snapshot===phase?.snapshot)?.dynastyKey);
 const text=(value:string)=>historicalText(value,locale,c);
 const context=async(coord:[number,number],year:number)=>{
   const phase=phaseAtYear(year,c.phases),geo=phase?await snapshotData(phase.snapshot):{features:[]},hits=atPoint(geo,coord),era=eraAt(yearToIndex(year),c.eras.main);
   const city=d.settlements.filter(s=>c.phases.some(p=>p.dynastyKey===s.dynastyKey&&p.from<=year&&p.to>=year)).sort((a,b)=>distance(a.coord,coord)-distance(b.coord,coord))[0];
   const lore=d.lore.slice().sort((a,b)=>distance(a.coord,coord)-distance(b.coord,coord))[0];
   return {era:era?[locale==='en'?era.rulerEn:text(era.ruler),text(era.name),String(era.ordinal)].join(' · '):'',polity:hits.filter(f=>f.properties.layer==='polity').map(f=>text(f.properties.title??'')).join(' / ')||null,regions:hits.filter(f=>f.properties.layer==='region').map(f=>text(f.properties.title??'')),prefectures:hits.filter(f=>f.properties.layer==='prefecture').map(f=>text(f.properties.title??'')),modernProvince:atPoint(d.modern,coord).map(f=>text(f.properties.title??'')).join(' / ')||null,nearestCity:city&&distance(city.coord,coord)<80?{...city,distanceKm:Math.round(distance(city.coord,coord))}:null,lore:lore&&distance(lore.coord,coord)<40?{...lore,tag:locale==='en'?lore.tagEn:text(lore.tagZh),desc:locale==='en'?lore.descEn:text(lore.descZh)}:null};
 };
 const tracks=await Promise.all(link.tracks.map(async(track,trackIdx)=>Promise.all(track.map(async(p,trackStep)=>{
   const stationYear=p.year??year,site=await resolvePlace(p.place,stationYear);if(!site)return {query:p.place,found:false as const};
   return {...site,found:true as const,place:p.place,resolvedName:locale==='en'?site.en??site.name:text(site.name),trackIdx,trackStep:trackStep+1,...await context(site.coord,stationYear)};
 }))));
 let totalKm=0;
 const route=tracks.flatMap(track=>track.filter(s=>s.found).map((s,i,all)=>{const km=i?Math.round(greatCircleKm(all[i-1]!.coord,s.coord)):0;totalKm+=km;return {...s,distanceFromPrevKm:km};}));
 const coord=link.point??route[0]?.coord??active?.coord;
 const info=coord?await context(coord,year):{era:'',polity:null,regions:[],prefectures:[],modernProvince:null,nearestCity:null,lore:null};
 const person=people.length?{key:people.map(p=>p.key).join(','),zh:people.map(p=>p.zh).join(' · '),en:people.map(p=>p.en).join(' · '),profiles:biographies,stop,totalEvents:stops.length,events:stops.map((s,index)=>({index,...s,site:locale==='en'?s.ancientEn??s.ancientZh:text(s.ancientZh),text:locale==='en'?s.titleEn??s.titleZh:text(s.titleZh),quote:locale==='en'?s.quoteEn:s.quoteZh})),encounters:stops.filter(s=>(s.owners?.length??0)>1)}:null;
 const url=new URL('/', 'https://witlu.com');for(const [k,v]of Object.entries(queryArgs(args)))if(v!==undefined)url.searchParams.set(k,v);
 return {year,years:route.map(s=>s.year),snapshot:phase?.snapshot,dynasty:dynasty?{key:dynasty.key,title:text(dynasty.title),seat:text(dynasty.seat),span:[dynasty.fromYear,dynasty.toYear]}:null,place:args.place??null,resolvedName:route[0]?.resolvedName??active?.ancientZh??null,modern:route[0]?.modern??null,coord:coord??null,zoom:link.zoom??2.5,...info,tracks,route,routeDistanceKm:totalKm,...person?{person}:{},url:url.href,disclaimer:'历史疆域为示意性近似，非测绘边界',credits:'DeanChensj/jiangshan-map · CHGIS'};
}
export async function locate(args:AtlasArgs){const q=queryArgs(args),url=new URL(location.href);url.search='';for(const [k,v]of Object.entries(q))if(v!==undefined)url.searchParams.set(k,v);history.replaceState(null,'',url);await applyQuery(q);return inspect(args);}
export async function search(query:string):Promise<SearchEntry[]>{const [e,c]=await Promise.all([loadExplore(),loadChronicle()]),simple=toHans(query,c),years=parseHistoricalYear(simple,c.eras);return [...years.map(y=>({id:'year:'+y.year,kind:'year' as const,label:y.label,year:y.year,tokens:[simple]})),...searchEntries(simple,e.search)];}
export async function openPerson(person:string,stop=0){const [e,c]=await Promise.all([loadExplore(),loadChronicle()]),people=resolvePeople(toHans(person,c),e.people);await openPeople(people.map(p=>p.key),stop);if(stop<0)frameSites(useExplore.getState().stops.map(s=>s.coord),0);return inspect({person,stop});}
export const atlasAPI={locate,inspect,resolvePlace:async(name:string,year?:number)=>{const site=await resolvePlace(name,year);return site?{...site,lng:site.coord[0],lat:site.coord[1],zoom:2.5}:null;},openPerson,search};
/** One restoration path for URL entry, browser history and programmatic navigation. */
let restoring=false;
export const isRestoringQuery=()=>restoring;
export async function applyQuery(q:Query){restoring=true;try{return await restoreQuery(q);}finally{restoring=false;}}
async function restoreQuery(q:Query){
 lockTime(undefined);
 useExplore.setState({keys:[],stops:[],playing:false,story:'',quiz:[]});usePlaces.setState({selected:null,storySites:[],storyPaths:[],quizHidden:false,hover:''});useChapterSettings.getState().select(null);
 const c=await loadChronicle(),link=parseDeepLink({...q,year:q.year?toHans(q.year,c):undefined},c.eras);
 if(link.locale)useShell.getState().setLocale(link.locale);
 if(link.years[0]){useShell.getState().setYear(link.years[0]);seekYear(link.years[0]);}
 const tracks=await Promise.all(link.tracks.map(track=>Promise.all(track.map(p=>resolvePlace(p.place,p.year??link.years[0]??useShell.getState().year)))));
 const validTracks=tracks.map(t=>t.filter((s):s is Site=>!!s)),route=validTracks.flat();
 usePlaces.setState({route,routeTracks:validTracks});
 if(route[0]){openPlace(route[Math.max(0,Math.min(route.length-1,link.stop??0))]!,false);frameSites(route.map(s=>s.coord),0);}
 const point=link.point??link.trace;if(point){openPlace({id:'trace',name:point.map(v=>v.toFixed(3)).join('° · ')+'°',coord:point,kind:'bead',priority:150},false);frameSites([point],0);}
 if(link.person){const e=await loadExplore(),people=resolvePeople(toHans(link.person,c),e.people);await openPeople(people.length?people.map(p=>p.key):[link.person],link.stop??0,link.stop===undefined?link.years[0]:undefined);if((link.stop??0)<0)frameSites(useExplore.getState().stops.map(s=>s.coord),0);}
 if(link.quiz)await startQuiz();
 if(link.search){const hits=await search(link.search),hit=hits[0],e=await loadExplore(),people=resolvePeople(toHans(link.search,c),e.people);useExplore.setState({query:link.search});if(people.length>1)await openPeople(people.map(p=>p.key));else if(hit?.kind==='person')await openPerson(hit.key!);else if(hit?.kind==='quiz')await startQuiz();else if(hit){if(hit.year)seekYear(hit.year);if(hit.coord)openPlace({id:hit.id,name:hit.label,coord:hit.coord,kind:'scroll',priority:150,...(hit.year?{year:hit.year}:{})});}else useExplore.setState({searchOpen:true});}
 if(link.polity){const p=c.registry.find(p=>p.key===link.polity||p.titles.includes(link.polity!));if(p)useChapterSettings.getState().select(p.key);}
 if(link.hover){useShell.setState(s=>({layers:{...s.layers,prefectures:true}}));const phase=phaseAtYear(useShell.getState().year,c.phases);if(phase){const geo=await snapshotData(phase.snapshot),fold=(s:string)=>normalize(s).replace(/(?:prefecture|commandery|province|fu|zhou|jun|州|府|郡)$/i,'');const f=geo.features.find(f=>[f.properties.title??'',historicalText(f.properties.title??'','en',c),historicalText(f.properties.title??'','zh-Hant',c)].some(n=>fold(n)===fold(link.hover!)));if(f?.properties.anchor){frameSites([f.properties.anchor],0);usePlaces.setState({hover:await inspectCoordinate(f.properties.anchor)});}else usePlaces.setState({hover:f?.properties.title??link.hover});}}
 const engine=terrainBridge.engine;if(link.center||link.zoom)engine?.camera.flyTo({...link.center?{lon:link.center[0],lat:link.center[1]}:{},...link.zoom?{distance:8200/link.zoom}:{}},0);
 if(link.layers)window.dispatchEvent(new Event('atlas:open-layers'));
 if(link.chronicle)window.dispatchEvent(new Event('atlas:open-chronicle'));
 if(link.legend)window.dispatchEvent(new Event('atlas:open-legend'));
 if(link.autoplay&&!link.locked){if(useExplore.getState().keys.length)useExplore.setState({playing:true});else timeStore.setState({playing:true,mode:'play'});}
 lockTime(link.locked?useShell.getState().year:undefined);
 return link;
}
