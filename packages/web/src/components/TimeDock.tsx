import { GlassButton, GlassPanel } from './Glass';
import { useI18n } from '../i18n';
import { useShell } from '../state/shell';
import { addYears } from '@witlu/core/time';
import { River } from './River';
export function TimeDock() {
  const { t } = useI18n(); const year = useShell(s => s.year), playing = useShell(s => s.playing), toggle = useShell(s => s.togglePlaying), setYear = useShell(s => s.setYear);
  return <GlassPanel className="time-dock"><div className="time-year"><span>{year < 0 ? t('bce') : t('ce')}</span><label><span className="sr-only">{t('year')}</span><input type="number" min="-403" max="2027" value={year} onChange={event => { const y = Number(event.target.value); if (Number.isFinite(y)) setYear(y); }}/></label><span>{t('chapterName')}</span></div><div className="time-stream"><div className="time-stream-title"><span>{t('riverTitle')}</span><span>{t('chapterRange')}</span></div><River/></div><div className="playback"><GlassButton icon="previous" label={t('previous')} onClick={() => setYear(addYears(year, -1))}/><GlassButton icon={playing ? 'pause' : 'play'} label={playing ? t('pause') : t('play')} aria-pressed={playing} className="play-button" onClick={toggle}/><GlassButton icon="next" label={t('next')} onClick={() => setYear(addYears(year, 1))}/></div></GlassPanel>;
}
