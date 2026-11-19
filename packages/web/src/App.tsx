import {MotionSensorDriver} from './components/MotionSensor';
import {isRestoringQuery} from './state/atlas-api';
import {usePlaces} from './state/places';
import {Opening} from './components/Opening';
import {SharePoster} from './components/SharePoster';
import {AtlasAccess,EmbedControls} from './components/AtlasAccess';
import {ExplorationDriver,ExploreOverlays} from './components/Explore';
import {NarrationDriver} from './components/Listening';
import {PlacesDriver,PlaceLabels,MapInspection,PlaceCard} from './components/Places';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { phaseAtYear } from '@witlu/core/time';
import type { Phase } from '@witlu/core/time';
import { useShell } from './state/shell';
import { useI18n } from './i18n';
import { ToastProvider } from './components/Toast';
import { Toolbar } from './components/Toolbar';
import {ChronicleSidebar, MapLegend} from './components/ChronicleSidebar';
import {useChapterSettings} from './state/chapters';
import { TimeDock } from './components/TimeDock';
import { Sheet } from './components/Sheet';
import { Refraction, supportsRefraction } from './components/Refraction';
import { useReducedEffects } from './components/Glass';
import { TerrainCanvas } from './components/TerrainCanvas';
import { TimeDriver } from './components/TimeDriver';
import { PolityLabels } from './components/PolityLabels';
import { ResonanceDriver } from './components/World';
import { TourDriver } from './components/Tour';
import { MorphTimeline } from './components/MorphTimeline';
import { WeatherDriver, WeatherCaption } from './components/Weather';
const MOBILE_POSE = {lon:110,lat:20,distance:8200,pitch:40};
const MAIN_POSE = {lon:120,lat:18,distance:8200};
const DebugConsole = lazy(() => import('./components/DebugConsole').then(module => ({ default: module.DebugConsole })));
const PolityDossier = lazy(() => import('./components/PolityDossier').then(module => ({ default: module.PolityDossier })));
const About = lazy(() => import('./components/About').then(module => ({ default: module.About })));
export function App() {
  const { t, locale } = useI18n(); const state = useShell(); const reduced = useReducedEffects();
  const selectedPolity=useChapterSettings(s=>s.selected);
  const previousRoute = useRef({ locale, year: state.year });
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 768px)').matches);
  const [sidebar,setSidebar]=useState(true);
  const [phases, setPhases] = useState<Phase[]>([]); const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const refractionSupported = supportsRefraction(); const snapshot = phaseAtYear(state.year, phases)?.snapshot ?? 's_sanguo';
  useEffect(() => { const query = matchMedia('(max-width: 768px)'); const change = () => setMobile(query.matches); query.addEventListener('change', change); return () => query.removeEventListener('change', change); }, []);
  useEffect(() => {
    const open = () => setSidebar(true);
    window.addEventListener('atlas:open-chronicle', open);
    return () => window.removeEventListener('atlas:open-chronicle', open);
  }, []);
  useEffect(() => { const controller = new AbortController(); Promise.all([fetch('/data/phases.json', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('phases'); return r.json() as Promise<Phase[]>; }), fetch('/data/manifest.json', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('manifest'); return r.json(); })]).then(([p]) => { setPhases(p); setStatus('ready'); }).catch((e: Error) => { if (e.name !== 'AbortError') setStatus('error'); }); return () => controller.abort(); }, []);
  useEffect(() => { document.documentElement.lang = locale; document.title = `${t('brand')} · ${t('app')}`; const url = new URL(location.href); let changed = false; if (previousRoute.current.locale !== locale) { url.searchParams.set('lang', locale); changed = true; } if (!isRestoringQuery() && previousRoute.current.year !== state.year) { if(usePlaces.getState().route.length<2)url.searchParams.set('year', String(state.year));else {const p=usePlaces.getState();url.searchParams.set('stop',String(Math.max(0,p.route.indexOf(p.selected!))));} changed = true; } if (changed) history.replaceState(null, '', url); previousRoute.current = { locale, year: state.year }; }, [locale, state.year, t]);
  const flat = new URLSearchParams(location.search).get('terrain') !== '1';
  const debug = new URLSearchParams(location.search).get('debug') === '1';
  return <MotionConfig reducedMotion={reduced ? 'always' : 'never'}><ToastProvider><div className="atlas-app" data-capture-root="true" data-sidebar={sidebar} data-map-mode={flat?'flat':'terrain'} data-locked={new URLSearchParams(location.search).get('lock')==='1'} data-embed={new URLSearchParams(location.search).get('embed')==='1'&&new URLSearchParams(location.search).get('debug')!=='1'} data-quality={state.quality} data-highlight={state.highlight && !reduced} data-refraction={state.refraction && refractionSupported && state.quality === 'ultra' && !reduced} data-reduced-motion={reduced}>
    <a className="skip-link" href="#history-controls" onClick={()=>window.dispatchEvent(new Event('atlas:open-chronicle'))}>{locale==='en'?'Skip to timeline':'跳到时间轴'}</a><MotionSensorDriver/><AtlasAccess/><PlacesDriver/><ExplorationDriver/><NarrationDriver/><TimeDriver/><WeatherDriver/><TourDriver/><ResonanceDriver/><Refraction/><div className="app-content" inert={state.about}><TerrainCanvas environment territories flat={flat} initialPose={flat?undefined:mobile ? MOBILE_POSE : MAIN_POSE}/><MorphTimeline phases={phases}/><PolityLabels flat={flat}/><PlaceLabels flat={flat}/><MapInspection/><WeatherCaption/><Toolbar refractionSupported={refractionSupported} mobile={mobile} flat={flat}/><MapLegend/>{mobile && new URLSearchParams(location.search).get('embed')!=='1' ? <Sheet heading={<TimeDock/>}><ChronicleSidebar/></Sheet> : <><button className="sidebar-toggle" aria-expanded={sidebar} aria-controls="chronicle-sidebar" onClick={()=>setSidebar(v=>!v)}>{sidebar?(locale==='en'?'Map':'全图'):(locale==='en'?'Chronicle':'史志')}</button>{sidebar&&<aside id="chronicle-sidebar" className="chronicle-sidebar glass"><ChronicleSidebar/></aside>}<TimeDock/></>}<span className="sr-only" role="status" data-testid="data-status">{t(status === 'ready' ? 'dataReady' : status === 'error' ? 'dataError' : 'loading')}</span></div>
    <Opening/><SharePoster/><EmbedControls/>{debug && <Suspense fallback={null}><DebugConsole snapshot={snapshot}/></Suspense>} {state.about && <Suspense fallback={null}><About/></Suspense>}{selectedPolity&&<Suspense fallback={null}><PolityDossier/></Suspense>}<PlaceCard/><ExploreOverlays/>
  </div></ToastProvider></MotionConfig>;
}
