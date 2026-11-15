import { describe,it,expect } from 'vitest';
import { WeatherDirector, WEATHER_BUDGET, STORIES } from './index';
const event={id:'j',title:'靖康之变',year:1127,mood:'sorrow' as const};
describe('WeatherDirector',()=>{
  it('keeps idle shader time finite and freezes narrative time during geometry preparation',()=>{
    const d=new WeatherDirector();expect(d.sample(100,'high').seconds).toBe(0);d.trigger(event,100);d.pause(600);expect(d.sample(2000,'high').seconds).toBe(.5);d.resume(2600);expect(d.sample(2700,'high').seconds).toBe(.6);d.cancel();expect(d.sample(2800,'high').active).toBe(false);expect(d.sample(2800,'high').seconds).toBe(0);
  });
  it('fades in 1.2 seconds, holds through 6, restores in 1.2; enforces 10 second cooldown',()=>{
    const d=new WeatherDirector();expect(d.trigger(event,0)).toBe(true);expect(d.sample(600,'high').strength).toBe(.5);expect(d.sample(1200,'high').strength).toBe(1);expect(d.sample(6000,'high').strength).toBe(1);expect(d.sample(7200,'high').strength).toBe(0);expect(d.trigger(event,9999)).toBe(false);expect(d.trigger(event,10000)).toBe(true);
  });
  it('always makes modern massacres solemn, even incorrectly tagged events or requested choreography',()=>{
    const d=new WeatherDirector();d.trigger({...event,title:'南京大屠杀',year:1937,mood:'fire'},0,'qin');const s=d.sample(1550,'ultra');expect(s.mood).toBe('solemn');expect(s.story).toBeNull();expect(s.lightning||s.fire||s.shake).toBe(false);expect(s.particles.sparks).toBe(0);expect(s.particles.rain).toBe(6600);
  });
  it('interrupts dramatic weather for a massacre during cooldown without starting another performance',()=>{
    const d=new WeatherDirector();d.trigger({...event,mood:'fire'},0);
    expect(d.sample(1800,'high').fire).toBe(true);
    expect(d.trigger({...event,id:'protected',title:'南京大屠杀',year:1937,mood:'fire'},2000,'qin')).toBe(true);
    const s=d.sample(2200,'high');expect(s.mood).toBe('solemn');expect(s.story).toBeNull();
    expect(s.lightning||s.fire||s.flood||s.shake||s.wall||s.capital).toBe(false);
    expect(s.particles.sparks+s.particles.smoke+s.particles.dust).toBe(0);
    expect(d.started).toBe(0);expect(d.lastTrigger).toBe(0);expect(d.sample(7200,'high').active).toBe(false);
    expect(d.trigger(event,9999)).toBe(false);expect(d.trigger(event,10000)).toBe(true);
  });
  it('preserves elapsed narrative time when solemn protection interrupts a paused story',()=>{
    const d=new WeatherDirector();d.trigger({...event,mood:'war'},0,'qin');d.pause(1000);
    expect(d.trigger({...event,title:'南京大屠杀',year:1937,mood:'war'},2000)).toBe(true);
    const s=d.sample(2300,'high');expect(s.seconds).toBe(1.3);expect(s.mood).toBe('solemn');expect(s.cue).toBeNull();expect(d.lastTrigger).toBe(0);
  });
  it.each(['ultra','high','eco'] as const)('uses the %s particle budget and disables costly eco effects',q=>{
    const d=new WeatherDirector();d.trigger(event,0);const s=d.sample(1550,q);expect(s.particles.rain).toBe(WEATHER_BUDGET[q].rain);expect(s.lightning).toBe(q!=='eco');d.effects.rain=false;expect(d.sample(1550,q).particles.rain).toBe(0);
  });
  it.each(['ultra','high','eco'] as const)('applies the %s budget and independent switch to all six particle kinds',q=>{
    const cases=[['rain','sorrow','风雨'],['snow','poetic','雪拥蓝关'],['petals','poetic','兰亭集序'],['dust','glory','贞观之治'],['sparks','fire','赤壁之战'],['smoke','war','官渡之战']] as const;
    for(const [kind,mood,title] of cases){const d=new WeatherDirector();d.trigger({...event,mood,title},0);expect(d.sample(1500,q).particles[kind]).toBe(WEATHER_BUDGET[q][kind]);d.effects[kind]=false;expect(d.sample(1500,q).particles[kind]).toBe(0);}
  });
  it.each(['speed','reduced'] as const)('%s suppresses everything except sky',key=>{
    const d=new WeatherDirector();d.trigger(event,0);if(key==='speed')d.speed=4;else d.reduced=true;const s=d.sample(1550,'ultra');expect(s.skyStrength).toBe(1);expect(Object.values(s.particles).every(n=>n===0)).toBe(true);expect(s.lightning||s.ripples||s.shake||s.fire||s.flood||s.capital||s.wall).toBe(false);expect(s.rays).toBe(0);
  });
  it('orders six Qin conquests, Daliang flooding, glory and the Great Wall',()=>{
    expect(STORIES.qin.filter(c=>c.snapshot).map(c=>c.snapshot)).toHaveLength(7);const d=new WeatherDirector();d.trigger({...event,title:'秦灭六国',year:-230,mood:'war'},0,'qin');expect(d.sample(2700,'high').flood).toBe(true);expect(d.sample(6000,'high').mood).toBe('glory');expect(d.sample(7100,'high').wall).toBe(true);
  });
  it('restores Jingkang after six seconds without triggering a second performance',()=>{
    const d=new WeatherDirector();d.trigger(event,0,'jingkang');expect(d.sample(1550,'high').lightning).toBe(true);expect(d.sample(4000,'high').capital).toBe(true);expect(d.sample(6000,'high').mood).toBe('solemn');expect(d.sample(7200,'high').active).toBe(false);
    expect(d.sample(1400,'high').particles.rain).toBe(0);expect(d.sample(1600,'high').particles.rain).toBe(8000);expect(d.sample(6000,'high').particles.rain).toBe(0);
  });
  it('limits each war beat to two oscillations within 0.8 seconds',()=>{const d=new WeatherDirector();d.trigger({...event,mood:'war'},0);expect(d.sample(400,'high').shake).toBe(true);expect(d.sample(400,'high').shakePhase).toBe(.5);expect(d.sample(800,'high').shake).toBe(false);});
  it('distinguishes poetic snow, moonlight and petals',()=>{
    for(const [title,kind]of [['雪拥蓝关','snow'],['兰亭集序','petals']]as const){const d=new WeatherDirector();d.trigger({...event,title,mood:'poetic'},0);expect(d.sample(1500,'high').particles[kind]).toBeGreaterThan(0);}
  });
});
