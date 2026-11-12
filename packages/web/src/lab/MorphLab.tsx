import { useEffect, useRef, useState } from 'react';
import type { Snapshot } from '@witlu/engine';
import { TerrainCanvas } from '../components/TerrainCanvas';
import { GlassButton, GlassPanel, SegmentedControl } from '../components/Glass';
import { ToastProvider } from '../components/Toast';
import { DebugConsole } from '../components/DebugConsole';
import { MorphControls, useMorphSettings } from '../components/MorphControls';
import { terrainBridge } from '../state/terrain';
import { useShell } from '../state/shell';
import { morphCases } from './morph-cases';
const initialCase = morphCases[Number(new URLSearchParams(location.search).get('case') ?? 0)] ?? morphCases[0]!;
export default function MorphLab() {
    const [pose] = useState(() => matchMedia('(max-width: 767px) and (orientation: portrait)').matches ? { lon: 105, lat: 20, distance: 11000 } : undefined);
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]), [a, setA] = useState(initialCase.a), [b, setB] = useState(initialCase.b), [progress, setProgress] = useState(0), [error, setError] = useState('');
    const output = useRef<HTMLOutputElement>(null), slider = useRef<HTMLInputElement>(null), prepared = useRef('');
    const quality = useShell(s => s.quality), setQuality = useShell(s => s.setQuality);
    useEffect(() => { void fetch('/data/snapshots.json').then(r => r.json()).then(setSnapshots); }, []);
    useEffect(() => { let cancelled = false; prepared.current = ''; const prepare = () => { const engine = terrainBridge.engine; if (!engine || prepared.current === `${a}|${b}`)
        return; prepared.current = `${a}|${b}`; setError(''); void engine.morph.prepare(a, b).then(() => { if (!cancelled) {
        setProgress(0);
        engine.morph.setProgress(0, 'seek');
    } }).catch(e => { if (!cancelled)
        setError(String(e)); }); }; prepare(); const off = terrainBridge.subscribe(prepare); return () => { cancelled = true; off(); }; }, [a, b]);
    useEffect(() => terrainBridge.subscribe(() => { const m = terrainBridge.stats?.morph; if (output.current && m) {
        output.current.textContent = m.error ?? (m.preparing ? '准备距离场…' : `${m.mode} · ${m.preparationMs.toFixed(0)}ms 准备 · ${m.involved} 政权 · ${m.labelSize}² / SDF ${m.fieldSize}² · ${terrainBridge.stats!.fps.toFixed(1)}fps`);
        if (slider.current && document.activeElement !== slider.current)
            slider.current.value = String(m.t);
    } }), []);
    useEffect(() => { const apply = () => { const e = terrainBridge.engine; if (e) {
        const s = useMorphSettings.getState();
        e.morph.effects = { ...s.effects };
        e.morph.fillOpacity = s.opacity;
    } }; const off = useMorphSettings.subscribe(apply), ready = terrainBridge.subscribe(apply); apply(); return () => { off(); ready(); }; }, []);
    return <ToastProvider><main className="atlas-app terrain-lab morph-lab" data-capture-root="true" data-quality={quality}><TerrainCanvas environment territories {...(pose ? {initialPose:pose} : {})}/><GlassPanel className="morph-lab-controls"><p className="eyebrow">P4 · MORPH LAB</p><h1>山河分合</h1><label>验收过渡<select aria-label="验收过渡" value={morphCases.findIndex(c => c.a === a && c.b === b)} onChange={e => { const c = morphCases[Number(e.target.value)]; if (c) {
        setA(c.a);
        setB(c.b);
    } }}><option value="-1">自选快照</option>{morphCases.map((c, i) => <option key={c.label} value={i}>{c.label}</option>)}</select></label><div className="morph-snapshots">{[['A', a, setA], ['B', b, setB]].map(([label, value, setter]) => <label key={label as string}>{label as string}<select aria-label={`快照 ${label as string}`} value={value as string} onChange={e => (setter as (v: string) => void)(e.target.value)}>{snapshots.map(s => <option key={s.key} value={s.key}>{s.from} · {s.caption || s.key}</option>)}</select></label>)}</div><label>过渡进度<input ref={slider} type="range" min="0" max="1" step="0.001" aria-label="过渡进度" defaultValue={progress} onChange={e => { const t = Number(e.target.value); setProgress(t); terrainBridge.engine?.morph.setProgress(t); }}/></label><div className="morph-actions"><GlassButton onClick={() => terrainBridge.engine?.morph.playPrepared(false)}>正放</GlassButton><GlassButton onClick={() => terrainBridge.engine?.morph.playPrepared(true)}>倒放</GlassButton><GlassButton onClick={() => { const t = terrainBridge.stats?.morph.t ?? 0; setProgress(t); terrainBridge.engine?.morph.setProgress(t, 'seek'); }}>暂停</GlassButton></div><output ref={output} data-testid="morph-status"/>{error && <p role="alert">{error}</p>}<details><summary>画质与生长特效</summary><SegmentedControl label="画质" value={quality} onChange={setQuality} options={[{ value: 'ultra', label: '极致' }, { value: 'high', label: '高' }, { value: 'eco', label: '省电' }]}/><MorphControls /></details><a href="/">返回江山 ↗</a></GlassPanel>{new URLSearchParams(location.search).get('debug') === '1' && <DebugConsole snapshot={`${a} → ${b}`}/>}</main></ToastProvider>;
}
