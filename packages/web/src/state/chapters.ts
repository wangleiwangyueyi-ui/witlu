import { create } from 'zustand';
export const useChapterSettings = create<{
  opening: boolean; resonance: boolean; selected: string | null; replay: number;
  toggle(key: 'opening' | 'resonance'): void; select(key: string | null): void; replayOpening(): void;
}>(set => ({ opening: true, resonance: true, selected: null, replay: 0,
  toggle: key => set(s => ({ [key]: !s[key] })), select: selected => set({ selected }), replayOpening: () => set(s => ({ replay: s.replay + 1 }))
}));
