import { create } from 'zustand';
import type { Locale } from '../i18n/messages';
export type Quality = 'ultra' | 'high' | 'eco';
export type Regime = 'wei' | 'shu' | 'wu';
function saved() { try { return JSON.parse(localStorage.getItem('witlu-ui') ?? '{}') as Record<string, unknown>; } catch { return {}; } }
const prefs = saved();
const params = new URLSearchParams(location.search);
const rawLocale = params.get('lang'); const queryLocale = rawLocale === 'zh-tw' ? 'zh-Hant' : rawLocale === 'zh-cn' ? 'zh-Hans' : rawLocale;
const locale: Locale = queryLocale === 'en' || queryLocale === 'zh-Hant' || queryLocale === 'zh-Hans' ? queryLocale : prefs.locale === 'en' || prefs.locale === 'zh-Hant' ? prefs.locale : 'zh-Hans';
const queryYear = Number((params.get('year') ?? '230').split(',')[0]);
interface ShellState {
  locale: Locale; year: number; quality: Quality; playing: boolean; regime: Regime;
  highlight: boolean; refraction: boolean; pressMotion: boolean; reducedMotion: boolean; about: boolean;
  layers: Record<string, boolean>;
  setLocale(value: Locale): void; setYear(value: number): void; setQuality(value: Quality): void;
  setRegime(value: Regime): void; togglePlaying(): void; setAbout(value: boolean): void;
  toggle(key: 'highlight' | 'refraction' | 'pressMotion' | 'reducedMotion'): void; toggleLayer(key: string): void;
}
export const useShell = create<ShellState>(set => ({
  locale, year: Number.isInteger(queryYear) && queryYear !== 0 && queryYear >= -403 && queryYear <= 2027 ? queryYear : 230,
  quality: prefs.quality === 'ultra' || prefs.quality === 'eco' ? prefs.quality : 'high',
  playing: false, regime: 'wei', highlight: prefs.highlight !== false, refraction: prefs.refraction !== false,
  pressMotion: prefs.pressMotion !== false,
  reducedMotion: prefs.reducedMotion === true, about: false,
  layers: { territories: true, divisions: false, prefectures: false, modern: false, rivers: true, places: true },
  setLocale: value => set({ locale: value }), setYear: value => { if (Number.isFinite(value)) set({ year: Math.min(2027, Math.max(-403, Math.round(value) || 1)) }); },
  setQuality: value => set({ quality: value }), setRegime: value => set({ regime: value }),
  togglePlaying: () => set(s => ({ playing: !s.playing })), setAbout: value => set({ about: value }),
  toggle: key => set(s => ({ [key]: !s[key] })), toggleLayer: key => set(s => ({ layers: { ...s.layers, [key]: !s.layers[key] } }))
}));
useShell.subscribe((s, previous) => {
  if (s.locale === previous.locale && s.quality === previous.quality && s.highlight === previous.highlight && s.refraction === previous.refraction && s.pressMotion === previous.pressMotion && s.reducedMotion === previous.reducedMotion) return;
  try { localStorage.setItem('witlu-ui', JSON.stringify({ locale: s.locale, quality: s.quality, highlight: s.highlight, refraction: s.refraction, pressMotion: s.pressMotion, reducedMotion: s.reducedMotion })); } catch { /* Private browsing can deny storage. */ }
});
