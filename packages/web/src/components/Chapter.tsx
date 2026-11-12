import { GlassChip, GlassPanel, SegmentedControl } from './Glass';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n/messages';
import { useShell } from '../state/shell';
import type { Regime } from '../state/shell';
import { Credits } from './Credits';
import { River } from './River';
const regimes: { key: Regime; ruler: MessageKey; capital: MessageKey; era: MessageKey; event: MessageKey; initial: string }[] = [
  { key: 'wei', ruler: 'caorui', capital: 'luoyang', era: 'weiEra', event: 'weiEvent', initial: '壹' },
  { key: 'shu', ruler: 'liushan', capital: 'chengdu', era: 'shuEra', event: 'shuEvent', initial: '貳' },
  { key: 'wu', ruler: 'sunquan', capital: 'jianye', era: 'wuEra', event: 'wuEvent', initial: '叁' }
];
export function ChapterHeading({ mobile = false }: { mobile?: boolean }) { const { t } = useI18n(); const year = useShell(s => s.year); return <div className={`chapter-heading ${mobile ? 'mobile-heading' : ''}`}><p className="eyebrow">{t('chapter')}</p><div className="chapter-title">{mobile && <span className="sheet-year">{year}</span>}<h1>{t('chapterName')}</h1><span className="chapter-stamp" aria-hidden="true">江山</span></div>{!mobile && <p className="chapter-range">{t('chapterRange')}</p>}</div>; }
export function ChapterContent({ mobile = false }: { mobile?: boolean }) {
  const { t } = useI18n(); const regime = useShell(s => s.regime), select = useShell(s => s.setRegime);
  return <div className="chapter-content">
    {mobile && <><SegmentedControl label={t('world')} value={regime} onChange={select} options={regimes.map(r => ({ value: r.key, label: t(r.key) }))}/><River compact/></>}
    <section className="chapter-intro"><h2>{t('intro')}</h2><p>{t('description')}</p></section>
    <section className="world-section"><div className="section-heading"><h2>{t('world')}</h2><span>230 {t('ce')}</span></div><div className="regime-list">{regimes.map(r => <button type="button" className={`regime-card regime-${r.key}`} key={r.key} data-selected={regime === r.key} aria-pressed={regime === r.key} onClick={() => select(r.key)}><span className="polity-mark" aria-hidden="true"/><span className="regime-info"><strong>{t(r.key)}</strong><span>{t(r.ruler)} · {t(r.era)}</span></span><span className="regime-capital"><small>{t('capital')}</small>{t(r.capital)}</span></button>)}</div></section>
    <section className="chronicle-section"><div className="section-heading"><h2>{t('chronicle')}</h2><span>230</span></div>{regimes.filter(r => r.key === regime).map(r => <div className={`chronicle regime-${r.key}`} key={r.key}><span className="chronicle-dot"/><p>{t(r.event)}</p><GlassChip>{t(r.key)}</GlassChip></div>)}</section>
    <p className="source-note">{t('referenceHint')}</p><Credits/>
  </div>;
}
export function ChapterPanel() { return <GlassPanel className="chapter-panel"><ChapterHeading/><div className="chapter-scroll"><ChapterContent/></div></GlassPanel>; }
