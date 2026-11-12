/** Opaque platform resources keep browser and mini-app types out of the engine. */
export interface DecodedImage { width: number; height: number; data: Uint8Array }
export interface Viewport { width: number; height: number; pixelRatio: number; mobile: boolean }
export interface PointerInput { id: number; x: number; y: number; button: number; shift: boolean; time: number }
export interface InputHandlers {
  down(event: PointerInput): void; move(event: PointerInput): void; up(event: PointerInput): void; cancel(): void;
  wheel(delta: number): void; key(key: string): void;
}
export interface WorkerPort { post(message:unknown,transfer?:ArrayBuffer[]):void; onMessage(fn:(value:unknown)=>void):()=>void; onError(fn:(message:string)=>void):()=>void; terminate():void }
export interface PlatformAdapter<Canvas = unknown, Worker = WorkerPort, Audio = unknown> {
  canvas: Canvas;
  requestFrame(callback: (timestamp: number) => void): number;
  cancelFrame(handle: number): void;
  decodeImage(bytes: Uint8Array): Promise<DecodedImage>;
  readBytes(path: string): Promise<Uint8Array>;
  readJSON<T>(path: string): Promise<T>;
  viewport(): Viewport;
  bindInput(handlers: InputHandlers): () => void;
  onResize(callback: () => void): () => void;
  onContextChange(lost: () => void, restored: () => void): () => void;
  onVisibility(callback: (visible: boolean) => void): () => void;
  createWorker(path: string): Worker;
  storage: { get(key: string): string | null; set(key: string, value: string): void };
  createAudio(path: string): Audio;
  now(): number;
}
