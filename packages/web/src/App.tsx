import {ExplorationDriver,ExploreOverlays} from './components/Explore';
import {NarrationDriver} from './components/Listening';
import {PlacesDriver,PlaceLabels,MapInspection,PlaceCard} from './components/Places';
import { useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { phaseAtYear } from '@witlu/core/time';
import type { Phase } from '@witlu/core/time';
import { useShell } from './state/shell';
import { useI18n } from './i18n';
import { ToastProvider } from './components/Toast';
import { Toolbar } from './components/Toolbar';
import { ChapterContent, ChapterHeading, ChapterPanel } from './components/Chapter';
import { TimeDock } from './components/TimeDock';
import { Sheet } from './components/Sheet';
import { Refraction, supportsRefraction } from './components/Refraction';
import { DebugConsole } from './components/DebugConsole';
import { About } from './components/About';
import { useReducedEffects } from './components/Glass';
import { TerrainCanvas } from './components/TerrainCanvas';
import { TimeDriver } from './components/TimeDriver';
import { PolityLabels } from './components/PolityLabels';
import { WorldTracks, PolityDossier, ResonanceDriver } from './components/World';
import { TourDriver } from './components/Tour';
import { MorphTimeline } from './components/MorphTimeline';
import { WeatherDriver, WeatherCaption } from './components/Weather';
const MOBILE_POSE = {lon:110,lat:20,distance:8200,pitch:40};
const MAIN_POSE = {lon:120,lat:18,distance:8200};
export function App() {
  const { t, locale } = useI18n(); const state = useShell(); const reduced = useReducedEffects();
  const previousRoute = useRef({ locale, year: state.year });
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 767px) and (orientation: portrait)').matches);
  const [phases, setPhases] = useState<Phase[]>([]); const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const refractionSupported = supportsRefraction(); const snapshot = phaseAtYear(state.year, phases)?.snapshot ?? 's_sanguo';
  useEffect(() => { const query = matchMedia('(max-width: 767px) and (orientation: portrait)'); const change = () => setMobile(query.matches); query.addEventListener('change', change); return () => query.removeEventListener('change', change); }, []);
  useEffect(() => { const controller = new AbortController(); Promise.all([fetch('/data/phases.json', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('phases'); return r.json() as Promise<Phase[]>; }), fetch('/data/manifest.json', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('manifest'); return r.json(); })]).then(([p]) => { setPhases(p); setStatus('ready'); }).catch((e: Error) => { if (e.name !== 'AbortError') setStatus('error'); }); return () => controller.abort(); }, []);
  useEffect(() => { document.documentElement.lang = locale; document.title = `${t('brand')} · ${t('app')}`; const url = new URL(location.href); let changed = false; if (previousRoute.current.locale !== locale) { url.searchParams.set('lang', locale); changed = true; } if (previousRoute.current.year !== state.year) { url.searchParams.set('year', String(state.year)); changed = true; } if (changed) history.replaceState(null, '', url); previousRoute.current = { locale, year: state.year }; }, [locale, state.year, t]);
  const debug = new URLSearchParams(location.search).get('debug') === '1';
  return <MotionConfig reducedMotion={reduced ? 'always' : 'never'}><ToastProvider><div className="atlas-app" data-capture-root="true" data-embed={new URLSearchParams(location.search).get('embed')==='1'&&new URLSearchParams(location.search).get('debug')!=='1'} data-quality={state.quality} data-highlight={state.highlight && !reduced} data-refraction={state.refraction && refractionSupported && state.quality !== 'eco' && !reduced} data-reduced-motion={reduced}>
    <PlacesDriver/><ExplorationDriver/><NarrationDriver/><TimeDriver/><WeatherDriver/><TourDriver/><ResonanceDriver/><Refraction/><div className="app-content" inert={state.about}><TerrainCanvas environment territories initialPose={mobile ? MOBILE_POSE : MAIN_POSE}/><MorphTimeline phases={phases}/><PolityLabels/><PlaceLabels/><MapInspection/><WeatherCaption/><Toolbar refractionSupported={refractionSupported}/>{mobile ? <Sheet heading={<ChapterHeading mobile/>}><ChapterContent mobile/></Sheet> : <><ChapterPanel/><WorldTracks/><TimeDock/></>}<div className="legal-strip">{t('disclaimer')} <span>·</span> {t('credit')} {t('upstream')} · Terrain: USGS / NOAA · Natural Earth</div><span className="sr-only" role="status" data-testid="data-status">{t(status === 'ready' ? 'dataReady' : status === 'error' ? 'dataError' : 'loading')}</span></div>
    {debug && <DebugConsole snapshot={snapshot}/>} {state.about && <About/>}<PolityDossier/><PlaceCard/><ExploreOverlays/>
  </div></ToastProvider></MotionConfig>;
}
