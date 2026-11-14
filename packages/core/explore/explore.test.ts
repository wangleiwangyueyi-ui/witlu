import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {personStops,mergeRoutes,resolvePeople,searchEntries,quizPoints,quizRank,greatCircleKm,quizDeck,sanitizeClue} from './index';
import type {Person,Journey,Detail,Event,Question} from './index';
const read=(name:string)=>JSON.parse(fs.readFileSync(new URL('../../web/public/data/'+name+'.json',import.meta.url),'utf8'));
const people=read('persons') as Person[],journeys=read('journeys') as Journey[],details=read('person-details') as Record<string,Detail>,events=[...read('milestones'),...read('landmark-events')] as Event[];
describe('upstream exploration parity',()=>{
 it('preserves every curated station and both complete campaign narratives',()=>{for(const j of journeys)expect(personStops(people.find(p=>p.key===j.key)!,journeys,details,events)).toHaveLength(j.stops.length);for(const key of ['anshi','jingkang'])expect(personStops(people.find(p=>p.key===key)!,journeys,details,events)).toHaveLength(10);});
 it('finds generic figures and merges shared places without crossing years or mutating sources',()=>{for(const key of ['caocao','dufu','yuefei','zhenghe'])expect(personStops(people.find(p=>p.key===key)!,journeys,details,events).length).toBeGreaterThan(0);const routes=['libai','dufu','gaoshi'].map(key=>personStops(people.find(p=>p.key===key)!,journeys,details,events));const before=JSON.stringify(routes),merged=mergeRoutes(routes);expect(merged.some(p=>(p.owners?.length??0)>1)).toBe(true);expect(JSON.stringify(routes)).toBe(before);expect(merged.every((s,i)=>!i||s.year>=merged[i-1]!.year)).toBe(true);});
 it('resolves names, aliases, pinyin and at most three people',()=>{expect(resolvePeople('李白 杜甫 高适',people).map(p=>p.key)).toEqual(['libai','dufu','gaoshi']);expect(resolvePeople('Li Bai Du Fu',people).map(p=>p.key)).toEqual(['libai','dufu']);expect(resolvePeople('曹操,liubei,孙权',people).map(p=>p.key)).toEqual(['caocao','liubei','sunquan']);expect(searchEntries('chi bi',[{id:'1',kind:'event',label:'赤壁之战',tokens:['赤壁之战','chibizhizhan']}])).toHaveLength(1);});
});
describe('map challenge',()=>{
 it('scores exact upstream distance thresholds',()=>{expect([0,80,81,200,201,380,381,600,601].map(quizPoints)).toEqual([100,100,80,80,55,55,25,25,0]);expect([850,849,650,649,400,399].map(quizRank)).toEqual([0,1,1,2,2,3]);});
 it('uses spherical distance, symmetric across hemispheres and the date line',()=>{expect(greatCircleKm([0,0],[0,0])).toBe(0);expect(greatCircleKm([179,0],[-179,0])).toBeCloseTo(222.39,1);expect(greatCircleKm([110,30],[115,40])).toBe(greatCircleKm([115,40],[110,30]));});
 it('builds ten unique questions with 4/4/2 difficulty and fallback',()=>{const pool:Question[]=Array.from({length:30},(_,i)=>({id:String(i),ancient:'城'+i,modern:'今城',coord:[110,30],dynastyKey:'tang',clue:'',year:700,tier:i%3}));const deck=quizDeck(pool,()=>.4);expect(deck).toHaveLength(10);expect([0,1,2].map(t=>deck.filter(q=>q.tier===t).length)).toEqual([4,4,2]);expect(quizDeck(pool.map(q=>({...q,tier:0})),()=>.4)).toHaveLength(10);});
 it('removes modern location disclosures',()=>{expect(sanitizeClue('汉代都城（今陕西西安）。今属陕西西安市，古称长安。','陕西西安')).not.toMatch(/陕西|西安|今属/);});
});
