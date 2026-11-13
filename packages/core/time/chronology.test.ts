import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { chineseNumber, eraAt, parseHistoricalYear, playbackDelta, riverLanes, yearToIndex } from './index';
import type { Eras, RiverPolity } from './index';
const data = (file: string) => JSON.parse(readFileSync(new URL(`../../web/public/data/${file}.json`, import.meta.url), 'utf8'));
const eras = data('eras') as Eras;
describe('historical input and chronology', () => {
    it.each([['前221', -221], ['-221', -221], ['贞观三年', 629], ['元狩二年', -121], ['公元', undefined], ['0', undefined]])('parses %s', (input, year) => {
        expect(parseHistoricalYear(input, eras)[0]?.year).toBe(year);
    });
    it('does not silently choose a repeated era', () => { expect(parseHistoricalYear('建兴三年', eras).length).toBeGreaterThan(1); });
    it('rejects years outside an era', () => { expect(parseHistoricalYear('贞观九十九年', eras)).toEqual([]); expect(parseHistoricalYear('唐贞观二十四年', eras)).toEqual([]); });
    it('counts across BCE without zero and exposes concurrent rulers', () => {
        expect(eraAt(yearToIndex(230), eras.main)?.name).toContain('太和');
        expect(eraAt(yearToIndex(230), eras.regional[0]!.spans, eras.regional[0]!.until)?.ordinal).toBe(8);
        expect(eraAt(yearToIndex(264), eras.regional[0]!.spans, eras.regional[0]!.until)).toBeUndefined();
    });
    it.each([['元', 1], ['十', 10], ['十一', 11], ['二十三', 23], ['一百零二', 102]])('Chinese number %s', (text, n) => expect(chineseNumber(text)).toBe(n));
    it('slows at dynasty boundaries and caps suspended frames', () => {
        expect(playbackDelta(.02, 1, 220, [220])).toBeCloseTo(.02);
        expect(playbackDelta(.02, 4, 230, [220])).toBeCloseTo(.32);
        expect(playbackDelta(30, 1, 230, [])).toBe(.2);
    });
});
describe('data-driven tributaries', () => {
    const polities = data('coexistence') as RiverPolity[];
    const phases = data('phases') as {
        from: number;
        snapshot: string;
    }[];
    const at = (year: number) => riverLanes(polities, [...phases].reverse().find(p => p.from <= year)!.snapshot);
    it.each([[230, ['曹魏', '蜀汉', '孙吴']], [500, ['北魏', '南齐']], [930, ['后唐', '吴（杨吴）', '吴越', '楚（马楚）', '南汉']], [1127, ['南宋', '金', '西夏']]] as const)('branches at %s', (year, expected) => {
        expect(at(year).map(r => r.title)).toEqual(expect.arrayContaining([...expected]));
    });
    it.each([280, 1279])('unifies at %s', year => expect(at(year)).toHaveLength(1));
    it('preserves exact area ratios and excludes neighboring countries', () => {
        for (const phase of phases) {
            const rows = riverLanes(polities, phase.snapshot);
            if (!rows.length)
                continue;
            expect(rows.reduce((s, r) => s + r.width, 0)).toBeCloseTo(1, 12);
            for (const row of rows)
                expect(row.width / rows[0]!.width).toBeCloseTo(row.area / rows[0]!.area, 10);
        }
    });
});
