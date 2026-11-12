import type { Quality } from '../Quality';
export const ENVIRONMENT_QUALITY = {
  ultra: { normalLayers: 2, cloudLayers: 4, cloudLimit: 6, shadows: .07, currents: 40, waves: true, moon: .18 },
  high: { normalLayers: 2, cloudLayers: 1, cloudLimit: 4, shadows: .05, currents: 24, waves: true, moon: .12 },
  eco: { normalLayers: 1, cloudLayers: 1, cloudLimit: 2, shadows: 0, currents: 0, waves: false, moon: .07 }
} as const;
export interface EnvironmentEffects { waterMotion: boolean; moonlight: boolean; coastWaves: boolean; currents: boolean; sky: boolean; fog: boolean; lightCycle: boolean; clouds: boolean; cloudShadows: boolean }
export const DEFAULT_EFFECTS: EnvironmentEffects = { waterMotion: true, moonlight: true, coastWaves: true, currents: true, sky: true, fog: true, lightCycle: true, clouds: true, cloudShadows: true };
export const SUN_BASE = -40;
export function sunAzimuth(seconds: number, moving = true) { return SUN_BASE + (moving ? 15 * Math.sin(seconds / 180 * Math.PI * 2) : 0); }
export function cloudFade(distance: number) { const t = Math.max(0, Math.min(1, (distance - 750) / 1500)); return t * t * (3 - 2 * t); }
export function coastWavePhase(distanceKm: number, seconds: number) { return distanceKm * Math.PI * 2 / 24 + seconds * .38; }
export function effectiveSettings(quality: Quality, effects: EnvironmentEffects, reduced: boolean) {
  const preset = ENVIRONMENT_QUALITY[quality];
  return { ...preset, motion: !reduced, waves: preset.waves && effects.coastWaves, currents: effects.currents && !reduced ? preset.currents : 0, shadows: effects.clouds && effects.cloudShadows ? preset.shadows : 0, moon: effects.moonlight ? preset.moon : 0 };
}
/** Two initial groups already in flight; one/two new groups every 45 seconds. */
export function cloudCohorts(time: number, limit: number) {
  const cohorts: { id: number; age: number; alpha: number; offsetX: number; offsetZ: number }[] = [];
  const latest = Math.floor((time + 20) / 45);
  for (let generation = latest - 2; generation <= latest; generation++) {
    const age = time + 20 - generation * 45; if (age < 0 || age > 110) continue;
    const envelope = Math.min(1, age / 12, (110 - age) / 18);
    const count = Math.abs(generation % 2) === 0 ? 2 : 1;
    for (let i = 0; i < count; i++) cohorts.push({ id: generation * 2 + i, age, alpha: Math.max(0, envelope) * .27, offsetX: (i ? 600 : -700) + ((generation % 3 + 3) % 3 - 1) * 550 + age * 1.9, offsetZ: (i ? -450 : 300) + ((generation % 2 + 2) % 2) * 500 - age * .55 });
  }
  return cohorts.slice(-limit);
}
