import { useEffect, useRef, useState } from 'react';
import { Opening, OPENING_MS, STATIC_OPENING_MS, openingEase } from '@witlu/engine/opening';
import type { OpeningTarget } from '@witlu/engine/opening';
import { WebPlatformAdapter } from '../platform/WebPlatformAdapter';
import { useShell } from '../state/shell';
import { terrainBridge } from '../state/terrain';
import { Calligraphy, loadCalligraphy } from './Calligraphy';
import './opening-film.css';

interface Props {
  fixedTime?: number | undefined;
  onStart(mode: 'animated' | 'static'): void;
  onFinish(): void;
}
type Strokes = Awaited<ReturnType<typeof loadCalligraphy>>;
const titleY = .78;

export default function OpeningFilm({fixedTime,onStart,onFinish}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null), layer = useRef<HTMLDivElement>(null), title = useRef<HTMLDivElement>(null);
  const [ink, setInk] = useState<{glyphs: Strokes | undefined; animated: boolean}>();
  const held = fixedTime === undefined ? undefined : Math.min(fixedTime,OPENING_MS);
  const locale = useShell(state => state.locale);
  const phrase = locale === 'zh-Hant' ? '兩千四百年 · 一圖觀之' : '两千四百年 · 一图观之';

  useEffect(() => {
    const atlas = terrainBridge.engine;
    const map = document.querySelector<HTMLCanvasElement>('.terrain-canvas');
    const surface = canvas.current, film = layer.current, writing = title.current, host = film?.parentElement;
    if (!atlas || !map || !surface || !film || !writing || !host) { onFinish(); return; }
    const platform = new WebPlatformAdapter(surface);
    const tokens = getComputedStyle(document.documentElement);
    const shade = (token: string) => tokens.getPropertyValue(token).trim();
    let globe: Opening;
    try {
      globe = new Opening(platform, {sky:shade('--sky'), blue:shade('--coastline'), mist:shade('--land-snow'), gold:shade('--gold-glow')});
    } catch {
      platform.dispose();
      onFinish();
      return;
    }

    let disposed = false, frame = 0, startedAt = 0, still = false, covered = false;
    let target: OpeningTarget;
    let logoX = 0, logoY = 0, logoScale = .08;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => {
      const pose = atlas.pose(), bounds = map.getBoundingClientRect(), full = surface.getBoundingClientRect();
      const logo = document.querySelector('.brand-capsule img')?.getBoundingClientRect();
      target = {lon:pose.lon,lat:pose.lat,metresPerPixel:atlas.camera.metresPerPixel(),
        x:bounds.left + bounds.width / 2 - full.left, y:bounds.top + bounds.height / 2 - full.top};
      logoX = (logo ? logo.left + logo.width / 2 : 32) - full.left - full.width / 2;
      logoY = (logo ? logo.top + logo.height / 2 : 26) - full.top - full.height * titleY;
      logoScale = Math.min(.18,(logo?.width ?? 28) / Math.max(160,writing.offsetWidth));
      film.style.setProperty('--opening-title-y', `${titleY * 100}%`);
      globe.resize(useShell.getState().quality);
      if (startedAt && (still || held !== undefined)) globe.draw(held??0,target,still);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(map);
    observer.observe(surface);
    const motionChange = () => { if (startedAt && reduced.matches && !still) onFinish(); };
    reduced.addEventListener('change',motionChange);
    const context = platform.onContextChange(onFinish,()=>{});

    function update(now: number) {
      if (disposed) return;
      const first = !startedAt;
      if (first) startedAt = now;
      const duration = still ? STATIC_OPENING_MS : OPENING_MS;
      const elapsed = held ?? Math.min(duration,now-startedAt);
      if (covered && elapsed >= 4200) {
        covered = false;
        atlas!.coverForOpening(false);
      }
      if (!still || first) globe.draw(elapsed,target,still);

      const flight = still ? 0 : openingEase(4120,5550,elapsed);
      const opacity = still ? openingEase(0,1100,elapsed) : openingEase(1450,1810,elapsed) * (1 - openingEase(5140,5580,elapsed));
      const dissolve = still ? openingEase(1190,1500,elapsed) : openingEase(4420,5540,elapsed);
      film!.style.setProperty('--opening-fade',String(1-dissolve));
      writing!.style.opacity = String(opacity);
      writing!.style.setProperty('--opening-dot',String(still ? 1 : openingEase(2710,2850,elapsed)));
      if (!still) writing!.style.transform = `translate(-50%,-50%) translate3d(${logoX*flight}px,${logoY*flight}px,0) scale(${1-flight*(1-logoScale)})`;
      host!.dataset.progress = (elapsed/duration).toFixed(3);
      host!.dataset.elapsed = elapsed.toFixed(1);
      host!.dataset.mapBlend = dissolve.toFixed(3);

      if (first) {
        host!.dataset.resolution = String(globe.resolution);
        host!.dataset.mapFocus = `${target.x.toFixed(2)},${target.y.toFixed(2)},${target.metresPerPixel.toFixed(2)}`;
        if (!still && held === undefined) { covered = true; atlas!.coverForOpening(true); }
        onStart(still?'static':'animated');
      }
      if (held !== undefined) return;
      if (elapsed === duration) onFinish();
      else frame = platform.requestFrame(update);
    }

    const deadline = setTimeout(onFinish,6500);
    void Promise.all([globe.load(),loadCalligraphy().catch(()=>undefined)]).then(([,glyphs]) => {
      if (disposed) return;
      clearTimeout(deadline);
      const settings = useShell.getState();
      still = held === undefined && (reduced.matches || settings.reducedMotion || settings.quality === 'eco');
      setInk({glyphs,animated:!still});
      resize();
      globe.draw(held??0,target,still);
      frame = platform.requestFrame(update);
    }).catch(() => { if (!disposed) onFinish(); });

    return () => {
      disposed = true;
      clearTimeout(deadline);
      platform.cancelFrame(frame);
      if (covered) atlas.coverForOpening(false);
      observer.disconnect();
      reduced.removeEventListener('change',motionChange);
      context();
      platform.dispose();
      globe.dispose();
    };
  }, [held,onFinish,onStart]);

  return <div className="opening-film" ref={layer}>
    <canvas ref={canvas} className="opening-earth" aria-hidden="true"/>
    <div ref={title} className="opening-title"><Calligraphy
      text={phrase} label={locale === 'en' ? '2,400 years · One living atlas' : phrase}
      opening={{glyphs:ink?.glyphs,animated:ink?.animated??false,duration:2420,delay:1490,elapsed:held}}/></div>
  </div>;
}
