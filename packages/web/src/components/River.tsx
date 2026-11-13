import { useEffect, useRef } from 'react';
import { createSnapshotTimeline, indexToYear, riverLanes, yearToIndex } from '@witlu/core/time';
import { useChronicle } from '../store/chronicle';
import { resetTimeView, seekIndex, seekYear, setTimeView, stepYear, timeStore, toggleTime } from '../store/time';
import { useShell } from '../state/shell';
export function River({ compact = false }: {
    compact?: boolean;
}) {
    const legend = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null), stamp = useRef<HTMLSpanElement>(null), ticks = useRef<HTMLDivElement>(null);
    const { data, error } = useChronicle();
    useEffect(() => {
        const element = canvas.current;
        if (!element || !data)
            return;
        const ctx = element.getContext('2d');
        if (!ctx)
            return;
        const timeline = createSnapshotTimeline(data.phases.map(p => ({ year: p.from, snapshot: p.snapshot })));
        const lanes = new Map(data.phases.map(p => [p.snapshot, riverLanes(data.polities, p.snapshot)]));
        const colors = new Map(data.colors.map(s => [s.snapshot, new Map(s.colors.map(c => [c.polityId, c]))]));
        const token = getComputedStyle(element), textTone = token.getPropertyValue('--text').trim(), mainTone = token.getPropertyValue('--polity-main').trim();
        let flowOffset = 0, width = 1, height = 1, frame = 0, last = 0, background: HTMLCanvasElement | undefined;
        let legendKey = '';
        let viewport = '', spots: {
            x: number;
            y: number;
            year: number;
            title: string;
        }[] = [];
        const points = new Map<number, number>();
        let previousX = 0, previousTime = 0, velocity = 0, inertial = false, moved = false, pinchDistance = 0;
        let pinchView: [
            number,
            number
        ] = [0, 1], originX = 0;
        const reduced = () => useShell.getState().reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
        function at(index: number) {
            const b = timeline(index);
            const phase = data!.phases.slice().reverse().find(p => yearToIndex(p.from) <= index);
            const nextPhase = phase && data!.phases[data!.phases.indexOf(phase) + 1];
            const span = phase && nextPhase ? yearToIndex(nextPhase.from) - yearToIndex(phase.from) : 1;
            const blendWindow = Math.min(6, span * .2) / span;
            const u = Math.max(0, (b.t - 1 + blendWindow) / blendWindow);
            b.t = u * u * (3 - 2 * u);
            const a = lanes.get(b.snapshotA) ?? [], next = lanes.get(b.snapshotB) ?? [];
            const keys = new Set([...a, ...next].map(r => r.key));
            return [...keys].map(key => {
                const p = a.find(r => r.key === key), q = next.find(r => r.key === key);
                const center = (p?.center ?? .5) * (1 - b.t) + (q?.center ?? .5) * b.t;
                const size = (p?.width ?? 0) * (1 - b.t) + (q?.width ?? 0) * b.t;
                const style = colors.get(b.t < .5 ? b.snapshotA : b.snapshotB)?.get(key) ?? colors.get(b.snapshotA)?.get(key) ?? colors.get(b.snapshotB)?.get(key);
                return { key, title: p?.title ?? q?.title ?? key, y: 10 + center * (height - 20), w: size * (height - 20) * .78, color: style?.color ?? mainTone, outline: style?.strokeOnly ?? false };
            });
        }
        const resize = () => { const r = element.getBoundingClientRect(); width = r.width; height = r.height; const dpr = Math.min(devicePixelRatio, 2); element.width = Math.round(width * dpr); element.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); viewport = ''; };
        const observer = new ResizeObserver(resize);
        observer.observe(element);
        resize();
        function rebuild() {
            const [a, b] = timeStore.getState().view;
            background = document.createElement('canvas');
            background.width = element!.width;
            background.height = element!.height;
            const c = background.getContext('2d')!;
            c.scale(background.width / width, background.height / height);
            const samples = Array.from({ length: Math.ceil(width / 3) + 1 }, (_, i) => ({ x: Math.min(width, i * 3), rows: at(a + Math.min(width, i * 3) / width * (b - a)) }));
            const keys = new Set(samples.flatMap(s => s.rows.map(r => r.key)));
            for (const key of keys) {
                // Draw each ribbon as one polygon: adjacent translucent quads create visible seams.
                const path = samples.map(s => ({ x: s.x, row: s.rows.find(r => r.key === key) }));
                const representative = path.find(p => (p.row?.w ?? 0) > 0)?.row;
                if (!representative)
                    continue;
                const gradient = c.createLinearGradient(0, 0, width, 0);
                for (const point of path)
                    gradient.addColorStop(Math.max(0, Math.min(1, point.x / width)), point.row?.color ?? representative.color);
                c.fillStyle = gradient;
                c.strokeStyle = gradient;
                c.globalAlpha = .65;
                c.beginPath();
                path.forEach((p, i) => { const y = (p.row?.y ?? height / 2) - (p.row?.w ?? 0) / 2; if (i === 0)
                    c.moveTo(p.x, y);
                else
                    c.lineTo(p.x, y); });
                [...path].reverse().forEach(p => c.lineTo(p.x, (p.row?.y ?? height / 2) + (p.row?.w ?? 0) / 2));
                c.closePath();
                if (representative.outline)
                    c.stroke();
                else
                    c.fill();
            }
            c.globalAlpha = .9;
            c.fillStyle = textTone;
            spots = data!.events.filter(e => yearToIndex(e.year) >= a && yearToIndex(e.year) <= b).map(e => {
                const index = yearToIndex(e.year), row = at(index).find(r => r.key === e.regime);
                return { x: (index - a) / (b - a) * width, y: row?.y ?? height / 2, year: e.year, title: e.title };
            });
            for (const s of spots) {
                c.beginPath();
                c.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
                c.fill();
            }
            if (ticks.current)
                ticks.current.replaceChildren(...Array.from({ length: compact ? 3 : 5 }, (_, i) => { const span = document.createElement('span'); const y = indexToYear(Math.round(a + (b - a) * i / (compact ? 2 : 4))); span.textContent = y < 0 ? `前${-y}` : String(y); return span; }));
        }
        function draw(now: number) {
            frame = requestAnimationFrame(draw);
            const s = timeStore.getState(), quality = useShell.getState().quality;
            if (now - last < (quality === 'eco' ? 50 : 16))
                return;
            const dt = Math.min(50, now - last);
            last = now;
            flowOffset += dt / 1000 * (8 + Math.sign(s.velocity) * Math.min(50, Math.abs(s.velocity)));
            if (inertial) {
                velocity *= Math.exp(-dt / 180);
                seekIndex(s.index + velocity * dt / 1000, 'drag', velocity);
                if (Math.abs(velocity) < .5 || reduced()) {
                    inertial = false;
                    snap();
                }
            }
            const snapKey = timeline(s.index).snapshotA;
            if (legend.current && legendKey !== snapKey) {
                legendKey = snapKey;
                const rows = lanes.get(snapKey) ?? [];
                legend.current.replaceChildren(...rows.map(r => { const label = document.createElement('span'); label.textContent = r.title; label.title = Math.round(r.area).toLocaleString() + ' km²'; label.style.borderColor = colors.get(snapKey)?.get(r.key)?.color ?? mainTone; return label; }));
                element!.dataset.branches = String(rows.length);
            }
            const [a, b] = s.view;
            if (s.playing && (s.index > b - (b - a) * .08 || s.index < a))
                setTimeView(s.index - (b - a) * .3, s.index + (b - a) * .7);
            const key = `${a}:${b}`;
            if (viewport !== key) {
                viewport = key;
                rebuild();
            }
            ctx!.clearRect(0, 0, width, height);
            if (background)
                ctx!.drawImage(background, 0, 0, width, height);
            if (s.flow && !reduced() && !document.hidden) {
                const count = quality === 'eco' ? 6 : quality === 'ultra' ? 24 : 12;
                for (let i = 0; i < count; i++) {
                    const x = (((flowOffset + i * width / count) % width + width) % width);
                    const rows = at(a + x / width * (b - a)).filter(r => r.w > 1);
                    if (!rows.length)
                        continue;
                    const row = rows[i % rows.length]!;
                    ctx!.globalAlpha = .5;
                    ctx!.fillStyle = textTone;
                    ctx!.beginPath();
                    ctx!.ellipse(x, row.y, 2.5, 1, 0, 0, Math.PI * 2);
                    ctx!.fill();
                }
            }
            ctx!.globalAlpha = 1;
            if (stamp.current) {
                stamp.current.style.left = `${Math.max(0, Math.min(100, (s.index - a) / (b - a) * 100))}%`;
                stamp.current.hidden = s.index < a || s.index > b;
            }
            element!.setAttribute('aria-valuenow', String(indexToYear(Math.floor(s.index))));
        }
        function snap() {
            const s = timeStore.getState(), limit = (s.view[1] - s.view[0]) / width * 12;
            const target = spots.reduce<{
                distance: number;
                year: number;
            } | undefined>((near, p) => { const distance = Math.abs(yearToIndex(p.year) - s.index); return distance < (near?.distance ?? limit) ? { distance, year: p.year } : near; }, undefined);
            seekIndex(target ? yearToIndex(target.year) : s.index, 'drag', 0);
        }
        const position = (x: number) => { const s = timeStore.getState(); return s.view[0] + (x - element!.getBoundingClientRect().left) / width * (s.view[1] - s.view[0]); };
        let gestureIndex = timeStore.getState().index;
        const down = (e: PointerEvent) => {
            if (points.size === 0) gestureIndex = timeStore.getState().index;
            element.setPointerCapture(e.pointerId);
            points.set(e.pointerId, e.clientX);
            inertial = false;
            velocity = 0;
            moved = false;
            previousX = originX = e.clientX;
            previousTime = performance.now();
            if (points.size === 2) {
                seekIndex(gestureIndex, 'drag');
                const p = [...points.values()];
                pinchDistance = Math.abs(p[0]! - p[1]!);
                pinchView = [...timeStore.getState().view];
            }
            else
                seekIndex(position(e.clientX), 'drag');
        };
        const move = (e: PointerEvent) => {
            if (!points.has(e.pointerId))
                return;
            points.set(e.pointerId, e.clientX);
            moved ||= Math.abs(e.clientX - originX) > 4;
            if (points.size >= 2) {
                const p = [...points.values()], ratio = pinchDistance / Math.max(10, Math.abs(p[0]! - p[1]!)), center = (pinchView[0] + pinchView[1]) / 2, half = (pinchView[1] - pinchView[0]) * ratio / 2;
                setTimeView(center - half, center + half);
                moved = true;
                return;
            }
            const now = performance.now(), s = timeStore.getState();
            velocity = (e.clientX - previousX) / Math.max(8, now - previousTime) * 1000 / width * (s.view[1] - s.view[0]);
            seekIndex(position(e.clientX), 'drag', velocity);
            previousX = e.clientX;
            previousTime = now;
        };
        const up = (e: PointerEvent) => {
            if (!points.has(e.pointerId)) return;
            const wasPinch = points.size > 1;
            points.delete(e.pointerId);
            if (wasPinch) {
                points.clear();
                velocity = 0;
                return;
            }
            if (e.type === 'pointercancel') {
                velocity = 0;
                return;
            }
            if (!moved) {
                const x = e.clientX - element.getBoundingClientRect().left, y = e.clientY - element.getBoundingClientRect().top;
                const event = spots.filter(p => Math.abs(p.x - x) < 22 && Math.abs(p.y - y) < 22).sort((p, q) => Math.hypot(p.x - x, p.y - y) - Math.hypot(q.x - x, q.y - y))[0];
                if (event) {
                    seekYear(event.year);
                    element.title = event.title;
                    return;
                }
            }
            if (performance.now() - previousTime > 100)
                velocity = 0;
            inertial = moved && Math.abs(velocity) > 5 && !reduced();
            if (!inertial)
                snap();
        };
        element.addEventListener('pointerdown', down);
        element.addEventListener('pointermove', move);
        element.addEventListener('pointerup', up);
        element.addEventListener('pointercancel', up);
        frame = requestAnimationFrame(draw);
        return () => { cancelAnimationFrame(frame); observer.disconnect(); element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', move); element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', up); };
    }, [data, compact]);
    return <div className={`river-control ${compact ? 'compact' : ''}`}>
    <div className="river-canvas-wrap"><canvas ref={canvas} className="history-river" role="slider" tabIndex={0} aria-label="历史长河 · 左右键逐年，Shift 十年，双击复原" aria-valuemin={-403} aria-valuemax={2027} aria-valuenow={230} onDoubleClick={resetTimeView} onKeyDown={e => { if (e.code === 'Space') {
        e.preventDefault();
        toggleTime();
    } if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        stepYear((e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 10 : 1));
    } if (e.key === 'Home') {
        e.preventDefault();
        seekYear(-403);
    } if (e.key === 'End') {
        e.preventDefault();
        seekYear(2027);
    } }}/><span ref={stamp} className="river-seal" aria-hidden="true">今</span></div>
    <div className="river-years" ref={ticks}/><div className="river-legend" ref={legend} aria-label="当前支流"/><div className="river-zoom"><button aria-label="缩小时间范围" onClick={() => { const [a, b] = timeStore.getState().view; setTimeView((a + b) / 2 - (b - a) / 4, (a + b) / 2 + (b - a) / 4); }}>＋</button><button onClick={resetTimeView}>复原</button><button aria-label="扩大时间范围" onClick={() => { const [a, b] = timeStore.getState().view; setTimeView(a - (b - a) / 2, b + (b - a) / 2); }}>−</button></div>{error && <p role="alert">{error}</p>}
  </div>;
}
