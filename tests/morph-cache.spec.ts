import {test,expect} from '@playwright/test';
test('P11 settled color cache preserves ownership and invalidates after a seek',async({page},info)=>{
 test.skip(info.project.name!=='desktop','Shared shader cache lifecycle');
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/lab/morph');await expect.poll(()=>page.evaluate(async()=>{const {terrainBridge}=await import('/src/state/terrain.ts' as string);return terrainBridge.engine?.morph.stats().ready;}),{timeout:60000}).toBe(true);
 const result=await page.evaluate(async()=>{const {terrainBridge}=await import('/src/state/terrain.ts' as string);const e=terrainBridge.engine!,m=e.morph;await m.prepare('s_sanguo_a','s_sanguo');m.setProgress(.45,'seek');await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return m.audit();});expect(result.gaps).toBe(0);expect(result.invalid).toBe(0);expect(result.mismatches).toBe(0);
 await expect.poll(()=>page.evaluate(async()=>{const {terrainBridge}=await import('/src/state/terrain.ts' as string);return terrainBridge.engine!.morph.uniforms.territoryStyleReady!.value;})).toBe(1);
 await page.evaluate(async()=>{const {terrainBridge}=await import('/src/state/terrain.ts' as string);terrainBridge.engine!.morph.setProgress(.8,'drag');});
 await expect.poll(()=>page.evaluate(async()=>{const {terrainBridge}=await import('/src/state/terrain.ts' as string);return terrainBridge.engine!.morph.stats().t;})).toBe(.8);
 await page.evaluate(()=>{const gl=document.querySelector<HTMLCanvasElement>('.terrain-canvas')!.getContext('webgl2')!,extension=gl.getExtension('WEBGL_lose_context')!;extension.loseContext();setTimeout(()=>extension.restoreContext(),500);});
 await expect(page.getByTestId('terrain')).toHaveAttribute('data-context','lost');await expect(page.getByTestId('terrain')).toHaveAttribute('data-context','ready',{timeout:15000});
 await expect.poll(()=>page.evaluate(async()=>{const {terrainBridge}=await import('/src/state/terrain.ts' as string);return terrainBridge.engine!.morph.uniforms.territoryStyleReady!.value;}),{timeout:30000}).toBe(1);
 expect(errors).toEqual([]);
});
