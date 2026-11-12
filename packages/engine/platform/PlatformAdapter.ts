/** Opaque platform resources keep browser and mini-app types out of the engine. */
export interface PlatformAdapter<Canvas = unknown, Image = unknown, Worker = unknown, Audio = unknown> {
  canvas: Canvas;
  requestFrame(callback: (timestamp: number) => void): number;
  cancelFrame(handle: number): void;
  decodeImage(bytes: Uint8Array): Promise<Image>;
  createWorker(path: string): Worker;
  storage: { get(key: string): string | null; set(key: string, value: string): void };
  createAudio(path: string): Audio;
  now(): number;
}
