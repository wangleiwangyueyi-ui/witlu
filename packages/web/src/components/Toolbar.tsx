import {CartographyControls} from './Places';
import { useState } from 'react';
import { GlassButton, GlassChip, Popover, SegmentedControl } from './Glass';
import { useI18n } from '../i18n';
import { useShell } from '../state/shell';
import type { Quality, Regime } from '../state/shell';
import type { Locale, MessageKey } from '../i18n/messages';
import { useToast } from './Toast';
import { weatherMixer, useAudioState } from '../audio/WeatherMixer';
import { terrainBridge } from '../state/terrain';
export function Toggle({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: () => void; disabled?: boolean }) { return <button type="button" className="toggle-row" role="switch" aria-checked={checked} disabled={disabled} onClick={onChange}><span>{label}</span><i aria-hidden="true"><b/></i></button>; }
function Search() {
  const { t } = useI18n(); const [query, setQuery] = useState(''); const select = useShell(s => s.setRegime); const toast = useToast();
  const results = (['wei', 'shu', 'wu'] as Regime[]).filter(key => `${t(key)} ${key}`.toLowerCase().includes(query.toLowerCase()));
  return <Popover icon="search" label={t('search')} className="search-popover"><input className="search-input" aria-label={t('searchPlaceholder')} placeholder={t('searchPlaceholder')} value={query} onChange={e => setQuery(e.target.value)}/><div className="search-results">{results.length ? results.map(key => <button type="button" key={key} onClick={() => { select(key); toast(`${t('selected')} · ${t(key)}`); }}>{t(key)}<span>{key === 'wei' ? t('main') : t('rival')}</span></button>) : <p>{t('noResults')}</p>}</div></Popover>;
}
function Music() {
  const {t}=useI18n(),playing=useAudioState(s=>s.enabled),toast=useToast();
  return <GlassButton icon="music" label={playing?t('pauseMusic'):t('playMusic')} aria-pressed={playing} onClick={()=>void weatherMixer.toggle().catch(()=>toast(t('musicError')))}/>;
}
export function Toolbar({ refractionSupported }: { refractionSupported: boolean }) {
  const { t, locale } = useI18n(); const state = useShell(); const toast = useToast();
  const layers: MessageKey[] = ['territories', 'divisions', 'prefectures', 'modern', 'rivers', 'places'];
  const qualities = (['ultra', 'high', 'eco'] as Quality[]).map(value => ({ value, label: t(value) }));
  const share = async () => { try { await navigator.clipboard.writeText(location.href); toast(t('shareCopied')); } catch { toast(t('shareFailed')); } };
  return <><header className="app-header"><div className="glass brand-capsule"><img src="/brand/seal.svg" alt="" width="46" height="46"/><div className="brand-text"><strong>{t('brand')}</strong><span>{t('app')}</span></div><span className="brand-divider"/><Search/></div><nav className="toolbar" aria-label={t('uiSettings')}>
    <Popover label={t('layers')} icon="layers"><p className="popover-note">{t('referenceHint')}</p>{layers.map(key => <Toggle key={key} label={t(key)} checked={state.layers[key] ?? false} onChange={() => state.toggleLayer(key)}/>) }<CartographyControls/></Popover>
    <Music/>
    <Popover label={t('language')} icon="language"><SegmentedControl label={t('language')} value={locale} options={[{ value: 'zh-Hans', label: '简' }, { value: 'zh-Hant', label: '繁' }, { value: 'en', label: 'EN' }] satisfies { value: Locale; label: string }[]} onChange={state.setLocale}/></Popover>
    <GlassButton icon="share" label={t('share')} onClick={() => void share()}/>
    <Popover label={t('more')} icon="more"><h4>{t('quality')}</h4><SegmentedControl label={t('quality')} value={state.quality} options={qualities} onChange={state.setQuality}/><Toggle label={t('highlight')} checked={state.highlight} onChange={() => state.toggle('highlight')}/><Toggle label={t('refraction')} checked={state.refraction && refractionSupported} disabled={!refractionSupported} onChange={() => state.toggle('refraction')}/><Toggle label={t('pressMotion')} checked={state.pressMotion} onChange={() => state.toggle('pressMotion')}/><Toggle label={t('motion')} checked={state.reducedMotion} onChange={() => state.toggle('reducedMotion')}/><button type="button" className="text-button" onClick={() => state.setAbout(true)}>{t('about')} <span>↗</span></button></Popover>
  </nav></header><div className="map-meta"><GlassChip>{t('reference')}</GlassChip><span>{t('caption')}</span></div><div className="camera-controls"><GlassButton icon="compass" label={t('reset')} onClick={() => { terrainBridge.engine?.camera.reset(); toast(t('resetDone')); }}/><span>{t('north')}</span></div></>;
}
