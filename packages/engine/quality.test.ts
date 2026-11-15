import {describe,it,expect} from 'vitest';
import {initialQuality,QualityController} from './Quality';
describe('runtime quality budget',()=>{
  it('includes sustained long frames and downgrades one level after two seconds',()=>{
    const q=new QualityController('ultra');for(let i=0;i<7;i++)expect(q.sample(250)).toBeNull();expect(q.sample(250)).toBe('high');expect(q.sample(2100)).toBe('eco');expect(q.sample(2100)).toBeNull();
  });
  it('requires continuous load, and ten seconds of headroom before upgrading',()=>{
    const q=new QualityController('high');q.sample(1500);q.sample(16);expect(q.sample(600)).toBeNull();q.set('eco');for(let i=0;i<999;i++)expect(q.sample(10)).toBeNull();expect(q.sample(10)).toBe('high');
  });
  it('respects manual mode and resets invalid samples',()=>{const q=new QualityController('high',false);expect(q.sample(4000)).toBeNull();q.automatic=true;q.sample(1500);q.sample(NaN);expect(q.sample(600)).toBeNull();});
  it('starts weak devices and data-saving connections conservatively',()=>{
    expect(initialQuality({mobile:true,memoryGB:4,cores:8})).toBe('eco');expect(initialQuality({mobile:true,cores:8,memoryGB:8})).toBe('high');expect(initialQuality({mobile:false,saveData:true})).toBe('eco');expect(initialQuality({mobile:true,network:'slow-2g'})).toBe('eco');
  });
});
