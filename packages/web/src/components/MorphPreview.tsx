import { useState } from 'react';
import { morphCases } from '../lab/morph-cases';
import { terrainBridge } from '../state/terrain';
import { GlassButton } from './Glass';
export function MorphPreview() {
    const [index, setIndex] = useState(0), [error, setError] = useState('');
    const play = (reverse: boolean) => { const c = morphCases[index]!, engine = terrainBridge.engine; if (!engine)
        return; setError(''); void engine.morph.play(reverse ? c.b : c.a, reverse ? c.a : c.b).catch(e => setError(String(e))); };
    return <div className="morph-preview"><label>预览过渡<select aria-label="预览过渡" value={index} onChange={e => setIndex(Number(e.target.value))}>{morphCases.map((c, i) => <option key={c.a} value={i}>{c.label}</option>)}</select></label><div className="morph-actions"><GlassButton onClick={() => play(false)}>正放</GlassButton><GlassButton onClick={() => play(true)}>倒放</GlassButton></div><a href="/lab/morph">进入生长实验室 ↗</a>{error && <p role="alert">{error}</p>}</div>;
}
