import { create } from 'zustand';
import { activeTracks, buildTour, yearToIndex } from '@witlu/core/time';
import type { TourStop } from '@witlu/core/time';
import type { Chronicle } from './chronicle';
import { seekYear, timeStore } from './time';
import { frameSites } from '../state/camera-story';
import { useChapterSettings } from '../state/chapters';
interface TourState { running: boolean; active: boolean; index: number; stops: TourStop[]; start(data: Chronicle, chapter?: string): void; pause(): void; resume(): void; stop(): void; skip(direction: number): void; advance(): void }
let tourData: Chronicle | undefined;
function show(stop: TourStop | undefined) {
  if (!stop) return;
  seekYear(stop.year); if (stop.kind === 'chapter') useChapterSettings.getState().replayOpening();
  if (stop.coord) frameSites([stop.coord]);
  else if(tourData){const p=tourData.phases.slice().reverse().find(p=>p.from<=stop.year);if(p)frameSites(activeTracks(stop.year,p,tourData.registry,tourData.eras,tourData.events).flatMap(r=>r.occurrence.capitals.map(c=>c.coord)));}
}
export const useTour = create<TourState>((set, get) => ({ running: false, active: false, index: 0, stops: [],
  start(data, chapter) { tourData=data; const stops = buildTour(data.dynasties, data.phases, data.events), index = Math.max(0, stops.findIndex(s => s.chapter === chapter)); set({ stops, index, active: true, running: true }); show(stops[index]); },
  pause() { set({ running: false }); }, resume() { if (get().active) set({ running: true }); }, stop() { set({ running: false, active: false }); },
  skip(direction) { const s = get(), chapters = s.stops.flatMap((stop, i) => stop.kind === 'chapter' ? [i] : []); const current = chapters.filter(i => i <= s.index).length - 1; const index = chapters[Math.max(0, Math.min(chapters.length - 1, current + direction))] ?? 0; set({ index }); show(s.stops[index]); },
  advance() { const s = get(); if (!s.running) return; const index = s.index + 1; if (index >= s.stops.length) { set({ running: false }); return; } set({ index }); show(s.stops[index]); }
}));
// Manual time input always pauses the narration; guide seeks run with the matching stop.
timeStore.subscribe((s, previous) => { const tour = useTour.getState(); if (!tour.running) return; const stop = tour.stops[tour.index]; if (s.mode === 'drag' && s.index !== previous.index || s.playing || s.mode === 'jump' && stop && s.index !== yearToIndex(stop.year)) tour.pause(); });
