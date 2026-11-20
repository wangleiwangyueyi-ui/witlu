import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { terrainBridge } from '../state/terrain';
import { GlassButton } from './Glass';
import { useExploreText } from './Explore';

const OpeningFilm = lazy(() => import('./OpeningFilm'));
const seenKey = 'witlu-intro-v1';
const preferenceKey = 'witlu-intro-enabled';
type Phase = 'loading' | 'animated' | 'static';

function firstVisit() {
  if (location.pathname !== '/' || (location.search && location.search !== '?terrain=1')) return false;
  try { return localStorage.getItem(preferenceKey) !== 'false' && !localStorage.getItem(seenKey); }
  catch { return !sessionSeen; }
}
let sessionSeen = false;
function remember() {
  sessionSeen = true;
  try { localStorage.setItem(seenKey, 'seen'); } catch { /* Storage is optional. */ }
}

export function Opening({ force = false, fixedTime }: { force?: boolean; fixedTime?: number | undefined }) {
  const [requested, setRequested] = useState(() => force || firstVisit());
  const [mapReady, setMapReady] = useState(false);
  const [phase, setPhase] = useState<Phase>('loading');
  const root = useRef<HTMLDivElement>(null);
  const t = useExploreText();

  const finish = useCallback(() => {
    terrainBridge.engine?.coverForOpening(false);
    setRequested(false);
    setPhase('loading');
  }, []);
  const start = useCallback((mode: Exclude<Phase,'loading'>) => {
    remember();
    setPhase(mode);
  }, []);
  const skip = useCallback(() => {
    remember();
    finish();
  }, [finish]);

  useEffect(() => {
    const ready = () => {
      const stats = terrainBridge.stats;
      if (stats && (stats.context === 'lost' || (!stats.tiles && stats.errors > 0 && !stats.loading))) {
        setMapReady(false);
        finish();
      } else if (terrainBridge.engine && stats?.tiles) setMapReady(true);
    };
    const unavailable = () => finish();
    const replay = () => {
      if (document.documentElement.dataset.webgl !== 'unavailable') setRequested(true);
    };
    if (document.documentElement.dataset.webgl === 'unavailable') unavailable();
    const off = terrainBridge.subscribe(ready);
    ready();
    addEventListener('atlas:no-webgl', unavailable);
    addEventListener('atlas:opening', replay);
    return () => {
      off();
      removeEventListener('atlas:no-webgl', unavailable);
      removeEventListener('atlas:opening', replay);
    };
  }, [finish]);

  useEffect(() => {
    if (!requested) return;
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') skip(); };
    const useMap = (event: PointerEvent) => {
      if (phase === 'loading' && event.target instanceof Node && !root.current?.contains(event.target)) skip();
    };
    addEventListener('keydown', keyboard);
    addEventListener('pointerdown', useMap, true);
    return () => {
      removeEventListener('keydown', keyboard);
      removeEventListener('pointerdown', useMap, true);
    };
  }, [phase, requested, skip]);

  if (!requested) return null;
  return <div ref={root} className="opening-screen" role="dialog" aria-modal={phase !== 'loading'}
    aria-label={t('开场地球','Opening globe')} data-mode={phase}>
    {mapReady && <Suspense fallback={null}><OpeningFilm fixedTime={fixedTime} onStart={start} onFinish={finish}/></Suspense>}
    <GlassButton className="opening-skip" onClick={skip}>{t('跳过开场','Skip introduction')} ↘</GlassButton>
  </div>;
}

export function OpeningSettings() {
  const t = useExploreText();
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(preferenceKey) !== 'false'; } catch { return true; }
  });
  return <>
    <button type="button" className="toggle-row" role="switch" aria-checked={enabled} onClick={() => {
      setEnabled(!enabled);
      try { localStorage.setItem(preferenceKey, String(!enabled)); } catch { /* Storage is optional. */ }
    }}>{t('首次访问开场地球','First-visit globe')}<i aria-hidden="true"><b/></i></button>
    <button type="button" className="text-button" onClick={() => window.dispatchEvent(new Event('atlas:opening'))}>{t('重播开场','Replay introduction')}</button>
  </>;
}
