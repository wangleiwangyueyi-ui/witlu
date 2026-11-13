export type Mood = 'sorrow' | 'solemn' | 'war' | 'fire' | 'glory' | 'voyage' | 'poetic' | 'disaster' | 'none';
export type ParticleKind = 'rain' | 'snow' | 'petals' | 'dust' | 'sparks' | 'smoke';
export type WeatherEffect = ParticleKind | 'ripples' | 'lightning' | 'rays' | 'fire' | 'flood' | 'shake' | 'sky' | 'wall';
export interface WeatherEvent { id: string; title: string; year: number; mood: Mood; coord?: [number, number] }
export const WEATHER_EFFECTS: WeatherEffect[] = ['sky','rain','ripples','snow','petals','dust','sparks','smoke','lightning','rays','fire','flood','shake','wall'];
export const WEATHER_BUDGET = {
  ultra: { rain:30000,snow:2400,petals:700,dust:1200,sparks:900,smoke:160,rays:16 },
  high: { rain:8000,snow:900,petals:250,dust:500,sparks:350,smoke:60,rays:8 },
  eco: { rain:2000,snow:240,petals:60,dust:100,sparks:80,smoke:16,rays:0 }
} as const;
export type Story = 'qin' | 'jingkang';
export interface StoryCue { at: number; year: number; label: string; mood: Mood; action?: 'lightning' | 'flood' | 'capital' | 'wall'; snapshot?: string; coord: [number,number] }
export const STORIES: Record<Story, StoryCue[]> = {
  qin: [
    {at:0,year:-231,label:'七雄并立',mood:'none',snapshot:'s_zhanguo_d',coord:[112,34]},
    {at:.4,year:-230,label:'秦灭韩',mood:'war',snapshot:'s_zhanguo_e1',coord:[113.74,34.4]},
    {at:1.5,year:-228,label:'秦灭赵',mood:'war',snapshot:'s_zhanguo_e2',coord:[114.48,36.61]},
    {at:2.6,year:-225,label:'水淹大梁 · 秦灭魏',mood:'disaster',action:'flood',snapshot:'s_zhanguo_e3',coord:[114.35,34.79]},
    {at:3.7,year:-223,label:'秦灭楚',mood:'war',snapshot:'s_zhanguo_e4',coord:[116.78,32.58]},
    {at:4.8,year:-222,label:'秦灭燕',mood:'war',snapshot:'s_zhanguo_e5',coord:[116.4,39.9]},
    {at:5.9,year:-221,label:'秦灭齐 · 六国一统',mood:'glory',snapshot:'s_qin_a',coord:[118.31,36.82]},
    {at:7,year:-221,label:'秦 · 长城初起',mood:'glory',action:'wall',coord:[108.94,34.34]}
  ],
  jingkang: [
    {at:0,year:1127,label:'靖康之变',mood:'sorrow',coord:[114.31,34.8]},
    {at:1.5,year:1127,label:'汴梁 · 风雨',mood:'sorrow',action:'lightning',coord:[114.31,34.8]},
    {at:2,year:1127,label:'北宋覆亡 · 金军南下',mood:'sorrow',snapshot:'s_nansong_a0',coord:[114.31,34.8]},
    {at:3.5,year:1127,label:'临安 · 余晖',mood:'sorrow',action:'capital',coord:[120.15,30.27]},
    {at:6,year:1127,label:'雨歇 · 靖康之变',mood:'solemn',coord:[120.15,30.27]}
  ]
};
const smooth = (x:number) => { const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t); };
export function safeMood(event: WeatherEvent): Mood {
  return event.year>=1840 && /惨案|屠杀|大轰炸|集中营|种族灭绝|细菌战|毒气|虐杀|万人坑|暴行|花园口|南京大屠杀/.test(event.title) ? 'solemn' : event.mood;
}
export class WeatherDirector {
  event: WeatherEvent | null = null; story: Story | null = null; started = -Infinity; lastTrigger = -Infinity; speed = 1; reduced = false;
  private pausedAt:number|null=null;
  effects = Object.fromEntries(WEATHER_EFFECTS.map(k=>[k,true])) as Record<WeatherEffect,boolean>;
  trigger(event: WeatherEvent, now: number, story: Story | null = null) {
    if (now-this.lastTrigger<10000) return false;
    this.event={...event,mood:safeMood(event)};this.story=this.event.mood==='solemn'?null:story;this.started=now;this.lastTrigger=now;this.pausedAt=null;return true;
  }
  cancel() { this.event=null;this.story=null;this.pausedAt=null; }
  pause(now:number){this.pausedAt??=now;}
  resume(now:number){if(this.pausedAt!==null){this.started+=Math.max(0,now-this.pausedAt);this.pausedAt=null;}}
  sample(now:number,quality: keyof typeof WEATHER_BUDGET) {
    const seconds=this.event?Math.max(0,((this.pausedAt??now)-this.started)/1000):0, cues=this.story?STORIES[this.story]:[];
    const cue=cues.filter(c=>c.at<=seconds).at(-1), duration=this.story==='qin'?13:this.story==='jingkang'?6:6;
    const strength=this.event?smooth(seconds/1.2)*(1-smooth((seconds-duration)/1.2)):0;
    const mood: Mood=this.event?.mood==='solemn'?'solemn':cue?.mood??this.event?.mood??'none';
    const skyOnly=this.speed>=4||this.reduced, active=strength>0&&!skyOnly;
    const has=(effect:WeatherEffect)=>active&&this.effects[effect];
    const title=this.event?.title??'', particles:Record<ParticleKind,number>={rain:0,snow:0,petals:0,dust:0,sparks:0,smoke:0}, budget=WEATHER_BUDGET[quality];
    const assign=(k:ParticleKind,scale=1)=>{if(has(k))particles[k]=Math.floor(budget[k]*scale*strength);};
    if(mood==='sorrow')assign('rain');
    if(mood==='solemn'){assign('rain',.22);assign('petals',.12);}
    if(mood==='war'){assign('smoke');assign('sparks');}
    if(mood==='fire'){assign('smoke');assign('sparks');}
    if(mood==='glory')assign('dust');
    if(mood==='voyage')assign('dust',.5);
    if(mood==='poetic'){if(/雪|蓝关/.test(title))assign('snow');else if(!/月|李白/.test(title))assign('petals');}
    if(mood==='disaster')assign('rain',.5);
    if(this.story==='jingkang'&&(seconds<1.5||seconds>=6))particles.rain=0;
    const shakeAge=seconds-(cue?.at??0),shakePhase=Math.min(1,shakeAge/.8);
    const lightning=has('lightning')&&mood==='sorrow'&&quality!=='eco'&&seconds>=1.5&&seconds<1.65;
    return {mood,seconds,strength,skyStrength:this.effects.sky?strength:0,skyOnly,particles,lightning,
      ripples:has('ripples')&&particles.rain>0, rays:has('rays')&&mood==='glory'?budget.rays:0,
      fire:has('fire')&&mood==='fire',flood:has('flood')&&mood==='disaster',shake:has('shake')&&mood==='war'&&quality!=='eco'&&shakeAge<.8,shakePhase,
      wall:has('wall')&&this.story==='qin'&&seconds>=7,capital:active&&this.story==='jingkang'&&seconds>=3.5&&seconds<6,
      cue:cue??null,event:this.event,story:this.story,active:strength>0, duration:duration+1.2};
  }
}
