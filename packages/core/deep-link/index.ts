import {parseHistoricalYear} from '../time/index';
import type {Eras} from '../time/index';
export type Query = Record<string, string | undefined>;
export const upstreamParameters = ['year','place','lng','lat','zoom','center','trace','person','event','journey','stop','polity','hover','lang','q','terrain','layers','mob_chron','mob_leg','quiz','embed','from','to','lock','autoplay'] as const;
export function localeFromQuery(value: string | undefined): 'en' | 'zh-Hant' | 'zh-Hans' | undefined {
  if (!value) return undefined;
  if (value.toLowerCase() === 'en') return 'en';
  return /^(zh-tw|zh_tw|tw|hk|zh-hk|zh-hant|hant)$/i.test(value) ? 'zh-Hant' : 'zh-Hans';
}
function coordinate(value: string | undefined): [number, number] | undefined {
  const parts = value?.split(',');
  if (parts?.length !== 2 || parts.some(p => !p.trim())) return;
  const [x,y] = parts.map(Number);
  if (Number.isFinite(x) && Number.isFinite(y) && Math.abs(x!) <= 180 && Math.abs(y!) <= 85) return [x!,y!];
}
export function parseDeepLink(q: Query, eras?: Eras) {
  const years = (q.year ?? '').split(/[,，、;；\s]+/).flatMap(s => {
    const n = Number(s);
    if (s.trim() && Number.isFinite(n)) return [Math.max(-403,Math.min(2027,Math.round(n) || 1))];
    return eras ? parseHistoricalYear(s,eras).map(y => y.year).filter(y => y >= -403 && y <= 2027) : [];
  });
  const routes = (q.place ?? '').split(/[;；]/).map(track => track.split(/[,，、→]|->/).map(n => n.trim()).filter(Boolean)).filter(r => r.length);
  let globalIndex=0;
  const tracks = routes.map((route,track) => route.map(token => {
    const before=token.match(/^(-?\d{1,4})\s*[:：]\s*(.+)$/),after=token.match(/^(.+?)\s*[:：]\s*(-?\d{1,4})$/);
    const explicit=before?Number(before[1]):after?Number(after[2]):undefined;
    const year=explicit===undefined?(years.length===routes.length&&routes.length>1?years[track]:years[Math.min(globalIndex,years.length-1)]):Math.max(-403,Math.min(2027,explicit||1));globalIndex++;
    return {place:before?.[2]?.trim()??after?.[1]?.trim()??token,year};
  }));
  const zoom = q.zoom && Number.isFinite(Number(q.zoom)) ? Math.max(1,Math.min(8,Number(q.zoom))) : undefined;
  return {years,tracks,zoom,locale:localeFromQuery(q.lang),center:coordinate(q.center),trace:coordinate(q.trace),point:coordinate(q.lng && q.lat ? q.lng+','+q.lat : undefined),
    person:q.person ?? q.event ?? q.journey, stop: q.stop && Number.isFinite(Number(q.stop)) ? Math.max(-1,Math.floor(Number(q.stop))) : undefined,
    embed:q.embed === '1',locked:q.lock === '1',autoplay:q.autoplay === '1',quiz:q.quiz !== undefined,
    polity:q.polity,hover:q.hover,search:q.q,layers:q.layers !== undefined,chronicle:q.mob_chron !== undefined,legend:q.mob_leg !== undefined,
    // The legacy switch is accepted; this atlas deliberately keeps its 3D camera.
    terrain:q.terrain !== '0' && q.terrain !== 'false'};
}
