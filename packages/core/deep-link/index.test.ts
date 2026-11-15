import {describe,it,expect} from 'vitest';
import {parseDeepLink,localeFromQuery,upstreamParameters} from './index';
describe('upstream deep links',()=>{
 it('retains all 25 documented and restoration parameters',()=>expect(upstreamParameters).toHaveLength(25));
 it('assigns years per track before per stop',()=>{const d=parseDeepLink({year:'208,209',place:'许昌,江陵,赤壁;柴桑→樊口→赤壁'});expect(d.tracks.map(t=>t.map(s=>s.year))).toEqual([[208,208,208],[209,209,209]]);});
 it('accepts every route separator and BCE boundary',()=>{expect(parseDeepLink({year:'-1,0,1',place:'长安、洛阳->开封'}).tracks[0]?.map(s=>s.year)).toEqual([-1,1,1]);});
 it('rejects invalid coordinates and clamps finite zoom/year',()=>{const d=parseDeepLink({center:'Infinity,30',trace:'120,86',lng:'',lat:'30',zoom:'99',year:'9999,foo'});expect(d.center).toBeUndefined();expect(d.trace).toBeUndefined();expect(d.point).toBeUndefined();expect(d.zoom).toBe(8);expect(d.years).toEqual([2027]);});
 it('supports locale aliases and journey fallback',()=>{for(const lang of ['zh-tw','zh-Hant','tw','hk'])expect(localeFromQuery(lang)).toBe('zh-Hant');expect(parseDeepLink({journey:'xuanzang',stop:'-1',quiz:''}).person).toBe('xuanzang');expect(parseDeepLink({stop:'-1'}).stop).toBe(-1);});
 it('does not enable boolean flags from false strings',()=>expect(parseDeepLink({embed:'0',autoplay:'false',lock:'0'})).toMatchObject({embed:false,autoplay:false,locked:false}));
});
