import { useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { phaseAtYear, addYears } from '@witlu/core/time';
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
function MapReference() {
  const { t } = useI18n();
  return <div className="map-scene" role="img" aria-label={t('referenceHint')}><svg className="reference-desktop" viewBox="280 135 1050 510" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><clipPath id="reference-crop"><rect x="0" y="135" width="1100" height="510"/></clipPath></defs><image href="/assets/reference/v3_desktop.jpg" width="1376" height="768" clipPath="url(#reference-crop)"/></svg><svg className="reference-mobile" viewBox="450 225 610 415" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="/assets/reference/v3_desktop.jpg" width="1376" height="768"/></svg><div className="scene-vignette"/></div>;
}
export function App() {
  const { t, locale } = useI18n(); const state = useShell(); const reduced = useReducedEffects();
  const previousRoute = useRef({ locale, year: state.year });
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 767px) and (orientation: portrait)').matches);
  const [phases, setPhases] = useState<Phase[]>([]); const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const refractionSupported = supportsRefraction(); const snapshot = phaseAtYear(state.year, phases)?.snapshot ?? 's_sanguo';
  useEffect(() => { const query = matchMedia('(max-width: 767px) and (orientation: portrait)'); const change = () => setMobile(query.matches); query.addEventListener('change', change); return () => query.removeEventListener('change', change); }, []);
  useEffect(() => { const controller = new AbortController(); Promise.all([fetch('/data/phases.json', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('phases'); return r.json() as Promise<Phase[]>; }), fetch('/data/manifest.json', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('manifest'); return r.json(); })]).then(([p]) => { setPhases(p); setStatus('ready'); }).catch((e: Error) => { if (e.name !== 'AbortError') setStatus('error'); }); return () => controller.abort(); }, []);
  useEffect(() => { document.documentElement.lang = locale; document.title = `${t('brand')} · ${t('app')}`; const url = new URL(location.href); let changed = false; if (previousRoute.current.locale !== locale) { url.searchParams.set('lang', locale); changed = true; } if (previousRoute.current.year !== state.year) { url.searchParams.set('year', String(state.year)); changed = true; } if (changed) history.replaceState(null, '', url); previousRoute.current = { locale, year: state.year }; }, [locale, state.year, t]);
  useEffect(() => { if (!state.playing) return; const timer = setInterval(() => useShell.getState().setYear(useShell.getState().year >= 280 ? 220 : addYears(useShell.getState().year, 1)), 1600); return () => clearInterval(timer); }, [state.playing]);
  const debug = new URLSearchParams(location.search).get('debug') === '1';
  return <MotionConfig reducedMotion={reduced ? 'always' : 'never'}><ToastProvider><div className="atlas-app" data-capture-root="true" data-quality={state.quality} data-highlight={state.highlight && !reduced} data-refraction={state.refraction && refractionSupported && state.quality !== 'eco' && !reduced} data-reduced-motion={reduced}>
    <Refraction/><div className="app-content" inert={state.about}><MapReference/><Toolbar refractionSupported={refractionSupported}/><div className="map-legend" aria-hidden="true"><span className="legend-dot wei"/>{t('wei')}<span className="legend-dot shu"/>{t('shu')}<span className="legend-dot wu"/>{t('wu')}</div>{mobile ? <Sheet heading={<ChapterHeading mobile/>}><ChapterContent mobile/></Sheet> : <><ChapterPanel/><TimeDock/></>}<div className="legal-strip">{t('disclaimer')} <span>·</span> {t('credit')} {t('upstream')}</div><span className="sr-only" role="status" data-testid="data-status">{t(status === 'ready' ? 'dataReady' : status === 'error' ? 'dataError' : 'loading')}</span></div>
    {debug && <DebugConsole snapshot={snapshot}/>} {state.about && <About/>}
  </div></ToastProvider></MotionConfig>;
}
