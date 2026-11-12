import { create } from 'zustand';
import type { MorphEffects } from '@witlu/engine';
import { Toggle } from './Toolbar';
import { useI18n } from '../i18n';
export const useMorphSettings = create<{
    effects: MorphEffects;
    opacity: number;
    toggle: (key: keyof MorphEffects) => void;
    setOpacity: (n: number) => void;
}>(set => ({ effects: { fill: true, boundaries: true, growth: true, front: true, ink: true, particles: true, trails: true }, opacity: .4, toggle: key => set(s => ({ effects: { ...s.effects, [key]: !s.effects[key] } })), setOpacity: opacity => set({ opacity }) }));
const labels: [
    keyof MorphEffects,
    string,
    string
][] = [['fill', '政权填色', 'Territory fill'], ['boundaries', '疆域边线', 'Territory borders'], ['growth', '距离场生长', 'SDF growth'], ['front', '金色前沿', 'Golden front'], ['ink', '开国水墨', 'Founding ink'], ['particles', '消亡光尘', 'Dissolution dust'], ['trails', '边界残影', 'Border trails']];
export function MorphControls() { const s = useMorphSettings(), { locale } = useI18n(); return <div className="terrain-switches">{labels.map(([key, zh, en]) => <Toggle key={key} label={locale === 'en' ? en : zh} checked={s.effects[key]} onChange={() => s.toggle(key)}/>)}<label className="morph-opacity">{locale === 'en' ? 'Fill opacity' : '填色透明度'} · {Math.round(s.opacity * 100)}%<input aria-label="填色透明度" type="range" min="0" max="0.8" step="0.01" value={s.opacity} onChange={e => s.setOpacity(Number(e.target.value))}/></label></div>; }
