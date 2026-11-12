import { useEffect, useRef } from 'react';
import { GlassButton, GlassPanel } from './Glass';
import { useI18n } from '../i18n';
import { useShell } from '../state/shell';
import { CHGIS_CITATION } from './Credits';
export function About() {
  const { t } = useI18n(); const close = useShell(s => s.setAbout); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false);
      if (event.key !== 'Tab') return;
      const nodes = [...(ref.current?.querySelectorAll<HTMLElement>('button,a[href]') ?? [])];
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key); return () => { document.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus(); else document.querySelector<HTMLElement>('[data-popover-trigger="more"]')?.focus(); };
  }, [close]);
  return <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) close(false); }}><div ref={ref}><GlassPanel className="about-dialog" role="dialog" aria-modal="true" aria-label={t('about')}><GlassButton className="modal-close" icon="close" label={t('close')} onClick={() => close(false)}/><img src="/brand/seal.svg" alt="" width="72" height="72"/><p className="eyebrow">WITLU · JIANGSHAN</p><h2>{t('aboutTitle')}</h2><p>{t('credit')} <a href="https://github.com/DeanChensj/jiangshan-map" target="_blank" rel="noreferrer">{t('upstream')}</a></p><p>{t('license')}</p><p>{CHGIS_CITATION}</p><p>Terrain Tiles / Mapzen · USGS SRTM &amp; GMTED2010 · NOAA ETOPO1 · Natural Earth. <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noreferrer">Terrain sources ↗</a></p><p>{t('legitimacy')}</p><p>{t('disclaimer')}</p><a href="https://github.com/wangleiwangyueyi-ui/witlu/blob/main/NOTICE.md" target="_blank" rel="noreferrer">NOTICE · GPL-3.0 ↗</a></GlassPanel></div></div>;
}
