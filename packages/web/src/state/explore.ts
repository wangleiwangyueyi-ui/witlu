import {create} from 'zustand';
import {terrainBridge} from './terrain';
import {mergeRoutes,personStops,quizDeck,sanitizeClue,normalize} from '@witlu/core/explore';
import type {Detail,Person,Journey,Stop,SearchEntry,Question,Event} from '@witlu/core/explore';
import type {Coord,Site} from '@witlu/core/places';
import {loadPlaces,usePlaces,syncPlaces} from './places';
import {loadChronicle} from '../store/chronicle';
import type {Chronicle} from '../store/chronicle';
import {timeStore,seekYear} from '../store/time';

import {useShell} from './shell';
import {historicalText} from '../i18n/history';
import type {MapPath} from '../../../engine/cartography/Paths';
export interface ExploreData {people:Person[];details:Record<string,Detail>;journeys:Journey[];events:Event[];search:SearchEntry[];questions:Question[]}
let promise:Promise<ExploreData>|undefined;
export function loadExplore():Promise<ExploreData>{return promise??=Promise.all([loadPlaces(),loadChronicle(),...['persons','person-details','journeys','pinyin','milestones'].map(async n=>{const r=await fetch('/data/'+n+'.json');if(!r.ok)throw Error(n);return r.json();})]).then(([places,rawChronicle,people,details,journeys,pinyin,milestones])=>{
 const c=rawChronicle as Chronicle;
 const profiles=people as Person[],routes=journeys as Journey[],events=[...(milestones as Event[]).map(e=>({...e,en:c.translations.en.milestones[e.dynastyKey+':'+e.year]?.[0]??e.headline??''})),...places.events] as Event[],search:SearchEntry[]=[];
 for(const p of profiles)search.push({id:'person:'+p.key,kind:'person',key:p.key,label:p.zh,en:p.en,tokens:[p.key,p.zh,p.en,...p.aliases??[],historicalText(p.zh,'zh-Hant',c)]});
 for(const p of places.gazetteer)search.push({id:'place:'+p.name,kind:'place',label:p.name,en:historicalText(p.name,'en',c),coord:p.coord,tokens:[p.name,p.modern,...p.aliases??[],historicalText(p.name,'en',c),historicalText(p.name,'zh-Hant',c)]});
 for(const p of places.passes)search.push({id:'pass:'+p.key,kind:'place',label:p.ancientZh,en:p.ancientEn,coord:p.coord,year:p.focusYear,tokens:[p.key,p.ancientZh,p.ancientEn]});
 const counts:Record<string,number>={};for(const [i,e]of events.entries()){const kind=i<milestones.length?'milestones':'landmarks',key=kind+e.dynastyKey,index=counts[key]??0;counts[key]=index+1;const label=e.headline??e.zh??'';search.push({id:'event:'+i,kind:'event',label,en:e.en??label,...(e.coord?{coord:e.coord}:{}),year:e.year,tokens:[label,e.site??'',e.siteEn??'',...pinyin[kind]?.[e.dynastyKey]?.[index]??[]]});}
 for(const era of [...c.eras.main,...c.eras.regional.flatMap(r=>r.spans)])search.push({id:'era:'+era[0]+era[1],kind:'year',year:era[0],label:era[1],tokens:[era[1],era[3],era[4],historicalText(era[1],'zh-Hant',c)]});
 search.unshift({id:'quiz',kind:'quiz',label:'舆图寻址小试',en:'Map challenge',tokens:['小试','寻址','舆图','quiz','challenge','小試','尋址']});
 const questions:Question[]=places.settlements.filter(p=>p.dynastyKey!=='prc'&&p.modern).map(p=>{const phase=c.phases.find(f=>f.dynastyKey===p.dynastyKey),event=places.events.find(e=>e.dynastyKey===p.dynastyKey&&e.site===p.ancient);return {id:p.id,ancient:p.ancient,modern:p.modern,coord:p.coord,dynastyKey:p.dynastyKey,year:phase?.from??230,tier:p.isCapital?0:event?1:2,clue:sanitizeClue(p.remark??event?.zh??'',p.modern)};});
 return {people:profiles,details,journeys:routes,events,search,questions};
 }).catch(e=>{promise=undefined;throw e;});}
