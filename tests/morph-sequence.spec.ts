import fs from 'node:fs/promises';
import {test,expect} from '@playwright/test';
test('P4 Qin conquest chronology includes all six intermediate stages',async({browser},info)=>{
  test.skip(!process.env.P4_ACCEPTANCE,'Run pnpm test:morph in isolation');test.setTimeout(180000);
  const p=info.project.use,viewport=p.viewport??{width:1440,height:900};
  const context=await browser.newContext({viewport,baseURL:'http://127.0.0.1:4173',deviceScaleFactor:p.deviceScaleFactor??1,isMobile:p.isMobile??false,hasTouch:p.hasTouch??false,...(p.userAgent?{userAgent:p.userAgent}:{}),recordVideo:{dir:'test-results/videos',size:viewport}});
  const page=await context.newPage(),video=page.video()!,errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const folder of ['performance','recordings'])await fs.mkdir(`docs/progress/${folder}/P4`,{recursive:true});
  try{
    await page.goto('/lab/morph?case=1');await expect.poll(async()=>JSON.parse((await page.getByTestId('terrain').getAttribute('data-stats'))??'{}').morph?.ready,{timeout:45000}).toBe(true);
    const results=await page.evaluate(async()=>{
      const {terrainBridge}=await import('/src/state/terrain.ts' as string);const e=terrainBridge.engine!,keys=['s_zhanguo_d','s_zhanguo_e1','s_zhanguo_e2','s_zhanguo_e3','s_zhanguo_e4','s_zhanguo_e5','s_qin_a'],results=[];
      for(const direction of [1,-1])for(let k=0;k<keys.length-1;k++){
        const i=direction===1?k:keys.length-1-k,a=keys[i]!,b=keys[i+direction]!;
        await e.morph.prepare(a,b);
        // Keep the lab selectors and caption synchronized with the actual pair.
        for(const [name,value]of [['A',a],['B',b]]){const select=document.querySelector<HTMLSelectElement>(`select[aria-label="快照 ${name}"]`)!;select.value=value!;select.dispatchEvent(new Event('change',{bubbles:true}));}
        await new Promise(r=>setTimeout(r,50));
        await e.morph.prepare(a,b);const prep=e.morph.stats();e.morph.playPrepared(false,1200);
        const times:number[]=[];let previous=performance.now();
        await new Promise<void>(resolve=>{const tick=(now:number)=>{times.push(now-previous);previous=now;if(e.morph.stats().playing)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
        results.push({a,b,preparation:prep,fps:times.length*1000/times.reduce((a,b)=>a+b,0),frameTimes:times});
        await new Promise(r=>setTimeout(r,150));
      }
      return results;
    });
    expect(results).toHaveLength(12);expect(results.every(r=>r.preparation.error===null)).toBe(true);expect(errors).toEqual([]);
    await fs.writeFile(`docs/progress/performance/P5/regression/p4/${info.project.name}-qin-sequence.json`,JSON.stringify({results,errors},null,2)+'\n');
  }finally{await context.close();await video.saveAs(`docs/progress/recordings/P5/regression/p4/${info.project.name}-qin-sequence.webm`);}
});
