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
    const worker=path==='growth'?new Worker(new URL('../workers/growth.worker.ts',import.meta.url),{type:'module'}):new Worker(path,{type:'module'});
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
    canvas.addEventListener('pointerdown', e => { e.preventDefault(); canvas.focus({ preventScroll: true }); active.add(e.pointerId); canvas.setPointerCapture(e.pointerId); handlers.down(input(e)); }, options);
    canvas.addEventListener('pointermove', e => handlers.move(input(e)), options);
    canvas.addEventListener('pointerup', e => { active.delete(e.pointerId); handlers.up(input(e)); if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); }, options);
    canvas.addEventListener('pointercancel', () => { active.clear(); handlers.cancel(); }, options);
    canvas.addEventListener('lostpointercapture', e => { if (active.has(e.pointerId)) { active.clear(); handlers.cancel(); } }, options);
    canvas.addEventListener('wheel', e => { e.preventDefault(); handlers.wheel(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1)); }, { ...options, passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault(), options);
    canvas.addEventListener('keydown', e => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(e.key)) { e.preventDefault(); handlers.key(e.key); } }, options);
    return () => controller.abort();
  }
  dispose() { this.abort.abort(); }
}
