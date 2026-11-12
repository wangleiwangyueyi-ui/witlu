export type PolityRole = 'main' | 'rival' | 'protectorate' | 'neighbor';
export type Mood = 'sorrow' | 'solemn' | 'war' | 'fire' | 'glory' | 'voyage' | 'poetic' | 'disaster' | 'none';
export type Coordinate = readonly [longitude: number, latitude: number];
export interface CapitalObservation { name: string; coord: Coordinate; periods: readonly (readonly [number, number])[]; source: string }
export interface EventAttribution { id: string; year: number; regime: string | null; lane: string; importance: 1 | 2 | 3; mood: Mood }
