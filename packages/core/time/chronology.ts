import { addYears, indexToYear, yearToIndex } from './index';
export type Era = [
    number,
    string,
    number,
    string,
    string
];
export interface Eras {
    main: Era[];
    regional: {
        regime: string;
        until: number;
        spans: Era[];
    }[];
}
export function chineseNumber(text: string): number {
    if (/^\d+$/.test(text))
        return Number(text);
    if (text === '元')
        return 1;
    const digits = '零一二三四五六七八九';
    let sum = 0, digit = 0;
    for (const char of text) {
        if (digits.includes(char))
            digit = digits.indexOf(char);
        else if ('十百千'.includes(char)) {
            sum += (digit || 1) * ({ 十: 10, 百: 100, 千: 1000 }[char] ?? 0);
            digit = 0;
        }
        else
            return NaN;
    }
    return sum + digit;
}
/** Return all valid matches: repeated era names require a user's choice. */
export function parseHistoricalYear(input: string, eras: Eras): {
    year: number;
    label: string;
}[] {
    const text = input.trim().replace(/\s/g, '').replace(/年$/, '');
    if (/^(?:前\d+|-?\d+)$/.test(text)) {
        const year = Number(text.replace('前', '-'));
        return Number.isSafeInteger(year) && year !== 0 ? [{ year, label: input }] : [];
    }
    const match = /^(.*?)(元|[零一二三四五六七八九十百千\d]+)$/.exec(text);
    if (!match)
        return [];
    const n = chineseNumber(match[2]!);
    if (!(n >= 1))
        return [];
    const result = new Map<string, {
        year: number;
        label: string;
    }>();
    for (const track of [{ spans: eras.main, until: 2027 }, ...eras.regional]) {
        track.spans.forEach((era, i) => {
            if (!era[1].endsWith(match[1]!))
                return;
            const year = addYears(era[0], n - era[2]);
            const next = track.spans[i + 1];
            if (year < era[0] || year > track.until || (next && year > (next[0] === era[0] ? next[0] : addYears(next[0], -1))))
                return;
            result.set(`${year}:${era[1]}`, { year, label: `${era[1]}${n}年 · ${year < 0 ? '前' + -year : year}` });
        });
    }
    return [...result.values()];
}
export function eraAt(index: number, spans: Era[], until = 2027) {
    const year = indexToYear(Math.floor(index));
    if (year > until)
        return undefined;
    const era = [...spans].reverse().find(e => e[0] <= year);
    return era && { name: era[1], ruler: era[3], rulerEn: era[4], ordinal: yearToIndex(year) - yearToIndex(era[0]) + era[2] };
}
export function playbackDelta(seconds: number, speed: number, index: number, boundaries: number[]) {
    // Slow across both sides of a chapter boundary; cap time after background suspension.
    const proximity = boundaries.reduce((d, b) => Math.min(d, Math.abs(b - index)), Infinity);
    return Math.min(.05, Math.max(0, seconds)) * speed * 4 * (.25 + .75 * Math.min(1, proximity / 4));
}
export interface RiverPolity {
    key: string;
    title: string;
    stages: {
        snapshot: string;
        from: number;
        to: number;
        areaKm2: number;
        role: string;
    }[];
}
export interface RiverLane {
    key: string;
    title: string;
    area: number;
    center: number;
    width: number;
}
/** Positions and widths are normalized. Neighbors/protectorates are not independent tributaries. */
export function riverLanes(polities: RiverPolity[], snapshot: string): RiverLane[] {
    const rows = polities.flatMap(p => { const s = p.stages.find(s => s.snapshot === snapshot); return s && ['main', 'rival'].includes(s.role) && s.areaKm2 > 0 ? [{ key: p.key, title: p.title, area: s.areaKm2 }] : []; });
    const sum = rows.reduce((s, r) => s + r.area, 0);
    let offset = 0;
    return rows.map(r => { const width = r.area / sum; const center = offset + width / 2; offset += width; return { ...r, center, width }; });
}
