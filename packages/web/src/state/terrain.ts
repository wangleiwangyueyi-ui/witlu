import { create } from 'zustand';
import type { AtlasRenderer, EngineStats, TerrainPick } from '@witlu/engine';
interface TerrainSettings { displacement: boolean; relief: boolean; water: boolean; automatic: boolean; toggle(key: 'displacement' | 'relief' | 'water' | 'automatic'): void }
export const useTerrainSettings = create<TerrainSettings>(set => ({ displacement: true, relief: true, water: true, automatic: true, toggle: key => set(s => ({ [key]: !s[key] })) }));
// Throttled engine events, deliberately outside React's rendering state.
export const terrainBridge: { engine: AtlasRenderer | null; stats: EngineStats | null; pick: TerrainPick | null; listeners: Set<() => void>; emit(): void; subscribe(fn: () => void): () => void } = {
  engine: null, stats: null, pick: null, listeners: new Set(),
  emit() { this.listeners.forEach(fn => fn()); },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
};
