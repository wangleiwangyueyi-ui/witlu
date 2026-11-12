import { useEffect } from 'react';
import { createSnapshotTimeline, yearToIndex } from '@witlu/core/time';
import type { Phase } from '@witlu/core/time';
import { terrainBridge } from '../state/terrain';
import { useShell } from '../state/shell';
import { useMorphSettings } from './MorphControls';
export function MorphTimeline({ phases }: {
    phases: Phase[];
}) {
    useEffect(() => {
        if (!phases.length)
            return;
        const timeline = createSnapshotTimeline(phases.map(p => ({ year: p.from, snapshot: p.snapshot })));
        let preparing: Promise<void> = Promise.resolve();
        let current = '', request = 0, started = false, previousYear = useShell.getState().year, previousTime = performance.now(), timer: ReturnType<typeof setTimeout> | undefined;
        const apply = () => { const engine = terrainBridge.engine; if (!engine)
            return; const state = useShell.getState(), s = useMorphSettings.getState(); engine.morph.enabled = state.layers.territories !== false; engine.morph.effects = { ...s.effects }; engine.morph.fillOpacity = s.opacity; };
        const yearChanged = async () => {
            const engine = terrainBridge.engine;
            if (!engine)
                return;
            started = true;
            apply();
            const state = useShell.getState(), blend = timeline(yearToIndex(state.year)), now = performance.now(), speed = (yearToIndex(state.year) - yearToIndex(previousYear)) / Math.max(.001, (now - previousTime) / 1000), key = `${blend.snapshotA}|${blend.snapshotB}`, token = ++request;
            previousYear = state.year;
            previousTime = now;
            try {
                if (current !== key) {
                    current = key;
                    preparing = engine.morph.prepare(blend.snapshotA, blend.snapshotB);
                }
                await preparing;
                if (token === request) {
                    if (state.playing)
                        engine.morph.animateTo(blend.t);
                    else
                        engine.morph.setProgress(blend.t, 'drag', speed);
                }
            }
            catch { /* Engine statistics expose loading failures in the console. */ }
        };
        const ready = terrainBridge.subscribe(() => { if (!started && terrainBridge.engine)
            void yearChanged(); });
        const off = useShell.subscribe((s, old) => { apply(); if (s.year !== old.year) {
            clearTimeout(timer);
            timer = setTimeout(() => void yearChanged(), s.playing ? 0 : 70);
        } }), settings = useMorphSettings.subscribe(apply);
        void yearChanged();
        return () => { request++; clearTimeout(timer); off(); settings(); ready(); };
    }, [phases]);
    return null;
}
