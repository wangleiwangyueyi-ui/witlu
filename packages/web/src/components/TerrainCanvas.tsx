import {StaticAtlas} from './StaticAtlas';
import {releaseStartupData} from '../platform/startup';
import { phaseAtYear } from '@witlu/core/time';
import type { Phase } from '@witlu/core/time';
import { useEffect, useRef, useState } from 'react';
import { WebPlatformAdapter } from '../platform/WebPlatformAdapter';
import { useShell } from '../state/shell';
import { terrainBridge, useTerrainSettings } from '../state/terrain';
import { useReducedEffects } from './Glass';
import { useI18n } from '../i18n';
import { useEnvironmentSettings } from '../state/environment';
import type { CameraPose } from '@witlu/engine';
export function TerrainCanvas({ environment = false, initialPose, territories = false, flat = false, vectorEdges = false }: { environment?: boolean; initialPose?: Partial<CameraPose> | undefined; territories?:boolean; flat?:boolean; vectorEdges?:boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null), readout = useRef<HTMLOutputElement>(null);
  const [status, setStatus] = useState('loading'); const reduced = useReducedEffects(); const { locale } = useI18n();
  useEffect(() => { if (terrainBridge.engine) { terrainBridge.engine.camera.reducedMotion = reduced; terrainBridge.engine.environment.reducedMotion = reduced; terrainBridge.engine.morph.reducedMotion = reduced; } }, [reduced]);
  useEffect(() => {
    const element = canvas.current!;
    if(!element.getContext('webgl2',{antialias:false,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:false})){releaseStartupData();setStatus('error');document.documentElement.dataset.webgl='unavailable';window.dispatchEvent(new Event('atlas:no-webgl'));return;}
    const platform = new WebPlatformAdapter(element); let disposed = false; let cleanup = () => {};
    const home = flat ? Promise.all([
      fetch('/data/map-frames.json').then(r=>r.json() as Promise<Record<string,[number,number,number,number]>>),
      fetch('/data/phases.json').then(r=>r.json() as Promise<Phase[]>),
    ]).then(([frames,phases])=>frames[phaseAtYear(useShell.getState().year,phases)?.snapshot??'']).catch(()=>undefined) : undefined;
    void Promise.all([import('@witlu/engine'),home]).then(([{ AtlasRenderer }, bounds]) => {
      if (disposed) return;
      const css = getComputedStyle(document.documentElement), token = (name: string) => css.getPropertyValue(name).trim();
      const engine = new AtlasRenderer(platform, { sky: token('--sky'), land: token(flat ? '--land-flat' : '--land-low'), sea: token(flat ? '--sky' : '--sea-deep'), weather:{blue:token('--land-snow'),gold:token('--gold-glow'),fire:token('--cinnabar'),smoke:token('--land-ridge')}, morph: { gold:token('--gold-glow'),white:token('--text'),cinnabar:token('--cinnabar'),dust:token('--land-snow') }, environment: { sky: token('--sky'), horizon: token('--horizon'), shelf: token('--sea-shelf'), coast: token('--sea-coast'), flow: token('--sea-flow'), wave: token('--coastline'), cloud: token('--land-snow') } }, useShell.getState().quality, flat);
      terrainBridge.engine = engine; engine.camera.reducedMotion = useShell.getState().reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
      engine.morph.enabled=territories; engine.morph.vectorEdges=vectorEdges; engine.morph.reducedMotion=engine.camera.reducedMotion; engine.environment.enabled = environment; engine.environment.reducedMotion = engine.camera.reducedMotion;
      const media = matchMedia('(prefers-reduced-motion: reduce)');
      const applyMotion = () => { const value = useShell.getState().reducedMotion || media.matches; engine.camera.reducedMotion = value; engine.environment.reducedMotion = value; engine.morph.reducedMotion=value; };
      media.addEventListener('change', applyMotion);
      if (bounds) engine.camera.fitHome(bounds);
      if (initialPose) engine.camera.flyTo(initialPose, 0);
      const applySettings = () => { const s = useTerrainSettings.getState(); engine.terrain.effects = { displacement: s.displacement, relief: s.relief, water: s.water }; engine.quality.automatic = s.automatic; };
      const applyEnvironment = () => { engine.environment.effects = { ...useEnvironmentSettings.getState().effects }; }; applyEnvironment(); applySettings();
      const environmentOff = useEnvironmentSettings.subscribe(applyEnvironment), settingsOff = useTerrainSettings.subscribe(applySettings), shellOff = useShell.subscribe((s, previous) => { if (s.quality !== previous.quality) engine.setQuality(s.quality); if (s.reducedMotion !== previous.reducedMotion) applyMotion(); });
      engine.onQuality = quality => useShell.getState().setQuality(quality);
      engine.onStats = stats => { terrainBridge.stats = stats; element.dataset.stats = JSON.stringify(stats); element.dataset.context = stats.context; if (stats.tiles > 0 && element.dataset.ready !== 'true') { element.dataset.ready = 'true'; setStatus('ready');releaseStartupData(); } else if (!stats.tiles && stats.errors > 0 && stats.loading === 0) { setStatus('missing');releaseStartupData(); } terrainBridge.emit(); };
      engine.onPick = pick => { terrainBridge.pick = pick; if (readout.current) readout.current.textContent = pick ? `${pick.lon.toFixed(4)}° E · ${pick.lat.toFixed(4)}° N · ${Math.round(pick.elevation)} m` : '—'; terrainBridge.emit(); };
      cleanup = () => { media.removeEventListener('change', applyMotion); environmentOff(); settingsOff(); shellOff(); engine.dispose(); if (terrainBridge.engine === engine) { terrainBridge.engine = null; terrainBridge.stats = null; } };
    }).catch((e: unknown) => { if (!disposed) { releaseStartupData();setStatus('error'); window.dispatchEvent(new Event('atlas:no-webgl')); element.dataset.error=e instanceof Error ? e.message : String(e); } });
    return () => { disposed = true; cleanup(); platform.dispose(); };
  }, [environment, initialPose, territories, flat]);
  return <div className="map-scene terrain-scene">{status!=='ready'&&<StaticAtlas unavailable={status==='error'||status==='missing'}/>}<canvas ref={canvas} className="terrain-canvas" style={{visibility:status==='ready'?'visible':'hidden'}} tabIndex={status==='ready'?0:-1} aria-label={flat ? (locale==='en'?'Historical map. Drag to pan and scroll to zoom.':'历史地图：拖动平移，滚轮缩放。') : locale === 'en' ? '3D terrain map. Drag to pan, wheel to zoom, Shift-drag to rotate and tilt.' : '三维地形地图：拖动平移，滚轮缩放，Shift 拖动旋转与俯仰。'} data-testid="terrain" data-projection={flat?'orthographic':'perspective'}/>{!flat&&<div className="terrain-vignette"/>}{status === 'loading' && <p role="status" className="terrain-status">{locale === 'en' ? 'Loading the mountains…' : '山河正在展开…'}</p>}<output ref={readout} className="terrain-pick" aria-live="polite" data-testid="terrain-pick"/></div>;
}
