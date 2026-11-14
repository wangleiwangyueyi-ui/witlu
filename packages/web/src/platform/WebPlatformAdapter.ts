import type { PlatformAdapter } from '@witlu/engine';
import type { InputHandlers, PointerInput, WorkerPort } from '../../../engine/platform/PlatformAdapter';

/** The only browser-facing boundary of the rendering engine. */
export class WebPlatformAdapter implements PlatformAdapter<HTMLCanvasElement, WorkerPort, HTMLAudioElement> {
  private abort = new AbortController();
  constructor(readonly canvas: HTMLCanvasElement) {}
  requestFrame(callback: (timestamp: number) => void) { return requestAnimationFrame(callback); }
  cancelFrame(handle: number) { cancelAnimationFrame(handle); }
  now() { return performance.now(); }
  async readBytes(path: string) { const result = await fetch(path, { signal: this.abort.signal }); if (!result.ok) throw new Error(`Tile ${result.status}: ${path}`); return new Uint8Array(await result.arrayBuffer()); }
  async readJSON<T>(path: string): Promise<T> { const result = await fetch(path, { signal: this.abort.signal }); if (!result.ok) throw new Error(`Manifest ${result.status}`); return result.json() as Promise<T>; }
  async decodeImage(bytes: Uint8Array) {
    const bitmap = await createImageBitmap(new Blob([bytes.slice().buffer]), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const surface = new OffscreenCanvas(bitmap.width, bitmap.height); const context = surface.getContext('2d', { willReadFrequently: true });
    if (!context) { bitmap.close(); throw new Error('Image decoding context unavailable'); }
    context.drawImage(bitmap, 0, 0); const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height); bitmap.close();
    return { width: pixels.width, height: pixels.height, data: new Uint8Array(pixels.data.buffer) };
  }
  viewport() { const box = this.canvas.getBoundingClientRect(); return { width: box.width, height: box.height, pixelRatio: devicePixelRatio, mobile: matchMedia('(pointer: coarse)').matches || box.width < 768 }; }
  createWorker(path: string):WorkerPort {
    const worker=path==='labels'?new Worker(new URL('../workers/labels.worker.ts',import.meta.url),{type:'module'}):path==='growth'?new Worker(new URL('../workers/growth.worker.ts',import.meta.url),{type:'module'}):new Worker(path,{type:'module'});
    return{post:(message,transfer=[])=>worker.postMessage(message,transfer),onMessage:fn=>{const listener=(e:MessageEvent<unknown>)=>fn(e.data);worker.addEventListener('message',listener);return()=>worker.removeEventListener('message',listener);},onError:fn=>{const listener=(e:ErrorEvent)=>fn(e.message);worker.addEventListener('error',listener);return()=>worker.removeEventListener('error',listener);},terminate:()=>worker.terminate()};
  }
  storage = { get: (key: string) => { try { return localStorage.getItem(key); } catch { return null; } }, set: (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* Storage is optional. */ } } };
  createAudio(path: string) { return new Audio(path); }
  onResize(callback: () => void) { const observer = new ResizeObserver(callback); observer.observe(this.canvas); return () => observer.disconnect(); }
  onVisibility(callback: (visible: boolean) => void) { const change = () => callback(document.visibilityState === 'visible'); document.addEventListener('visibilitychange', change); return () => document.removeEventListener('visibilitychange', change); }
  onContextChange(lost: () => void, restored: () => void) { const onLost = (event: Event) => { event.preventDefault(); lost(); }; this.canvas.addEventListener('webglcontextlost', onLost); this.canvas.addEventListener('webglcontextrestored', restored); return () => { this.canvas.removeEventListener('webglcontextlost', onLost); this.canvas.removeEventListener('webglcontextrestored', restored); }; }
  bindInput(handlers: InputHandlers) {
    const canvas = this.canvas, controller = new AbortController(), options = { signal: controller.signal }, active = new Set<number>();
    const input = (e: PointerEvent): PointerInput => { const box = canvas.getBoundingClientRect(); return { id: e.pointerId, x: e.clientX - box.left, y: e.clientY - box.top, button: e.buttons === 2 ? 2 : 0, shift: e.shiftKey, time: e.timeStamp }; };
    // DOM place labels are part of the map surface: capture on the original
    // target so taps still click the label, while drags feed the same camera.
    const surface = canvas.closest('.atlas-app,.places-lab') ?? canvas;
    const isMapTarget = (target: EventTarget | null) => target === canvas || target instanceof Element && !!target.closest('.place-label');
    const starts = new Map<number, {x:number;y:number}>(); let dragged = false, suppressClickUntil = 0;
    surface.addEventListener('pointerdown', event => { const e=event as PointerEvent;if(!isMapTarget(e.target))return;e.preventDefault();canvas.focus({preventScroll:true});if(!active.size)dragged=false;active.add(e.pointerId);starts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(active.size>1)dragged=true;(e.target as Element).setPointerCapture(e.pointerId);handlers.down(input(e)); }, options);
    surface.addEventListener('pointermove', event => { const e=event as PointerEvent;if(!active.has(e.pointerId))return;const start=starts.get(e.pointerId);if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)dragged=true;handlers.move(input(e)); }, options);
    surface.addEventListener('pointerup', event => { const e=event as PointerEvent;if(!active.has(e.pointerId))return;active.delete(e.pointerId);starts.delete(e.pointerId);handlers.up(input(e));if(dragged)suppressClickUntil=performance.now()+350;const target=e.target as Element;if(target.hasPointerCapture(e.pointerId))target.releasePointerCapture(e.pointerId); }, options);
    surface.addEventListener('pointercancel', () => { active.clear();starts.clear();handlers.cancel(); }, options);
    surface.addEventListener('lostpointercapture', event => { const e=event as PointerEvent;if(active.has(e.pointerId)){active.clear();starts.clear();handlers.cancel();} }, options);
    surface.addEventListener('click', e => {if(isMapTarget(e.target)&&performance.now()<suppressClickUntil){e.preventDefault();e.stopPropagation();}}, {...options,capture:true});
    surface.addEventListener('wheel', event => {const e=event as WheelEvent;if(!isMapTarget(e.target))return;e.preventDefault();handlers.wheel(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1));}, {...options,passive:false});
    canvas.addEventListener('contextmenu', e => e.preventDefault(), options);
    canvas.addEventListener('keydown', e => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(e.key)) { e.preventDefault(); handlers.key(e.key); } }, options);
    return () => controller.abort();
  }
  dispose() { this.abort.abort(); }
}
