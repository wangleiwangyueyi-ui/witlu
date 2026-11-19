import { useEffect } from 'react';
import { yearToIndex } from '@witlu/core/time';
import { useChronicle } from '../store/chronicle';
import { startTimeClock } from '../store/time';
export function TimeDriver() {
    const { data } = useChronicle();
    useEffect(() => { if (data)
        return startTimeClock(data.dynasties.map(d => yearToIndex(d.fromYear)), data.events.filter(e=>e.kind!=='journey').map(e=>yearToIndex(e.year))); }, [data]);
    return null;
}
