import { useEffect, useState } from 'react';
import type { Eras, Phase, RiverPolity, RegistryPolity, Chapter, ChronicleEvent } from '@witlu/core/time';
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
    registry: RegistryPolity[];
    translations: { en: { dynasties: Record<string, {name:string; capital:string; desc:string}>; milestones: Record<string, [string,string]>; dict: Record<string,string> }; hant: { CHAR_S2T: Record<string,string> } };
    events: ChronicleEvent[];
    dynasties: Chapter[];
}
let promise: Promise<Chronicle> | undefined;
export function loadChronicle(): Promise<Chronicle> {
    return promise ??= Promise.all(['phases', 'coexistence', 'eras', 'polity-colors', 'events', 'dynasties', 'polities', 'i18n'].map(async (name) => {
        const r = await fetch(`/data/${name}.json`);
        if (!r.ok)
            throw new Error(name);
        return r.json();
    })).then(([phases, polities, eras, colors, events, dynasties, registry, translations]) => ({ phases, polities, eras, colors, events, dynasties, registry, translations })).catch(e => { promise = undefined; throw e; });
}
export function useChronicle() {
    const [data, set] = useState<Chronicle>();
    const [error, setError] = useState('');
    useEffect(() => { let alive = true; loadChronicle().then(d => { if (alive)
        set(d); }).catch((e: Error) => { if (alive)
        setError(e.message); }); return () => { alive = false; }; }, []);
    return { data, error };
}
