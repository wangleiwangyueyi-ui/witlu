import { createStore } from 'zustand/vanilla';
import { indexToYear, playbackDelta, yearToIndex } from '@witlu/core/time';
import { useShell } from '../state/shell';
export type TimeMode = 'drag' | 'play' | 'jump';
interface TimeState {
    scrubbing: boolean;
    index: number;
    speed: number;
    playing: boolean;
    mode: TimeMode;
    velocity: number;
    view: [
        number,
        number
    ];
    flow: boolean;
    flight: boolean;
    haptics: boolean;
}
const rangeParams=new URLSearchParams(location.search),from=Number(rangeParams.get('from')),to=Number(rangeParams.get('to'));
const hasRange=Number.isInteger(from)&&Number.isInteger(to)&&from!==0&&to!==0&&from>=-403&&to<=2027&&to-from>=12;
const min = yearToIndex(hasRange?from:-403), max = yearToIndex(hasRange?to:2027);
const initial = yearToIndex(useShell.getState().year);
const initialWidth = Math.min(120, max - min);
const initialLeft = Math.max(min, Math.min(max - initialWidth, initial - initialWidth / 2));
export const timeStore = createStore<TimeState>(() => ({ scrubbing: false, index: initial, speed: 1, playing: false, mode: 'jump', velocity: 0, view: [initialLeft, initialLeft + initialWidth], flow: true, flight: true, haptics: true }));
export function seekIndex(index: number, mode: TimeMode = 'jump', velocity = 0) {
    if (!Number.isFinite(index))
        return;
    const target = Math.max(min, Math.min(max, index));
    const [a, b] = timeStore.getState().view;
    if (mode === 'jump' && (target < a || target > b))
        setTimeView(target - (b - a) / 2, target + (b - a) / 2);
    timeStore.setState({ index: target, mode, velocity, ...(mode === 'play' ? {} : { playing: false }) });
}
export function seekYear(year: number) { seekIndex(yearToIndex(year)); }
export function stepYear(delta: number) { seekIndex(Math.floor(timeStore.getState().index) + delta); }
export function toggleTime() { timeStore.setState(s => ({ playing: !s.playing, mode: 'play' })); }
export function setTimeView(a: number, b: number) {
    const width = Math.max(12, Math.min(max - min, b - a));
    const left = Math.max(min, Math.min(max - width, a));
    timeStore.setState({ view: [left, left + width] });
}
export function resetTimeView() { const i = timeStore.getState().index; setTimeView(i - 60, i + 60); }
/** One clock for canvas and engine. React only sees the calendar year at <= 8 Hz. */
export function startTimeClock(boundaries: number[]) {
    let frame = 0, before = performance.now(), lastPublish = 0, publishing = false;
    const publish = () => {
        publishing = true;
        const s = timeStore.getState();
        const year = indexToYear(Math.floor(s.index)), shell = useShell.getState();
        if (shell.year !== year || shell.playing !== s.playing)
            useShell.setState({ year, playing: s.playing });
        publishing = false;
    };
    const off = useShell.subscribe((s, prev) => {
        if (publishing)
            return;
        if (s.year !== prev.year)
            seekYear(s.year);
        if (s.playing !== prev.playing)
            timeStore.setState({ playing: s.playing, mode: 'play' });
    });
    const offTime = timeStore.subscribe((s, prev) => {
        if (s.mode === 'jump' && s.index !== prev.index)
            publish();
        if (s.playing !== prev.playing)
            publish();
        const boundary = boundaries.some(b => (prev.index < b && s.index >= b) || (prev.index >= b && s.index < b));
        if (boundary && s.haptics && /Android/i.test(navigator.userAgent) && !matchMedia('(prefers-reduced-motion: reduce)').matches && !useShell.getState().reducedMotion)
            navigator.vibrate?.(12);
    });
    const tick = (now: number) => {
        const s = timeStore.getState();
        if (s.playing && !document.hidden) {
            seekIndex(s.index + playbackDelta((now - before) / 1000, s.speed, s.index, boundaries), 'play');
            if (timeStore.getState().index === max)
                timeStore.setState({ playing: false });
        }
        if (now - lastPublish >= 125) {
            publish();
            lastPublish = now;
        }
        before = now;
        frame = requestAnimationFrame(tick);
    };
    const keyboard = (e: KeyboardEvent) => {
        if (e.defaultPrevented || (e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true],[role=slider],button') || e.ctrlKey || e.metaKey || e.altKey || useShell.getState().about)
            return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            stepYear((e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 10 : 1));
        }
        if (e.code === 'Space') {
            e.preventDefault();
            toggleTime();
        }
    };
    window.addEventListener('keydown', keyboard);
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); off(); offTime(); window.removeEventListener('keydown', keyboard); };
}
