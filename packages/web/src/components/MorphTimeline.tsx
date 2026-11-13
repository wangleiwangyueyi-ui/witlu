import { useEffect } from 'react';
import { createSnapshotTimeline, yearToIndex } from '@witlu/core/time';
import type { Phase } from '@witlu/core/time';
import { terrainBridge } from '../state/terrain';
import { useShell } from '../state/shell';
import { timeStore } from '../store/time';
import { useMorphSettings } from './MorphControls';
export function MorphTimeline({ phases }: {
    phases: Phase[];
}) {
    useEffect(() => {
        if (!phases.length)
            return;
        const timeline = createSnapshotTimeline(phases.map(p => ({ year: p.from, snapshot: p.snapshot })));
        let current = '', request = 0, started = false, previousIndex = timeStore.getState().index, lastApplied = 0;
        let preparing: Promise<void> = Promise.resolve();
        let trailing: ReturnType<typeof setTimeout> | undefined, settle: ReturnType<typeof setTimeout> | undefined;
        const apply = () => {
            const engine = terrainBridge.engine;
            if (!engine)
                return;
            const state = useShell.getState(), s = useMorphSettings.getState();
            engine.morph.enabled = state.layers.territories !== false;
            engine.morph.effects = { ...s.effects };
            engine.morph.fillOpacity = s.opacity;
        };
        const update = async (force = false) => {
            const engine = terrainBridge.engine;
            if (!engine)
                return;
            const state = timeStore.getState(), now = performance.now();
            clearTimeout(settle);
            const interval = state.mode === 'play' ? 350 : 32;
            if (!force && now - lastApplied < interval) {
                clearTimeout(trailing);
                trailing = setTimeout(() => void update(true), interval - (now - lastApplied));
                return;
            }
            clearTimeout(trailing);
            lastApplied = now;
            started = true;
            apply();
            const blend = timeline(state.index), key = `${blend.snapshotA}|${blend.snapshotB}`, token = ++request;
            const jump = state.mode === 'jump', reduced = engine.environment.reducedMotion;
            if (jump && state.flight && !reduced && Math.abs(state.index - previousIndex) > 300)
                engine.timeFlight.start(engine.camera);
            else if (state.mode === 'drag' || !state.flight)
                engine.timeFlight.cancel(engine.camera);
            previousIndex = state.index;
            try {
                if (current !== key) {
                    current = key;
                    if (state.mode !== 'drag')
                        preparing = engine.morph.play(blend.snapshotA, blend.snapshotB, 1100, blend.t);
                    else
                        preparing = engine.morph.prepare(blend.snapshotA, blend.snapshotB, true);
                }
                await preparing;
                if (request !== token)
                    return;
                if (state.mode === 'drag' || !state.playing && !jump) {
                    const phase = phases.slice().reverse().find(p => yearToIndex(p.from) <= state.index);
                    const span = phase ? Math.max(1, yearToIndex(phase.to) - yearToIndex(phase.from)) : 1;
                    engine.morph.setProgress(blend.t, 'drag', Math.abs(state.velocity) > 300 ? 301 : state.velocity / span);
                }
                else
                    engine.morph.animateTo(blend.t, 1100);
                if (state.mode === 'drag') {
                    const next = timeline(state.index + (state.velocity < 0 ? -30 : 30));
                    engine.morph.prefetchGeometry(next.snapshotA, next.snapshotB);
                    settle = setTimeout(() => {
                        if (token !== request || timeStore.getState().scrubbing || Math.abs(timeStore.getState().velocity)>0 || !engine.morph.stats().preview) return;
                        preparing = engine.morph.prepare(blend.snapshotA, blend.snapshotB);
                        void preparing.then(() => {
                            const latest = timeline(timeStore.getState().index);
                            if (current === key && latest.snapshotA === blend.snapshotA && latest.snapshotB === blend.snapshotB)
                                engine.morph.setProgress(latest.t, 'seek');
                        }).catch(() => {});
                    }, 250);
                }
            }
            catch { /* Loading errors are exposed in engine statistics. */ }
        };
        const ready = terrainBridge.subscribe(() => { if (!started)
            void update(true); });
        const off = timeStore.subscribe((s, old) => { if (s.index !== old.index || s.playing !== old.playing || s.velocity !== old.velocity || s.scrubbing !== old.scrubbing)
            void update(s.mode === 'jump' || !s.scrubbing && old.scrubbing || !s.playing && old.playing || s.velocity === 0 && old.velocity !== 0); if (!s.flight)
            terrainBridge.engine?.timeFlight.cancel(terrainBridge.engine.camera); });
        const shell = useShell.subscribe(apply), settings = useMorphSettings.subscribe(apply);
        void update(true);
        return () => { request++; clearTimeout(trailing); clearTimeout(settle); off(); shell(); settings(); ready(); };
    }, [phases]);
    return null;
}
