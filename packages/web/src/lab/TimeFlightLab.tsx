import { TerrainCanvas } from '../components/TerrainCanvas';
import { MorphTimeline } from '../components/MorphTimeline';
import { TimeDriver } from '../components/TimeDriver';
import { TimeControls, TimeEffectControls } from '../components/TimeDock';
import { GlassPanel } from '../components/Glass';
import { useChronicle } from '../store/chronicle';
import { seekYear } from '../store/time';
export default function TimeFlightLab() {
    const { data } = useChronicle();
    return <main className="time-flight-lab"><TimeDriver /><TerrainCanvas environment territories/>{data && <MorphTimeline phases={data.phases}/>}<GlassPanel className="flight-lab-controls"><h1>B12 · 穿越云层</h1><p>跨越 300 年时拔高穿云，再俯冲到新年代。</p><TimeControls /><TimeEffectControls /><div className="time-effects"><button onClick={() => seekYear(230)}>三国 · 230</button><button onClick={() => seekYear(629)}>贞观 · 629</button><button onClick={() => seekYear(1127)}>南宋 · 1127</button></div></GlassPanel></main>;
}
