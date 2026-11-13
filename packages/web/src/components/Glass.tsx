import { useEffect, useRef, useState } from 'react';
import type { HTMLAttributes, PointerEvent, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { HTMLMotionProps } from 'motion/react';
import { useShell } from '../state/shell';
import { GlassIcon } from './GlassIcon';
import type { IconName } from './GlassIcon';
export function useReducedEffects() { const [system,setSystem]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches); useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)');const changed=()=>setSystem(q.matches);q.addEventListener('change',changed);return()=>q.removeEventListener('change',changed);},[]);return useShell(s=>s.reducedMotion)||system; }
function light(event: PointerEvent<HTMLElement>) {
  const r = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--mx', `${100 * (event.clientX - r.left) / r.width}%`);
  event.currentTarget.style.setProperty('--my', `${100 * (event.clientY - r.top) / r.height}%`);
}
export function GlassPanel({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`glass glass-panel ${className}`} onPointerMove={light}>{children}</div>;
}
export function GlassButton({ icon, label, className = '', children, ...props }: Omit<HTMLMotionProps<'button'>, 'children'> & { icon?: IconName; label?: string; children?: ReactNode }) {
  const reduced = useReducedEffects();
  const pressMotion = useShell(s => s.pressMotion);
  return <motion.button type="button" {...props} aria-label={label ?? props['aria-label']} title={label} className={`glass glass-button ${icon && !children ? 'icon-button' : ''} ${className}`} onPointerMove={light} whileTap={reduced || !pressMotion ? {} : { scale: .96 }} transition={{ type: 'spring', stiffness: 440, damping: 28, mass: .65 }}>
    {icon && <GlassIcon name={icon}/>} {children}
  </motion.button>;
}
export function GlassChip({ children, className = '' }: { children: ReactNode; className?: string }) { return <span className={`glass glass-chip ${className}`}>{children}</span>; }
export function SegmentedControl<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void }) {
  return <div className="segmented" role="tablist" aria-label={label}>{options.map((option, index) => <button type="button" role="tab" aria-selected={value === option.value} tabIndex={value === option.value ? 0 : -1} key={option.value} onClick={() => onChange(option.value)} onKeyDown={event => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + step + options.length) % options.length;
    if (step || event.key === 'Home' || event.key === 'End') { event.preventDefault(); onChange(options[next]!.value); (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus(); }
  }}>{option.label}</button>)}</div>;
}
export function Popover({ label, icon, children, className = '' }: { label: string; icon: IconName; children: ReactNode; className?: string }) {
  const reduced = useReducedEffects();
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: globalThis.PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); } };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    (ref.current?.querySelector<HTMLElement>('[role="dialog"] [aria-selected="true"]') ?? ref.current?.querySelector<HTMLElement>('[role="dialog"] input, [role="dialog"] button'))?.focus();
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className={`popover-anchor ${className}`} ref={ref}><GlassButton icon={icon} label={label} data-popover-trigger={icon} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}/><AnimatePresence>{open && <motion.div className="popover-wrap" initial={reduced ? false : { opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .16 }}><GlassPanel role="dialog" aria-label={label} className="popover"><h3>{label}</h3>{children}</GlassPanel></motion.div>}</AnimatePresence></div>;
}
