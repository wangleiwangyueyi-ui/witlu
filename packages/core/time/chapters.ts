import { eraAt, yearToIndex } from './index';
import type { Eras, Era } from './chronology';
export interface Chapter { key: string; title: string; fromYear: number; toYear: number; summary: string; seat: string; focusYear: number }
export interface ChapterPhase { from: number; to: number; snapshot: string; dynastyKey: string; overview: string }
export interface ChronicleEvent { id: string; year: number; title: string; regime: string | null; kind: string; importance: number; dynastyKey: string; coord?: [number, number]; siteCoords?: [number, number][]; mood?: string }
export interface RegistryPolity { key: string; zh?: string; en?: string; titles: string[]; from: number; to: number; seatZh?: string; seatEn?: string; rulersZh?: string; rulersEn?: string; summaryZh?: string; summaryEn?: string; occurrences: { snapshot: string; role: string; areaKm2: number; capitals: { name: string; coord: [number, number]; certainty?: string }[] }[] }
export interface ActiveTrack { polity: RegistryPolity; occurrence: RegistryPolity['occurrences'][number]; era: ReturnType<typeof eraAt>; spans: Era[]; events: ChronicleEvent[] }
export function activeTracks(year: number, phase: ChapterPhase, registry: RegistryPolity[], eras: Eras, events: ChronicleEvent[]): ActiveTrack[] {
  return registry.flatMap(polity => {
    const occurrence = polity.occurrences.find(o => o.snapshot === phase.snapshot && ['main', 'rival'].includes(o.role));
    if (!occurrence) return [];
    const region = eras.regional.find(r => (r as typeof r & { polities?: string[] }).polities?.some(t => polity.titles.includes(t)) || r.regime === polity.zh);
    const spans = region?.spans ?? (occurrence.role === 'main' ? eras.main.filter(e => e[0] >= polity.from && e[0] <= polity.to) : []);
    const era = region ? eraAt(yearToIndex(year), region.spans, region.until) : occurrence.role === 'main' ? eraAt(yearToIndex(year), eras.main) : undefined;
    const nearby = events.filter(e => e.regime === polity.key).sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year) || b.importance - a.importance);
    return [{ polity, occurrence, spans, era, events: nearby }];
  }).sort((a, b) => Number(b.occurrence.role === 'main') - Number(a.occurrence.role === 'main') || b.occurrence.areaKm2 - a.occurrence.areaKm2);
}
export interface TourStop { chapter: string; kind: 'chapter' | 'phase' | 'event'; year: number; phase?: string; event?: string; coord?: [number, number] }
export function buildTour(chapters: Chapter[], phases: ChapterPhase[], events: ChronicleEvent[]): TourStop[] {
  return chapters.flatMap(chapter => {
    const stops: TourStop[] = [{ chapter: chapter.key, kind: 'chapter', year: chapter.fromYear }];
    for (const p of phases.filter(p => p.dynastyKey === chapter.key)) {
      stops.push({ chapter: chapter.key, kind: 'phase', year: p.from, phase: p.snapshot });
      for (const e of events.filter(e => e.kind === 'milestone' && e.dynastyKey === chapter.key && e.year >= p.from && (e.year < p.to || e.year === chapter.toYear && p.to === chapter.toYear)).sort((a, b) => a.year - b.year))
        stops.push({ chapter: chapter.key, kind: 'event', year: e.year, event: e.id, ...(e.coord ? { coord: e.coord } : {}) });
    }
    return stops;
  });
}
export function sameYearSites(year: number, events: ChronicleEvent[]) {
  const sites = new Map<string, [number, number]>();
  for (const e of events.filter(e => e.year === year)) for (const coord of e.siteCoords ?? (e.coord ? [e.coord] : [])) if (coord.every(Number.isFinite)) sites.set(coord.join(','), coord);
  return [...sites.values()];
}
