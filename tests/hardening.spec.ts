import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
test('P11 no WebGL retains a static atlas and an operable timeline',async({page},info)=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;Object.defineProperty(HTMLCanvasElement.prototype,'getContext',{value:function(this:HTMLCanvasElement,type:string,...args:unknown[]){if(type.startsWith('webgl')||type==='experimental-webgl')return null;return Reflect.apply(original,this,[type,...args]);}});});
 await page.goto('/');await expect(page.getByTestId('static-atlas')).toBeVisible();await expect(page.getByRole('dialog',{name:'开场地球'})).toBeHidden();await expect(page.getByTestId('static-atlas').locator('img')).toHaveAttribute('src',/s_sanguo/);
 await page.evaluate(async()=>{const {seekYear}=await import('/src/store/time.ts' as string);seekYear(-100);});
 await expect(page.getByTestId('static-atlas').locator('img')).toHaveAttribute('src',/s_xihan/);
 await expect(page.locator('.polity-labels [data-site]:visible')).toHaveCount(0);
 await page.locator('body').click({position:{x:5,y:5}});await page.keyboard.press('ArrowRight');await expect(page.getByTestId('static-atlas').locator('img')).toHaveAttribute('alt',/-99/);
 await fs.mkdir('docs/progress/screenshots/P11',{recursive:true});await page.screenshot({path:`docs/progress/screenshots/P11/${info.project.name}-fallback.png`});
});
test('P11 debug console is opt-in and dialogs contain keyboard focus',async({page},info)=>{
 await page.goto('/?year=230');await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready','true');expect(await page.locator('#__vconsole').count()).toBe(0);
 await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'跳到时间轴'})).toBeFocused();
 await page.getByRole('button',{name:'搜索',exact:true}).click();const dialog=page.getByRole('dialog',{name:'万能搜索'});await expect(dialog).toBeVisible();
 for(let i=0;i<14;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(e=>e.contains(document.activeElement))).toBe(true);}
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
 await page.goto('/?year=230&debug=1');await expect(page.locator('#__vconsole')).toBeAttached();await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready','true');
 const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollHeight-innerHeight,height:document.querySelector('.atlas-app')!.getBoundingClientRect().height,viewport:visualViewport?.height??innerHeight}));expect(layout.scroll).toBeLessThanOrEqual(1);expect(Math.abs(layout.height-layout.viewport)).toBeLessThan(2);
 await fs.mkdir('docs/progress/screenshots/P11',{recursive:true});await page.screenshot({path:`docs/progress/screenshots/P11/${info.project.name}-debug.png`});
});
test('P11 image decoding works without OffscreenCanvas and createImageBitmap',async({page},info)=>{
 test.skip(info.project.name!=='desktop','Shared web adapter fallback');
 await page.addInitScript(()=>{Object.defineProperty(window,'OffscreenCanvas',{value:undefined});Object.defineProperty(window,'createImageBitmap',{value:undefined});});
 await page.goto('/lab/terrain');await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready','true',{timeout:60000});
});
test('P11 motion permission is explicit and highlights survive closing settings',async({page},info)=>{
 test.skip(info.project.name!=='desktop','Permission API is simulated, physical iOS remains in checklist');
 await page.addInitScript(()=>{Object.defineProperty(DeviceOrientationEvent,'requestPermission',{value:()=>{document.documentElement.dataset.permissionCalls=String(Number(document.documentElement.dataset.permissionCalls??'0')+1);return Promise.resolve(document.documentElement.dataset.permissionResult??'denied');},configurable:true});});
 await page.goto('/?year=230');await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready','true');expect(await page.locator('html').getAttribute('data-permission-calls')).toBeNull();
 await page.getByRole('button',{name:'更多',exact:true}).click();const toggle=page.getByRole('switch',{name:'倾斜控制玻璃高光',exact:true});await toggle.click();await expect(toggle).toHaveAttribute('aria-checked','false');await expect(page.getByRole('status').filter({hasText:'尚未授权'})).toBeVisible();
 await page.evaluate(()=>document.documentElement.dataset.permissionResult='granted');await toggle.click();await expect(toggle).toHaveAttribute('aria-checked','true');await page.keyboard.press('Escape');
 await page.evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{gamma:10,beta:35})));await expect(page.locator('html')).toHaveAttribute('data-gyro','true');
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('switch',{name:'减少动态',exact:true}).click();await expect(page.locator('html')).not.toHaveAttribute('data-gyro','true');expect(await page.locator('html').getAttribute('data-permission-calls')).toBe('2');
});
test('P11 sustained real frame load lowers automatic quality, manual selection stays fixed',async({browser},info)=>{
 test.skip(info.project.name!=='desktop','Shared quality controller integration');
 await fs.mkdir('docs/progress/videos/P11',{recursive:true});
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'test-results/p11-video',size:{width:1440,height:900}}}),page=await context.newPage();
 try{await page.goto((info.project.use.baseURL??'http://127.0.0.1:4173')+'/lab/terrain?debug=1');await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready','true');
 const result=await page.evaluate(async()=>{const {terrainBridge,useTerrainSettings}=await import('/src/state/terrain.ts' as string);const engine=terrainBridge.engine!;useTerrainSettings.setState({automatic:true});engine.setQuality('high');const heat=async()=>{
 const original=engine.renderer.render;
 engine.renderer.render=(...args:Parameters<import('three').WebGLRenderer['render']>)=>{
  const until=performance.now()+58;
  while(performance.now()<until){/* Span several display intervals so frame deadlines cannot alternate with short samples. */}
  return original.apply(engine.renderer,args);
 };
 try{await new Promise(resolve=>setTimeout(resolve,4200));}finally{engine.renderer.render=original;}
 };await heat();const automatic=engine.quality.level;useTerrainSettings.setState({automatic:false});engine.setQuality('high');await heat();return {automatic,manual:engine.quality.level};});
 expect(result).toEqual({automatic:'eco',manual:'high'});await page.screenshot({path:'docs/progress/screenshots/P11/desktop-auto-quality.png'});
 }finally{await context.close();const file=await page.video()?.path();if(file)await fs.copyFile(file,'docs/progress/videos/P11/desktop-auto-quality.webm');}
});
