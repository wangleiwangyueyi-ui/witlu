import { create } from 'zustand';
import type { EnvironmentEffects } from '@witlu/engine';
interface Settings { effects: EnvironmentEffects; toggle(key: keyof EnvironmentEffects): void }
export const useEnvironmentSettings = create<Settings>(set => ({ effects: { waterMotion: true, moonlight: true, coastWaves: true, currents: true, sky: true, fog: true, lightCycle: true, clouds: true, cloudShadows: true }, toggle: key => set(s => ({ effects: { ...s.effects, [key]: !s.effects[key] } })) }));
