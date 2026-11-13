import { create } from 'zustand';
import { STORIES, WEATHER_EFFECTS, safeMood } from '@witlu/core/weather';
import type { Mood, Story, WeatherEffect, WeatherEvent } from '@witlu/core/weather';
import { indexToYear } from '@witlu/core/time';
import { terrainBridge } from './terrain';
import { timeStore, seekYear } from '../store/time';
import { loadChronicle } from '../store/chronicle';
import type { Chronicle } from '../store/chronicle';
import { useChapterSettings } from './chapters';
import { useShell } from './shell';
import { frameSites } from './camera-story';
export const useWeatherSettings=create<{enabled:boolean;effects:Record<WeatherEffect,boolean>;busy:boolean;caption:string;error:string;sequence:string;toggle:(key:WeatherEffect)=>void}>(set=>({enabled:true,effects:Object.fromEntries(WEATHER_EFFECTS.map(k=>[k,true]))as Record<WeatherEffect,boolean>,busy:false,caption:'',error:'',sequence:'',toggle:key=>set(s=>({effects:{...s.effects,[key]:!s.effects[key]}}))}));
export const storyLock={active:false,generation:0};
let moods:Promise<WeatherEvent[]>|null=null;
export function loadMoods():Promise<WeatherEvent[]>{return moods??=Promise.all([fetch('/data/moods.json').then(r=>{if(!r.ok)throw Error('moods.json');return r.json()as Promise<WeatherEvent[]>;}),loadChronicle() as Promise<Chronicle>]).then(([entries,chronicle])=>{const coords=new Map(chronicle.events.map(e=>[e.id,e.coord]));return entries.map(e=>({...e,...(coords.get(e.id)?{coord:coords.get(e.id)!}:{}),mood:safeMood(e)}));}).catch(e=>{moods=null;throw e;});}
export const WEATHER_SCENARIOS = [
  {key:'qin',id:'milestones:zhanguo:28',year:-230,title:['秦灭六国','秦滅六國','Qin unification'],story:'qin'},
  {key:'jingkang',id:'milestones:beisong:34',year:1127,title:['靖康之变','靖康之變','Jingkang'],story:'jingkang'},
  {key:'yashan',id:'milestones:nansong:29',year:1279,title:['崖山海战','崖山海戰','Yashan']},
  {key:'chibi',id:'milestones:donghan:29',year:208,title:['赤壁之战','赤壁之戰','Red Cliffs']},
  {key:'zhenguan',id:'milestones:tang:4',year:627,title:['贞观之治','貞觀之治','Zhenguan prosperity']},
  {key:'bluepass',id:'landmark:tang:819:115',year:819,title:['雪拥蓝关','雪擁藍關','Snow at Blue Pass']}
] as const;
export function stopWeather(){storyLock.generation++;storyLock.active=false;terrainBridge.engine?.weather.director.cancel();useWeatherSettings.setState({busy:false,sequence:'',caption:''});}
const wait=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
export async function playWeatherScenario(key:string){
  const engine=terrainBridge.engine,item=WEATHER_SCENARIOS.find(s=>s.key===key);if(!engine||!item||storyLock.active)return;
  if(engine.weather.stats().cooldownMs>0){useWeatherSettings.setState({error:'cooldown'});return;}
  const generation=++storyLock.generation;storyLock.active=true;useWeatherSettings.setState({busy:true,error:'',sequence:key,caption:''});timeStore.setState({playing:false,velocity:0,scrubbing:false});
  const alive=()=>storyLock.generation===generation&&terrainBridge.engine===engine;
  try{
    const [entries,data]=await Promise.all([loadMoods(),loadChronicle() as Promise<Chronicle>]);if(!alive())return;const event=entries.find(e=>e.id===item.id);if(!event)throw Error(`Missing event: ${item.id}`);
    const story:Story|null='story'in item?item.story:null;
    const initial=story==='qin'?'s_zhanguo_d':story==='jingkang'?'s_beisong_d':data.phases.find(p=>item.year>=p.from&&item.year<p.to)?.snapshot;
    if(!initial)throw Error('Missing starting snapshot');
    await engine.morph.prepare(initial,initial);if(!alive())return;engine.morph.setProgress(0,'seek');
    if(story)engine.camera.flyTo({pitch:45,bearing:0},0);
    const coord=event.coord??[112,34];engine.camera.flyTo({lon:story==='qin'?114:coord[0],lat:story==='qin'?33:coord[1],distance:story==='qin'?6000:story==='jingkang'?4000:2600,pitch:45,bearing:0},600);
    if(location.pathname==='/')frameSites(story==='qin'?[[105,30],[119,39]]:story==='jingkang'?[[114.31,34.8],[120.15,30.27]]:[coord],600);
    if(story)for(const cue of STORIES[story])if(cue.snapshot)engine.morph.prefetchGeometry(initial,cue.snapshot);
    seekYear(story==='qin'?-231:item.year);useShell.getState().setYear(story==='qin'?-231:item.year);
    engine.prepareWeather();
    // Finish camera movement, tile uploads and optional idle prewarming before
    // starting the narrative clock. Weather animation itself never pauses.
    const preparingSince=performance.now();let stableSince=0,lastPose='';
    while(alive()&&performance.now()-preparingSince<15000){const pose=Object.values(engine.pose()).map(n=>n.toFixed(3)).join(','),ready=engine.terrain.loading===0&&engine.terrain.visible.length>0&&!engine.morph.stats().backgroundPreparing;if(ready&&pose===lastPose){stableSince||=performance.now();if(performance.now()-stableSince>500)break;}else stableSince=0;lastPose=pose;await wait(80);}
    if(!alive())return;
    engine.weather.director.speed=timeStore.getState().speed;
    if(!engine.weather.trigger(story==='qin'?{...event,mood:'war'}:event,story))throw Error('cooldown');
    useWeatherSettings.setState({busy:false,caption:event.title});let previous=initial;
    for(const cue of story?STORIES[story]:[]){
      while(alive()&&engine.weather.director.sample(performance.now(),engine.quality.level).seconds<cue.at)await wait(16);
      if(!alive())return;
      if(cue.snapshot&&cue.snapshot!==previous){
        // Preserve ordered narrative beats when a device needs longer to prepare an SDF.
        const paused=performance.now();engine.weather.director.pause(paused);useWeatherSettings.setState({busy:true});
        await engine.morph.prepare(previous,cue.snapshot);engine.weather.director.resume(performance.now());if(!alive())return;
        if(engine.morph.stats().error)throw Error(engine.morph.stats().error!);engine.morph.playPrepared(false,1000);previous=cue.snapshot;useWeatherSettings.setState({busy:false});
      }
      seekYear(cue.year);useShell.getState().setYear(cue.year);useWeatherSettings.setState({caption:cue.label});
      if(cue.action==='wall'){if(location.pathname==='/')frameSites([[105,35],[120,42]],1100);else engine.camera.flyTo({lon:114,lat:36,distance:6500,pitch:45},1100);useChapterSettings.getState().replayOpening();}
      if(cue.action==='capital'){if(location.pathname==='/')frameSites([cue.coord],1100);else engine.camera.flyTo({lon:117,lat:32,distance:4000},1100);}
    }
    while(alive()&&engine.weather.director.sample(performance.now(),engine.quality.level).seconds<(story==='qin'?14.3:7.3))await wait(50);
    if(alive()){storyLock.active=false;useWeatherSettings.setState({sequence:'',busy:false});}
  }catch(e){if(alive()){storyLock.active=false;engine.weather.director.resume(performance.now());useWeatherSettings.setState({busy:false,sequence:'',error:String(e)});}}
}
export async function triggerMood(mood:Mood){
  const engine=terrainBridge.engine;if(!engine||storyLock.active)return;
  const ok=engine.weather.trigger({id:`preview:${mood}`,title:mood==='poetic'?'兰亭集序':mood,year:indexToYear(Math.floor(timeStore.getState().index)),mood});useWeatherSettings.setState({error:ok?'':'cooldown'});
}
