import { useEffect, useState } from 'react';
import type { Eras, Phase, RiverPolity } from '@witlu/core/time';
export interface Chronicle {
    phases: (Phase & {
        dynastyKey: string;
        overview: string;
    })[];
    polities: RiverPolity[];
    eras: Eras;
    colors: {
        snapshot: string;
        colors: {
            polityId: string;
            color: string;
            strokeOnly: boolean;
        }[];
    }[];
    events: {
        id: string;
        year: number;
        title: string;
        regime: string | null;
        kind: string;
        importance: number;
    }[];
    dynasties: {
        key: string;
        title: string;
        fromYear: number;
        toYear: number;
        summary: string;
    }[];
}
let promise: Promise<Chronicle> | undefined;
export function loadChronicle() {
    return promise ??= Promise.all(['phases', 'coexistence', 'eras', 'polity-colors', 'events', 'dynasties'].map(async (name) => {
        const r = await fetch(`/data/${name}.json`);
        if (!r.ok)
            throw new Error(`时间资料加载失败：${name}`);
        return r.json();
    })).then(([phases, polities, eras, colors, events, dynasties]) => ({ phases, polities, eras, colors, events, dynasties })).catch(e => { promise = undefined; throw e; });
}
export function useChronicle() {
    const [data, set] = useState<Chronicle>();
    const [error, setError] = useState('');
    useEffect(() => { let alive = true; loadChronicle().then(d => { if (alive)
        set(d); }).catch((e: Error) => { if (alive)
        setError(e.message); }); return () => { alive = false; }; }, []);
    return { data, error };
}
