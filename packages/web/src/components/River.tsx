import { useI18n } from '../i18n';
import { useShell } from '../state/shell';
export function River({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n(); const year = useShell(s => s.year), setYear = useShell(s => s.setYear);
  return <div className={`river-control ${compact ? 'compact' : ''}`}><div className="river-graphic">
    <svg viewBox="0 0 900 60" preserveAspectRatio="none" aria-hidden="true"><defs><filter id={compact ? 'river-soft-mobile' : 'river-soft'}><feGaussianBlur stdDeviation="3"/></filter></defs><g fill="none" strokeLinecap="round"><path d="M0 30H130C200 30 215 10 285 10H490C560 10 580 18 650 18H900" stroke="var(--polity-main)" strokeWidth="12" opacity=".18" filter={`url(#${compact ? 'river-soft-mobile' : 'river-soft'})`}/><path d="M0 30H130C200 30 215 10 285 10H490C560 10 580 18 650 18H900" stroke="var(--polity-main)" strokeWidth="7"/><path d="M0 30H140C210 30 220 30 285 30H900" stroke="var(--polity-jade)" strokeWidth="5"/><path d="M0 30H130C200 30 215 49 285 49H510C580 49 600 43 670 43H900" stroke="var(--polity-coral)" strokeWidth="5"/></g></svg>
    <span className="river-playhead" style={{ left: `${Math.min(100, Math.max(0, (year - 220) / 60 * 100))}%` }}/>
    <input type="range" min="220" max="280" step="1" value={year} aria-label={t('timescale')} aria-valuetext={`${year}`} onChange={e => setYear(Number(e.target.value))}/>
  </div>{!compact && <div className="river-years" aria-hidden="true">{[220, 230, 240, 250, 260, 270, 280].map(y => <span key={y}>{y}</span>)}</div>}</div>;
}
