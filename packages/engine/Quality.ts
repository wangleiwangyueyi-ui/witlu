export type Quality = 'ultra' | 'high' | 'eco';
export const QUALITY = {
  ultra: { zoom: 8, pixelRatio: 2, segments: 64, error: 1.2, cache: 180, tiles: 96 },
  high: { zoom: 7, pixelRatio: 1.5, segments: 32, error: 1.7, cache: 140, tiles: 80 },
  eco: { zoom: 6, pixelRatio: 1, segments: 16, error: 2.5, cache: 90, tiles: 60 }
} as const;
export class QualityController {
  private slow = 0; private fast = 0;
  constructor(public level: Quality = 'high', public automatic = true) {}
  set(level: Quality) { this.level = level; this.slow = 0; this.fast = 0; }
  sample(ms: number): Quality | null {
    if (!this.automatic || ms <= 0 || ms > 250) { this.slow = this.fast = 0; return null; }
    this.slow = ms > 22 ? this.slow + ms : 0;
    this.fast = ms < 12 ? this.fast + ms : 0;
    const levels: Quality[] = ['eco', 'high', 'ultra'], index = levels.indexOf(this.level);
    if (this.slow >= 2000 && index > 0) { this.set(levels[index - 1]!); return this.level; }
    if (this.fast >= 10_000 && index < 2) { this.set(levels[index + 1]!); return this.level; }
    return null;
  }
}
