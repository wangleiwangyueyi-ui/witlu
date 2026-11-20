export type SheetSnap = 'collapsed' | 'half' | 'expanded';

export function sheetOffsets(height: number, safeTop = 0, safeBottom = 0) {
  // Keep the open handle below the toolbar and the collapsed dock above the home indicator.
  const max = Math.max(0,height - 60 - safeTop);
  const collapsedHeight = Math.min(max,140 + safeBottom);
  const halfHeight = Math.min(max,Math.max(height * .48,collapsedHeight));
  return { height: max, offsets: [max - collapsedHeight, max - halfHeight, 0] as const };
}

export function closestSheetSnap(y: number, velocity: number, offsets: readonly number[]): number {
  const projected = y + Math.max(-1800, Math.min(1800, velocity)) * .18;
  return offsets.reduce((best, offset, index) => Math.abs(offset - projected) < Math.abs(offsets[best]! - projected) ? index : best, 0);
}
