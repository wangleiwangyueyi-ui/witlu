import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { animate, motion, useDragControls, useMotionValue } from 'motion/react';
import { useI18n } from '../i18n';
import { useReducedEffects } from './Glass';
import { closestSheetSnap, sheetOffsets } from './sheet-model';
export function Sheet({ children, heading }: { children: ReactNode; heading: ReactNode }) {
  const { t } = useI18n(); const reduced = useReducedEffects();
  const [height, setHeight] = useState(() => window.visualViewport?.height ?? innerHeight);
  const [snap, setSnap] = useState(1); const y = useMotionValue(0); const drag = useDragControls();
  const dragOrigin = useRef(0);
  const { height: sheetHeight, offsets } = sheetOffsets(height);
  useEffect(() => { const resize = () => setHeight(window.visualViewport?.height ?? innerHeight); window.visualViewport?.addEventListener('resize', resize); window.addEventListener('resize', resize); return () => { window.visualViewport?.removeEventListener('resize', resize); window.removeEventListener('resize', resize); }; }, []);
  const offset = offsets[snap]!;
  useEffect(() => { if (reduced) { y.set(offset); return; } const control = animate(y, offset, { type: 'spring', stiffness: 380, damping: 38 }); return () => control.stop(); }, [offset, reduced, y]);
  return <motion.section className="glass chapter-sheet" aria-label={t('sheet')} data-snap={snap} style={{ height: sheetHeight, y }} drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: offsets[0] }} dragElastic={.04} dragMomentum={false} onDragEnd={(_event, info) => { const next = closestSheetSnap(dragOrigin.current + info.offset.y, info.velocity.y, offsets); setSnap(next); if (reduced) y.set(offsets[next]!); else animate(y, offsets[next]!, { type: 'spring', stiffness: 380, damping: 38 }); }}>
    <div className="sheet-grabber" role="slider" tabIndex={0} aria-label={t('sheetPositions')} aria-valuemin={0} aria-valuemax={2} aria-valuenow={snap} onPointerDown={event => { y.stop(); dragOrigin.current = y.get(); drag.start(event); }} onKeyDown={event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Home' || event.key === 'End') { event.preventDefault(); setSnap(event.key === 'Home' ? 0 : event.key === 'End' ? 2 : Math.min(2, Math.max(0, snap + (event.key === 'ArrowUp' ? 1 : -1)))); } }}><span/></div>
    <div className="sheet-heading">{heading}<button className="sheet-toggle" type="button" aria-label={snap === 2 ? t('collapse') : t('expand')} onClick={() => setSnap(snap === 2 ? 0 : snap + 1)}>{snap === 2 ? '⌄' : '⌃'}</button></div>
    <div className="sheet-content">{children}</div>
  </motion.section>;
}