interface Exploration {searchOpen:boolean;query:string;keys:string[];stops:Stop[];step:number;playing:boolean;together:boolean;story:string;error:string;quiz:Question[];question:number;guess:Coord|null;answered:boolean;score:number;lastKm:number;lastPoints:number;finished:boolean;meteor:boolean}
export const useExplore=create<Exploration>(()=>({searchOpen:false,query:'',keys:[],stops:[],step:0,playing:false,together:false,story:'',error:'',quiz:[],question:0,guess:null,answered:false,score:0,lastKm:0,lastPoints:0,finished:false,meteor:true}));
export function visibleStops(){const s=useExplore.getState();return s.together?s.stops.filter(p=>(p.owners?.length??0)>1):s.stops;}
export function routeURL(){const s=useExplore.getState(),url=new URL(location.href);for(const k of ['person','event','quiz','stop','autoplay'])url.searchParams.delete(k);if(s.quiz.length)url.searchParams.set('quiz','locate');else if(s.keys.length){url.searchParams.set(s.story?'event':'person',s.story||s.keys.join(','));url.searchParams.set('stop',String(s.step));if(s.playing)url.searchParams.set('autoplay','1');}history.replaceState(null,'',url);}
let navigationRequest=0;
export async function openPeople(keys:string[],step=0,preferredYear?:number){const request=++navigationRequest,d=await loadExplore();if(request!==navigationRequest)return;const people=keys.map(k=>d.people.find(p=>p.key===k||normalize(p.zh)===normalize(k)||normalize(p.en)===normalize(k))).filter((p):p is Person=>!!p).slice(0,3);if(!people.length){useExplore.setState({error:'Unknown person: '+keys.join(',')});return;}timeStore.setState({playing:false});const story=people.find(p=>p.isStory)?.key??'',routes=people.map(p=>personStops(p,d.journeys,d.details,d.events));useExplore.setState({keys:people.map(p=>p.key),stops:people.length===1?routes[0]!:mergeRoutes(routes),step:0,story,together:false,playing:false,quiz:[],finished:false,searchOpen:false,error:''});usePlaces.setState({selected:null,route:[]});const initial=preferredYear!=null?visibleStops().findIndex(p=>p.year===preferredYear):-1;goStop(initial>=0?initial:step);routeURL();}
export function closeExplore(){navigationRequest++;useExplore.setState({keys:[],stops:[],quiz:[],playing:false,searchOpen:false,guess:null,finished:false});usePlaces.setState({storySites:[],storyPaths:[],quizHidden:false,poem:null,selected:null,route:[]});routeURL();void syncPlaces();}
export function goStop(index:number){const stops=visibleStops(),step=Math.min(Math.max(0,index),Math.max(0,stops.length-1)),stop=stops[step];useExplore.setState({step});if(!stop)return;seekYear(stop.year);usePlaces.setState({selected:null});focusStop(stop);void syncExploration();routeURL();}
export function toggleRoute(){const s=useExplore.getState();if(!s.playing&&s.step===visibleStops().length-1)goStop(0);useExplore.setState({playing:!s.playing});routeURL();}
export async function syncExploration(){const s=useExplore.getState();if(!s.keys.length)return;const d=await loadExplore();if(s!==useExplore.getState())return;const stops=visibleStops(),current=stops[s.step];if(!current)return;const locale=useShell.getState().locale,c=await loadChronicle(),text=(zh:string,en?:string)=>locale==='en'?en??zh:historicalText(zh,locale,c),css=getComputedStyle(document.documentElement),token=(v:string)=>css.getPropertyValue(v).trim(),camps=d.details[s.story]?.camps??[],colors=['--polity-main','--polity-blue','--polity-jade'];
 const tint=(p:Stop)=>token(colors[Math.max(0,s.story?camps.findIndex(c=>c.key===p.camp):s.keys.indexOf(p.owners?.[0]??''))%colors.length]!);
 const sites:Site[]=stops.map((p,i)=>({id:'explore:'+i,name:text(p.ancientZh,p.ancientEn),en:p.ancientEn??p.ancientZh,coord:p.coord,kind:'lantern',priority:i===s.step?200:95,year:p.year,description:text(p.titleZh,p.titleEn),color:tint(p)}));
 const paths:MapPath[]=[];for(let i=1;i<=s.step;i++){const p=stops[i]!,prev=stops[p.fromStopIdx??i-1]!,owners=p.owners??[];const prior=s.keys.length>1?stops.slice(0,i).reverse().find(q=>q.owners?.some(k=>owners.includes(k))):prev;const from=p.fromCoord??prior?.coord;if(from)paths.push({id:'exploration:'+i,kind:'migration',lines:[[from,...p.via??[],p.coord]],color:i===s.step?token('--cinnabar'):tint(p),opacity:i===s.step?.85:.35});for(const [j,prong]of(p.prongs??[]).entries())paths.push({id:'prong:'+i+':'+j,kind:'migration',lines:[[prong.fromCoord,...prong.via??[],p.coord]],color:tint({...p,camp:prong.camp}),opacity:.6});}
 if(s.step>0&&s.meteor)paths.push({id:'meteor:'+s.step,kind:'meteor',lines:[[stops[s.step-1]!.coord,current.coord]],color:token('--gold-glow')});
 const poem=current.quoteZh?{...sites[s.step]!,quote:text(current.quoteZh,current.quoteEn).slice(0,60)}:null;
 usePlaces.setState({storySites:sites,storyPaths:paths,quizHidden:false,poem});void syncPlaces();
}
export async function startQuiz(){const year=useShell.getState().year,[d,c]=await Promise.all([loadExplore(),loadChronicle()]);closeExplore();timeStore.setState({playing:false});const quiz=quizDeck(d.questions),phase=c.phases.slice().reverse().find(p=>year>=p.from&&year<=p.to),preferred=d.questions.find(q=>q.dynastyKey===phase?.dynastyKey&&q.tier===0);if(preferred){const existing=quiz.findIndex(q=>q.ancient===preferred.ancient);if(existing>=0)quiz.splice(existing,1);else quiz.shift();quiz.unshift({...preferred,year});}useExplore.setState({quiz,question:0,score:0,guess:null,answered:false,finished:false,searchOpen:false});usePlaces.setState({quizHidden:true});if(quiz[0])seekYear(quiz[0].year);terrainBridge.engine?.camera.flyTo({lon:110,lat:30,distance:8200},700);routeURL();void syncPlaces();}


export function focusStop(stop:Stop){const e=terrainBridge.engine;if(!e)return;const mobile=matchMedia('(max-width:767px)').matches;e.frameSites([stop.coord],{left:mobile?30:405,top:mobile?145:115,width:Math.max(170,innerWidth-(mobile?60:445)),height:Math.max(100,innerHeight-(mobile?innerHeight*.62:420))},useShell.getState().reducedMotion?0:900);}
