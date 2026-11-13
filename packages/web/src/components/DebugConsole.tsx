import { useEffect, useRef, useState } from 'react';
import { GlassButton, GlassPanel, SegmentedControl } from './Glass';
import { useI18n } from '../i18n';
import { useShell } from '../state/shell';
import type { Quality } from '../state/shell';
import { useToast } from './Toast';
import { terrainBridge } from '../state/terrain';
import { TerrainControls } from './TerrainControls';
import { EnvironmentControls } from './EnvironmentControls';
import { MorphPreview } from './MorphPreview';
import { ChapterEffectControls } from './Tour';
import { TimeEffectControls } from './TimeDock';
import { MorphControls } from './MorphControls';
import { WeatherControls } from './Weather';
export function DebugConsole({ snapshot }: { snapshot: string }) {
  const { t } = useI18n(); const quality = useShell(s => s.quality), year = useShell(s => s.year), setQuality = useShell(s => s.setQuality);
  const fps = useRef<HTMLOutputElement>(null), metrics = useRef<HTMLOutputElement>(null); const [capturing, setCapturing] = useState(false); const toast = useToast();
  useEffect(() => terrainBridge.subscribe(() => {
    const stats = terrainBridge.stats; if (!stats) return;
    if (fps.current) fps.current.textContent = stats.fps.toFixed(1);
    if (metrics.current) metrics.current.textContent = `${stats.context === 'lost' ? 'CONTEXT LOST · recovering' : 'WebGL2'} · z${stats.zoom} · DPR ${stats.pixelRatio.toFixed(1)}\n${stats.tiles} tiles / ${stats.cached} cached · ${stats.drawCalls} calls\nFrame ${stats.frameMs.toFixed(1)} ms · CPU ${stats.cpuMs.toFixed(1)} ms\n${stats.triangles.toLocaleString()} triangles · ${stats.loading} loading\n${stats.pose.pitch.toFixed(1)}° tilt · ${stats.pose.bearing.toFixed(1)}° bearing\nEnvironment ${stats.environment.ready ? 'ready' : stats.environment.error ?? 'loading'} · ${stats.environment.time.toFixed(1)} s\n${stats.environment.clouds} clouds × ${stats.environment.cloudLayers} layers · shadow ${(stats.environment.shadowStrength * 100).toFixed(0)}%\n${stats.environment.normalLayers} normals · ${stats.environment.currentParticles} currents\nMorph ${stats.morph.mode} · ${stats.morph.t.toFixed(3)} · ${stats.morph.preparationMs.toFixed(0)} ms prep\n${stats.morph.labelSize}² labels · ${stats.morph.involved} SDFs · cache ${stats.morph.cacheHit ? 'hit' : 'miss'}`;
  }), []);
  const capture = async () => {
    setCapturing(true); let frozen: HTMLImageElement | null = null; const canvas = document.querySelector<HTMLCanvasElement>('.terrain-canvas');
    try {
      await document.fonts.ready;
      const { toBlob } = await import('html-to-image'); const node = document.querySelector<HTMLElement>('[data-capture-root]')!;
      // Copy the WebGL buffer synchronously before its next presentation clears it.
      if (canvas && terrainBridge.engine) { terrainBridge.engine.renderNow(); frozen = new Image(); frozen.src = canvas.toDataURL('image/png'); frozen.className = canvas.className; frozen.style.position = 'absolute'; frozen.style.inset = '0'; canvas.after(frozen); await frozen.decode(); canvas.style.visibility = 'hidden'; }
      const blob = await toBlob(node, { pixelRatio: Math.min(devicePixelRatio, 2), filter: element => element !== canvas && !(element instanceof HTMLElement && element.hasAttribute('data-capture-ignore')), backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--sky').trim() });
      if (!blob) throw new Error('Empty capture');
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.download = `witlu-${year}.png`; link.href = url; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000); toast(t('screenshotDone'));
    } catch { toast(t('screenshotError')); } finally { frozen?.remove(); if (canvas) canvas.style.visibility = ''; setCapturing(false); }
  };
  return <GlassPanel role="complementary" aria-label={t('debug')} className="debug-console" data-capture-ignore="true"><div className="debug-title"><span className="debug-light"/><h2>{t('debug')}</h2><span>P7</span></div><dl><div><dt>{t('fps')}</dt><dd><output ref={fps} data-testid="fps">—</output> fps</dd></div><div><dt>{t('year')}</dt><dd>{year}</dd></div><div><dt>{t('snapshot')}</dt><dd data-testid="snapshot">{snapshot}</dd></div></dl><output ref={metrics} className="engine-metrics" data-testid="engine-metrics"/><SegmentedControl label={t('quality')} value={quality} onChange={setQuality} options={(['ultra', 'high', 'eco'] as Quality[]).map(value => ({ value, label: t(value) }))}/><details><summary>{t('effects')}</summary><TerrainControls/><EnvironmentControls/><MorphControls/><TimeEffectControls/></details><details><summary>{t('transitions')}</summary><MorphPreview/></details>{(['moods', 'openings'] as const).map(key => <details key={key}><summary>{t(key)}</summary>{key === 'openings' ? <ChapterEffectControls/> : <WeatherControls/>}</details>)}<GlassButton icon="camera" disabled={capturing} onClick={() => void capture()}>{t('screenshot')}</GlassButton></GlassPanel>;
}
