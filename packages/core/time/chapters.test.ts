import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { activeTracks, buildTour, sameYearSites } from './chapters';
import type { Chapter, ChapterPhase, ChronicleEvent, RegistryPolity } from './chapters';
import type { Eras } from './chronology';
const read=(name:string)=>JSON.parse(readFileSync(new URL(`../../web/public/data/${name}.json`,import.meta.url),'utf8'));
const phases=read('phases') as ChapterPhase[], chapters=read('dynasties') as Chapter[], events=read('events') as ChronicleEvent[], registry=read('polities') as RegistryPolity[], eras=read('eras') as Eras;
describe('P6 parallel chronicles',()=>{
  it.each([[230,4],[500,3],[950,12],[1140,4],[-100,1]])('preserves every active main/rival at %s', (year,count)=>{
    const phase=phases.slice().reverse().find(p=>p.from<=year)!;
    const tracks=activeTracks(year,phase,registry,eras,events);
    expect(tracks).toHaveLength(count);expect(new Set(tracks.map(t=>t.polity.key)).size).toBe(count);
    expect(tracks.every(t=>['main','rival'].includes(t.occurrence.role))).toBe(true);
  });
  it('keeps simultaneous Cao Wei, Shu Han and Wu rulers',()=>{
    const tracks=activeTracks(230,phases.slice().reverse().find(p=>p.from<=230)!,registry,eras,events);
    expect(tracks.map(t=>t.era?.ruler).join('|')).toMatch(/魏明帝/);
    expect(tracks.map(t=>t.era?.ruler).join('|')).toMatch(/蜀汉后主/);
    expect(tracks.map(t=>t.era?.ruler).join('|')).toMatch(/吴大帝/);
  });
  it('narrates all 18 chapters and all phases, without duplicate events',()=>{
    const stops=buildTour(chapters,phases,events);
    expect(stops.filter(s=>s.kind==='chapter').map(s=>s.chapter)).toEqual(chapters.map(c=>c.key));
    expect(stops.filter(s=>s.kind==='phase')).toHaveLength(phases.length);
    const narrated=stops.flatMap(s=>s.event?[s.event]:[]),milestones=events.filter(e=>e.kind==='milestone');
    expect(new Set(narrated).size).toBe(narrated.length);
    expect(narrated.sort()).toEqual(milestones.map(e=>e.id).sort());
    expect(stops.every(s=>s.year!==0)).toBe(true);
  });
  it('deduplicates all same-year geographic sites, ignoring unrelated years',()=>{
    const event={id:'a',year:1140,title:'test',kind:'milestone',regime:null,importance:1,dynastyKey:'nansong'};
    expect(sameYearSites(1140,[{...event,coord:[110,30]},{...event,siteCoords:[[110,30],[120,32]]},{...event,year:1141,coord:[100,20]}])).toEqual([[110,30],[120,32]]);
    expect(sameYearSites(1140,events).length).toBeGreaterThanOrEqual(3);
  });
});
