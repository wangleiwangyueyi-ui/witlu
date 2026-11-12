import { describe, expect, it } from 'vitest';
import { cloudCohorts, cloudFade, coastWavePhase, DEFAULT_EFFECTS, effectiveSettings, ENVIRONMENT_QUALITY, sunAzimuth } from './model';
describe('quiet environment budgets', () => {
  it('cycles sunlight ±15 degrees in three minutes without discontinuities', () => {
    expect(sunAzimuth(0)).toBe(-40); expect(sunAzimuth(45)).toBe(-25); expect(sunAzimuth(135)).toBe(-55); expect(sunAzimuth(180)).toBeCloseTo(-40); expect(sunAzimuth(45, false)).toBe(-40);
  });
  it('coast crests propagate towards land', () => {
    expect(coastWavePhase(24 - .38 * 24 / (2 * Math.PI), 1)).toBeCloseTo(coastWavePhase(24, 0));
  });
  it('adds one or two cloud groups every 45 seconds with no pop at birth', () => {
    for (let generation = 1; generation < 20; generation++) {
      const birth = generation * 45 - 20, previous = new Set(cloudCohorts(birth - .001, 6).map(c => c.id));
      const arriving = cloudCohorts(birth, 6).filter(c => !previous.has(c.id));
      expect(arriving.length).toBe(generation % 2 ? 1 : 2); expect(arriving.every(c => c.alpha === 0)).toBe(true);
    }
    for (let t = 0; t <= 600; t++) expect(cloudCohorts(t, 6).every(c => c.alpha >= 0 && c.alpha <= .35)).toBe(true);
  });
  it('fades cloud and its shadow together at close range', () => {
    expect(cloudFade(750)).toBe(0); expect(cloudFade(0)).toBe(0); expect(cloudFade(1500)).toBe(.5); expect(cloudFade(2250)).toBe(1); expect(cloudFade(8000)).toBe(1);
  });
  it('honors independent switches, tier budgets and reduced motion', () => {
    for (const quality of ['ultra','high','eco'] as const) {
      const full = effectiveSettings(quality, DEFAULT_EFFECTS, false); expect(full.moon).toBeLessThanOrEqual(.25); expect(full.cloudLayers).toBe(ENVIRONMENT_QUALITY[quality].cloudLayers);
      const off = effectiveSettings(quality, {...DEFAULT_EFFECTS, coastWaves:false,currents:false,moonlight:false,cloudShadows:false}, true);
      expect(off).toMatchObject({motion:false, waves:false, currents:0, shadows:0,moon:0});
    }
    expect(effectiveSettings('eco',DEFAULT_EFFECTS,false)).toMatchObject({normalLayers:1,shadows:0,currents:0,waves:false});
    expect(effectiveSettings('high',{...DEFAULT_EFFECTS,clouds:false},false).shadows).toBe(0);
  });
});
