import { useEffect, useRef } from 'react';
import { activeTracks, sameYearSites } from '@witlu/core/time';
import { useReducedEffects } from './Glass';
import { useChronicle } from '../store/chronicle';
import { useShell } from '../state/shell';
import { useChapterSettings } from '../state/chapters';
import { useExplore } from '../state/explore';
import { storyLock } from '../state/weather';
import { timeStore } from '../store/time';
import { frameSites } from '../state/camera-story';
import { usePolityFocus } from '../state/polity-focus';
import { terrainBridge } from '../state/terrain';

export function useWorld() {
  const { data } = useChronicle(), year = useShell(s => s.year);
  const phase = data?.phases.slice().reverse().find(p => p.from <= year);
  const tracks = data && phase ? activeTracks(year, phase, data.registry, data.eras, data.events) : [];
  return { data, year, phase, tracks };
}
export function ResonanceDriver() {
  const {data,year}=useWorld(), enabled=useChapterSettings(s=>s.resonance), reduced=useReducedEffects();
  const initialYear=useRef(year);
  useEffect(()=>{const engine=terrainBridge.engine;if(!engine||!data)return;engine.resonance.enabled=enabled;if(!enabled||reduced)return;const timer=setTimeout(()=>{if(usePolityFocus.getState().focus || useExplore.getState().keys.length||useExplore.getState().quiz.length||storyLock.active || timeStore.getState().scrubbing || timeStore.getState().playing || Math.abs(timeStore.getState().velocity)>0)return;const sites=sameYearSites(year,data.events);if(sites.length>1){engine.resonance.trigger(sites);if(!engine.camera.userAdjusted&&(!engine.flat||year!==initialYear.current))frameSites(sites,800);}},300);return()=>clearTimeout(timer);},[data,year,enabled,reduced]);
  return null;
}
