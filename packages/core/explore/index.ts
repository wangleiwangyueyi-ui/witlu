import { distance } from '../places';
import type { Coord } from '../places';
export interface Person {key:string;zh:string;en:string;aliases?:string[];tokens?:string[];span:[number,number];isStory?:boolean}
export interface Stop {year:number;coord:Coord;ancientZh:string;ancientEn?:string;titleZh:string;titleEn?:string;descZh?:string;descEn?:string;quoteZh?:string;quoteEn?:string;eraZh?:string;subEraZh?:string;actZh?:string;actEn?:string;camp?:string;persons?:string[];fromCoord?:Coord;fromStopIdx?:number;via?:Coord[];prongs?:{fromCoord:Coord;via?:Coord[];camp:string}[];owners?:string[]}
export interface Journey {key:string;stops:Stop[];titleZh?:string;titleEn?:string}
export interface Detail {tokens?:string[];stops?:Stop[];descZh?:string;descEn?:string;camps?:{key:string;zh:string;en:string}[]}
export interface Event {year:number;coord?:Coord;site?:string;siteEn?:string;title?:string;headline?:string;zh?:string;en?:string;persons?:string[];dynastyKey:string}
export const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f\s'’·,，]/g,'').toLowerCase();
export function resolvePeople(text:string,people:Person[]):Person[]{const aliases=people.flatMap(p=>[p.en,...p.aliases??[]].filter(n=>n.includes(' ')).map(n=>({name:n,key:p.key}))).sort((a,b)=>b.name.length-a.name.length);let input=text.trim();for(const alias of aliases)input=input.replaceAll(alias.name,alias.key);const names=input.split(/[\s,，、]+/);return [...new Set(names.map(n=>people.find(p=>[p.key,p.zh,p.en,...p.aliases??[]].some(a=>normalize(a)===normalize(n)))).filter((p):p is Person=>!!p))].slice(0,3);}
/** Curated routes take precedence; all other biographies collect tagged and token-matched source events. */
export function personStops(person:Person,journeys:Journey[],details:Record<string,Detail>,events:Event[]):Stop[]{
 const curated=details[person.key]?.stops??journeys.find(j=>j.key===person.key)?.stops;if(curated)return curated.map(s=>({...s,owners:[person.key]}));
 const tokens=details[person.key]?.tokens??person.tokens??[person.zh];const found:Stop[]=[];
 for(const e of events){const title=e.title??e.zh??e.headline??'';if(!e.coord||!(e.persons?.includes(person.key)||tokens.some(t=>t&&title.includes(t))))continue;if(found.some(s=>s.year===e.year&&s.titleZh===title))continue;found.push({year:e.year,coord:e.coord,ancientZh:e.site??'',ancientEn:e.siteEn??e.site??'',titleZh:title,titleEn:e.en??title,owners:[person.key]});}
 for(const j of journeys)for(const s of j.stops)if(s.persons?.includes(person.key)&&!found.some(f=>f.year===s.year&&f.titleZh===s.titleZh))found.push({...s,owners:[person.key]});
 return found.sort((a,b)=>a.year-b.year);
}
export function mergeRoutes(routes:Stop[][]):Stop[]{const merged:Stop[]=[];for(const s of routes.flat().sort((a,b)=>a.year-b.year)){const old=merged.find(p=>p.year===s.year&&distance(p.coord,s.coord)<20);if(old){old.owners=[...new Set([...old.owners??[],...s.owners??[]])];if(!old.titleZh.includes(s.titleZh)){old.titleZh+=' / '+s.titleZh;old.titleEn=[old.titleEn,s.titleEn].filter(Boolean).join(' / ');}}else merged.push({...s,owners:[...s.owners??[]]});}return merged;}
export interface SearchEntry {id:string;kind:'person'|'event'|'place'|'year'|'quiz';label:string;en?:string;tokens:string[];year?:number;coord?:Coord;key?:string}
export function searchEntries(query:string,entries:SearchEntry[],limit=30){const q=normalize(query);if(!q)return [];return entries.map(e=>({e,rank:e.tokens.reduce((best,t)=>{const n=normalize(t);return Math.min(best,n===q?0:n.startsWith(q)?1:n.includes(q)?2:9);},9)})).filter(r=>r.rank<9).sort((a,b)=>a.rank-b.rank).slice(0,limit).map(r=>r.e);}
export function greatCircleKm(a:Coord,b:Coord){const rad=Math.PI/180,dlat=(b[1]-a[1])*rad,dlon=(b[0]-a[0])*rad,h=Math.sin(dlat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dlon/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));}
export function quizPoints(km:number){return km<=80?100:km<=200?80:km<=380?55:km<=600?25:0;}
export function quizRank(score:number){return score>=850?0:score>=650?1:score>=400?2:3;}
export interface Question {id:string;ancient:string;modern:string;coord:Coord;dynastyKey:string;clue:string;tier:number;year:number}
export function sanitizeClue(clue:string,modern:string){let text=clue.replace(/[（(][^）)]*(?:今|现代|现属)[^）)]*[）)]/g,'').replace(/今[^，。；、]*/g,'');for(const name of [modern,...modern.split(/[省市县区\s·]+/)].filter(n=>n.length>1))text=text.split(name).join('某地');return text;}
export function quizDeck(pool:Question[],random:()=>number=Math.random){const available=[...pool].filter((q,i,a)=>a.findIndex(p=>p.ancient===q.ancient)===i);for(let i=available.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[available[i],available[j]]=[available[j]!,available[i]!];}const chosen:Question[]=[];for(const [tier,count]of [4,4,2].entries()){for(const q of available.filter(q=>q.tier===tier).slice(0,count))chosen.push(q);}for(const q of available)if(chosen.length<10&&!chosen.includes(q))chosen.push(q);return chosen;}
