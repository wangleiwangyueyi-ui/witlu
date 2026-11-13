import { useEffect,useRef } from 'react';
import { indexToYear } from '@witlu/core/time';
import { WEATHER_EFFECTS } from '@witlu/core/weather';
import type { Mood } from '@witlu/core/weather';
import { terrainBridge } from '../state/terrain';
import { timeStore } from '../store/time';
import { weatherMixer,useAudioState } from '../audio/WeatherMixer';
import { loadMoods,playWeatherScenario,stopWeather,storyLock,triggerMood,useWeatherSettings,WEATHER_SCENARIOS } from '../state/weather';
import { useShell } from '../state/shell';
import { GlassButton } from './Glass';
import { Toggle } from './Toolbar';
const words={rain:['雨','雨','Rain'],snow:['雪','雪','Snow'],petals:['花瓣','花瓣','Petals'],dust:['光尘','光塵','Light dust'],sparks:['火星','火星','Sparks'],smoke:['烟尘','煙塵','Smoke'],ripples:['雨点涟漪','雨點漣漪','Rain ripples'],lightning:['闪电与补光','閃電與補光','Lightning & flash'],rays:['丁达尔光束','丁達爾光束','Light shafts'],fire:['江面火光','江面火光','River fire'],flood:['洪水漫延','洪水漫延','River flooding'],shake:['轻震','輕震','Camera tremor'],sky:['天空预设','天空預設','Sky presets'],wall:['长城初起','長城初起','Rising Great Wall'],sorrow:['悲恸','悲慟','Sorrow'],solemn:['肃穆','肅穆','Solemn'],war:['战火','戰火','War'],glory:['盛世','盛世','Glory'],voyage:['远行','遠行','Voyage'],poetic:['诗意','詩意','Poetic'],disaster:['天灾','天災','Disaster'],none:['晴天','晴天','Clear']}as const;
export function WeatherDriver(){
  useEffect(()=>{
    let alive=true,entries:Awaited<ReturnType<typeof loadMoods>>=[],lastYear:number|null=null,timer:ReturnType<typeof setTimeout>|undefined;
    const sync=()=>{const engine=terrainBridge.engine;if(!engine)return;const settings=useWeatherSettings.getState();const mood=engine.weather.stats();const root=document.querySelector('[data-capture-root]'),name=mood.active?mood.mood:'none';if(root?.getAttribute('data-weather-mood')!==name)root?.setAttribute('data-weather-mood',name);engine.weather.director.effects={...settings.effects};engine.weather.director.speed=timeStore.getState().speed;engine.weather.onAudio=cue=>weatherMixer.update(cue);if(!settings.enabled){engine.weather.director.cancel();return;}
      const s=timeStore.getState(),year=indexToYear(Math.floor(s.index));if(storyLock.active){lastYear=year;return;}if(year===lastYear||s.scrubbing||Math.abs(s.velocity)>0||!entries.length)return;lastYear=year;clearTimeout(timer);const event=entries.filter(e=>e.year===year&&e.mood!=='none').sort((a,b)=>Number(b.mood==='solemn')-Number(a.mood==='solemn'))[0];if(s.playing){if(event)engine.weather.trigger(event);}else timer=setTimeout(()=>{if(alive&&!storyLock.active&&event)engine.weather.trigger(event);},250);
    };
    loadMoods().then(d=>{if(alive){entries=d;sync();}}).catch(e=>useWeatherSettings.setState({error:String(e)}));
    const off=terrainBridge.subscribe(sync),time=timeStore.subscribe(sync),settings=useWeatherSettings.subscribe(sync);sync();
    return()=>{alive=false;clearTimeout(timer);off();time();settings();stopWeather();weatherMixer.update({rain:0,wind:0,waves:0,thunder:false,delay:.8,quiet:true});};
  },[]);return null;
}
export function WeatherControls(){
  const s=useWeatherSettings(),locale=useShell(v=>v.locale),language=locale==='en'?2:locale==='zh-Hant'?1:0,audio=useAudioState(),out=useRef<HTMLOutputElement>(null);
  useEffect(()=>terrainBridge.subscribe(()=>{const w=terrainBridge.stats?.weather;if(out.current&&w)out.current.textContent=`${w.mood} · ${w.seconds.toFixed(1)} s · ${w.skyOnly?'sky only':Object.entries(w.particles).filter(([,n])=>n>0).map(([k,n])=>`${k} ${n}`).join(' / ')}\n${language===2?'Cooldown':'冷却'} ${(w.cooldownMs/1000).toFixed(1)} s`;}),[language]);
  return <div className="weather-controls"><Toggle label={language===2?'Event weather':language===1?'事件天象':'事件天象'} checked={s.enabled} onChange={()=>useWeatherSettings.setState({enabled:!s.enabled})}/><div className="weather-scenes">{WEATHER_SCENARIOS.map(item=><GlassButton key={item.key} data-scenario={item.key} disabled={!!s.sequence} onClick={()=>void playWeatherScenario(item.key)}>{item.title[language]}</GlassButton>)}</div><div className="weather-presets">{(['none','sorrow','solemn','war','glory','voyage','poetic','disaster']as Mood[]).map(m=><GlassButton key={m} disabled={!!s.sequence} onClick={()=>void triggerMood(m)}>{words[m][language]}</GlassButton>)}</div><output ref={out} data-testid="weather-stats" className="engine-metrics"/><p role="status" data-testid="weather-caption">{s.busy?(language===2?'Preparing terrain transition…':'准备疆域过渡…'):s.caption}</p>{s.error&&<p role="alert">{s.error==='cooldown'?(language===2?'Please wait for the 10-second weather interval.':'天象间隔为 10 秒，请稍候。'):s.error}</p>}<GlassButton onClick={stopWeather}>{language===2?'Stop & clear':language===1?'停止並放晴':'停止并放晴'}</GlassButton><GlassButton icon="music" aria-pressed={audio.enabled} onClick={()=>void weatherMixer.toggle().catch(()=>{})}>{audio.enabled?(language===2?'Mute all audio':language===1?'靜音全部聲音':'静音全部声音'):(language===2?'Enable music & weather audio':language===1?'開啟古琴與環境音':'开启古琴与环境音')}</GlassButton>{audio.error&&<p role="alert">{language===2?'Audio could not start. Tap again to retry.':'声音未能开启，请再次点击重试。'}</p>}<details><summary>{language===2?'Individual effects':language===1?'獨立特效開關':'独立特效开关'}</summary>{WEATHER_EFFECTS.map(key=><Toggle key={key} label={words[key][language]} checked={s.effects[key]} onChange={()=>s.toggle(key)}/>)}</details></div>;
}
export function WeatherCaption(){const caption=useWeatherSettings(s=>s.caption),sequence=useWeatherSettings(s=>s.sequence);return sequence&&caption?<p className="glass weather-story-caption" role="status">{caption}</p>:null;}
