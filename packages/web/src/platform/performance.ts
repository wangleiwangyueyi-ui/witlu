import {terrainBridge} from '../state/terrain';
/** Shared by automation and the on-device console. Includes every rAF interval. */
export async function measurePerformance(duration=30000){
 const engine=terrainBridge.engine;if(!engine)throw Error('Terrain is not ready');
 const frameTimes:number[]=[],samples:unknown[]=[],qualityChanges:{atMs:number;quality:string}[]=[];
 const start=performance.now(),pose=engine.pose();let previous=start,lastSample=-Infinity,lastQuality=engine.quality.level;
 const gl=engine.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
 const hardware={userAgent:navigator.userAgent,cores:navigator.hardwareConcurrency,dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],renderer:debug?String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)):String(gl.getParameter(gl.RENDERER))};
 await new Promise<void>(resolve=>{const tick=(now:number)=>{const elapsed=now-start;frameTimes.push(now-previous);previous=now;
   // Continuous pan and zoom on the actual renderer, without synthetic FPS inputs.
   engine.camera.flyTo({...pose,lon:pose.lon+Math.sin(elapsed/1700)*2,distance:pose.distance*(1+Math.sin(elapsed/2300)*.1)},0);
   if(lastQuality!==engine.quality.level){lastQuality=engine.quality.level;qualityChanges.push({atMs:elapsed,quality:lastQuality});}
   if(now-lastSample>=500){samples.push(terrainBridge.stats);lastSample=now;}
   if(elapsed>=duration||document.hidden){resolve();return;}requestAnimationFrame(tick);
 };requestAnimationFrame(tick);});
 engine.camera.flyTo(pose,0);const frames=frameTimes.slice(1).filter(ms=>ms>0),sorted=[...frames].sort((a,b)=>a-b),sum=frames.reduce((a,b)=>a+b,0);
 return {date:new Date().toISOString(),hardware,durationMs:performance.now()-start,interrupted:document.hidden,automatic:engine.quality.automatic,initialQuality:samples.length?(samples[0] as {quality:string}).quality:null,finalQuality:engine.quality.level,qualityChanges,meanFps:frames.length*1000/sum,p95Ms:sorted[Math.floor(sorted.length*.95)]??null,maxMs:sorted.at(-1)??null,heapBytes:(performance as Performance & {memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize??null,frameTimes:frames,samples};
}
