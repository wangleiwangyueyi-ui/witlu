import { useChronicleText } from '../i18n/chronicle';
import { useShell } from '../state/shell';
import { historicalText } from '../i18n/history';
import { TerrainCanvas } from '../components/TerrainCanvas';
import { MorphTimeline } from '../components/MorphTimeline';
import { TimeDriver } from '../components/TimeDriver';
import { TimeControls, TimeEffectControls } from '../components/TimeDock';
import { GlassPanel } from '../components/Glass';
import { useChronicle } from '../store/chronicle';
import { seekYear } from '../store/time';
export default function TimeFlightLab() {
    const { data } = useChronicle(), t=useChronicleText(),locale=useShell(s=>s.locale);
    return <main className="time-flight-lab"><TimeDriver /><TerrainCanvas environment territories/>{data && <MorphTimeline phases={data.phases}/>}<GlassPanel className="flight-lab-controls"><h1>B12 · {t('flight')}</h1><p>{t('flightHelp')}</p><TimeControls /><TimeEffectControls /><div className="time-effects"><button onClick={() => seekYear(230)}>{locale==='en'?'Three Kingdoms':historicalText('三国',locale,data)} · 230</button><button onClick={() => seekYear(629)}>{locale==='en'?'Zhenguan':historicalText('贞观',locale,data)} · 629</button><button onClick={() => seekYear(1127)}>{locale==='en'?'Southern Song':historicalText('南宋',locale,data)} · 1127</button></div></GlassPanel></main>;
}
