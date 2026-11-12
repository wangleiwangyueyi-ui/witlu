export interface Capital {
    name: string;
    coord: [
        number,
        number
    ];
    certainty: string;
}
export interface PolityFeature {
    type: 'Feature';
    geometry: {
        type: 'Polygon' | 'MultiPolygon';
        coordinates: number[][][] | number[][][][];
    };
    properties: {
        id: string;
        polityId: string;
        title: string;
        role: string;
        anchor?: [
            number,
            number
        ];
        capitals: Capital[];
    };
}
export interface PolityGeometry {
    type: 'FeatureCollection';
    features: PolityFeature[];
}
export interface Snapshot {
    key: string;
    from: number;
    to: number;
    caption: string;
    dynastyKey: string;
}
export interface PolityColor {
    polityId: string;
    role: string;
    color: string;
    fillOpacity: number;
    pattern: string | null;
    strokeOnly: boolean;
}
export interface ColorSnapshot {
    snapshot: string;
    colors: PolityColor[];
}
export interface MorphEffects {
    fill: boolean;
    boundaries: boolean;
    growth: boolean;
    front: boolean;
    ink: boolean;
    particles: boolean;
    trails: boolean;
}
export const DEFAULT_MORPH_EFFECTS: MorphEffects = { fill: true, boundaries: true, growth: true, front: true, ink: true, particles: true, trails: true };
export const MORPH_QUALITY = { ultra: { particles: 1800, glow: true }, high: { particles: 900, glow: true }, eco: { particles: 180, glow: false } } as const;
