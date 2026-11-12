import { useEffect, useRef, useState } from 'react';
import { GlassButton, GlassPanel, SegmentedControl } from './Glass';
import { useI18n } from '../i18n';
import { useShell } from '../state/shell';
import type { Quality } from '../state/shell';
import { useToast } from './Toast';
export function DebugConsole({ snapshot }: { snapshot: string }) {
  const { t } = useI18n(); const quality = useShell(s => s.quality), year = useShell(s => s.year), setQuality = useShell(s => s.setQuality);
  const fps = useRef<HTMLOutputElement>(null); const [capturing, setCapturing] = useState(false); const toast = useToast();
  useEffect(() => {
    let frame = 0, count = 0, start = performance.now();
    const tick = (now: number) => { count++; if (now - start >= 500) { if (fps.current) fps.current.textContent = (count * 1000 / (now - start)).toFixed(1); count = 0; start = now; } frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, []);
  const capture = async () => {
    setCapturing(true);
    try {
      await document.fonts.ready;
      const { toBlob } = await import('html-to-image'); const node = document.querySelector<HTMLElement>('[data-capture-root]')!;
      const blob = await toBlob(node, { pixelRatio: Math.min(devicePixelRatio, 2), filter: element => !(element instanceof HTMLElement && element.hasAttribute('data-capture-ignore')), backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--sky').trim() });
      if (!blob) throw new Error('Empty capture');
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.download = `witlu-${year}.png`; link.href = url; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000); toast(t('screenshotDone'));
    } catch { toast(t('screenshotError')); } finally { setCapturing(false); }
  };
  return <GlassPanel role="complementary" aria-label={t('debug')} className="debug-console" data-capture-ignore="true"><div className="debug-title"><span className="debug-light"/><h2>{t('debug')}</h2><span>P1</span></div><dl><div><dt>{t('fps')}</dt><dd><output ref={fps} data-testid="fps">—</output> fps</dd></div><div><dt>{t('year')}</dt><dd>{year}</dd></div><div><dt>{t('snapshot')}</dt><dd data-testid="snapshot">{snapshot}</dd></div></dl><SegmentedControl label={t('quality')} value={quality} onChange={setQuality} options={(['ultra', 'high', 'eco'] as Quality[]).map(value => ({ value, label: t(value) }))}/>{(['effects', 'moods', 'transitions', 'openings'] as const).map(key => <details key={key}><summary>{t(key)}</summary><p>{t('empty')}</p></details>)}<GlassButton icon="camera" disabled={capturing} onClick={() => void capture()}>{t('screenshot')}</GlassButton></GlassPanel>;
}
