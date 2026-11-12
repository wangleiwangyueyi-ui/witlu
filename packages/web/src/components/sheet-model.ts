export type SheetSnap = 'collapsed' | 'half' | 'expanded';
export function sheetOffsets(height: number) {
  // Leave the brand + toolbar and a touch gap above the fully expanded handle.
  const max = Math.max(240, height - 144);
  return { height: max, offsets: [max - 158, Math.max(0, max - height * .48), 0] as const };
}
export function closestSheetSnap(y: number, velocity: number, offsets: readonly number[]): number {
  const projected = y + Math.max(-1800, Math.min(1800, velocity)) * .18;
  return offsets.reduce((best, offset, index) => Math.abs(offset - projected) < Math.abs(offsets[best]! - projected) ? index : best, 0);
}
