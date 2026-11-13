import { useChronicleText } from '../i18n/chronicle';
import { useChronicle } from '../store/chronicle';
import { useShell } from '../state/shell';
import { historicalText } from '../i18n/history';
import { TimeDock, TimeEffectControls } from '../components/TimeDock';
import { TimeDriver } from '../components/TimeDriver';
import { ChapterContent } from '../components/Chapter';
import { yearToIndex } from '@witlu/core/time';
import { seekYear, setTimeView } from '../store/time';
export default function TimelineLab() {
    const t=useChronicleText(),{data}=useChronicle(),locale=useShell(s=>s.locale);
    return <main className="timeline-lab"><TimeDriver /><h1>{t('timelineLab')}</h1><a href="/lab/time-flight">{t('flightLab')} →</a><p>{t('labHelp')}</p><div className="lab-presets">{([['三国', 200, 290, 230], ['南北朝', 420, 610, 500], ['五代十国', 890, 990, 930], ['宋辽金夏', 960, 1280, 1127]] as const).map(([title, a, b, year]) => <button key={title} onClick={() => { seekYear(year); setTimeView(yearToIndex(a), yearToIndex(b)); }}>{locale==='en'?({三国:'Three Kingdoms',南北朝:'Northern and Southern Dynasties',五代十国:'Five Dynasties and Ten Kingdoms',宋辽金夏:'Song, Liao, Jin and Xia'}[title]):historicalText(title,locale,data)}</button>)}</div><TimeDock /><TimeEffectControls /><ChapterContent /></main>;
}
