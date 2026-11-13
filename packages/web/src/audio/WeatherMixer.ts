import { create } from 'zustand';
import type { WeatherAudio } from '@witlu/engine';
export const useAudioState=create<{enabled:boolean;ready:boolean;error:string}>(()=>({enabled:false,ready:false,error:''}));
type Sound='rain'|'wind'|'waves'|'thunder';
class WeatherMixer {
  private context:AudioContext|null=null;private master:GainNode|null=null;private musicGain:GainNode|null=null;private music:HTMLAudioElement|null=null;
  private gains=new Map<Sound,GainNode>();private buffers=new Map<Sound,AudioBuffer>();private sources=new Set<AudioBufferSourceNode>();private pending=new Set<AudioBufferSourceNode>();private load:Promise<void>|null=null;
  private consent=false;private last:WeatherAudio={rain:0,wind:0,waves:0,thunder:false,delay:.8,quiet:false};
  constructor(){
    // WeChat may expose its media bridge after React mounts. Never use it to bypass consent.
    document.addEventListener('WeixinJSBridgeReady',()=>{if(this.consent&&useAudioState.getState().enabled)void this.resume().catch(()=>this.mute());});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){void this.context?.suspend();this.music?.pause();this.cancelThunder();}else if(this.consent&&useAudioState.getState().enabled)void this.resume().catch(()=>this.mute());});
  }
  private async resume(){await this.context?.resume();await this.music?.play();}
  async toggle(){
    if(useAudioState.getState().enabled){this.mute();return;}
    this.consent=true;
    try{
      if(!this.context){const Ctor=window.AudioContext??(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;this.context=new Ctor();this.master=this.context.createGain();this.master.gain.value=.65;const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=8;this.master.connect(limiter).connect(this.context.destination);
        this.music=new Audio('/assets/audio/liu_shui.mp3');this.music.loop=true;this.music.preload='auto';this.music.setAttribute('playsinline','');this.music.setAttribute('webkit-playsinline','');this.musicGain=this.context.createGain();this.musicGain.gain.value=.28;this.context.createMediaElementSource(this.music).connect(this.musicGain).connect(this.master);
      }
      // Both calls happen in the button gesture, before any fetch/decode await.
      const resumed=this.context.resume(),played=this.music!.play();useAudioState.setState({enabled:true,error:''});await Promise.all([resumed,played]);
      this.load??=this.loadSounds().catch(e=>{this.load=null;throw e;});await this.load;useAudioState.setState({ready:true});this.update(this.last);
    }catch(e){this.mute();useAudioState.setState({error:String(e)});throw e;}
  }
  private async loadSounds(){
    const context=this.context!,master=this.master!;
    const decoded=await Promise.all((['rain','wind','waves','thunder']as Sound[]).map(async name=>{const r=await fetch(`/assets/audio/weather/${name}.wav`);if(!r.ok)throw Error(`Audio ${name}: ${r.status}`);return [name,await context.decodeAudioData(await r.arrayBuffer())]as const;}));
    for(const [name,buffer]of decoded){this.buffers.set(name,buffer);if(name==='thunder')continue;const gain=context.createGain();gain.gain.value=0;gain.connect(master);this.gains.set(name,gain);const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);source.start();this.sources.add(source);}
  }
  private cancelThunder(){this.pending.forEach(s=>{s.stop();s.disconnect();});this.pending.clear();}
  mute(){useAudioState.setState({enabled:false});this.music?.pause();this.cancelThunder();void this.context?.suspend();}
  update(cue:WeatherAudio){
    this.last={...cue,thunder:false};if(cue.quiet)this.cancelThunder();if(!this.context||!useAudioState.getState().enabled||document.hidden)return;
    const now=this.context.currentTime;
    for(const name of ['rain','wind','waves']as const){const gain=this.gains.get(name);if(gain){gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(cue.quiet?0:cue[name]*(name==='rain'?.48:.3),now,.3);}}
    this.musicGain?.gain.setTargetAtTime(cue.rain>.2?.19:.28,now,.4);
    if(cue.thunder&&!cue.quiet&&this.buffers.has('thunder')){const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.buffers.get('thunder')!;gain.gain.value=.48;source.connect(gain).connect(this.master!);this.pending.add(source);source.onended=()=>{this.pending.delete(source);source.disconnect();gain.disconnect();};source.start(now+Math.max(.6,Math.min(1.2,cue.delay)));}
  }
  stats(){return {consent:this.consent,enabled:useAudioState.getState().enabled,state:this.context?.state??'uninitialized',buffers:this.buffers.size,pendingThunder:this.pending.size,levels:{...this.last}};}
}
export const weatherMixer=new WeatherMixer();
