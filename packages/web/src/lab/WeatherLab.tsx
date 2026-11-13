import { TerrainCanvas } from '../components/TerrainCanvas';
import { WeatherControls,WeatherDriver } from '../components/Weather';
import { GlassPanel,SegmentedControl } from '../components/Glass';
import { ToastProvider } from '../components/Toast';
import { DebugConsole } from '../components/DebugConsole';
import { useShell } from '../state/shell';
import { useTerrainSettings } from '../state/terrain';
import { Toggle } from '../components/Toolbar';
const pose={lon:113,lat:31,distance:5000,pitch:45};
export default function WeatherLab(){const s=useShell(),terrain=useTerrainSettings();return <ToastProvider><main className="atlas-app terrain-lab weather-lab" data-capture-root="true" data-quality={s.quality}><TerrainCanvas environment territories initialPose={pose}/><WeatherDriver/><GlassPanel className="weather-lab-controls"><p className="eyebrow">P7 · WEATHER LAB</p><h1>{s.locale==='en'?'Sky over history':'山河天象'}</h1><WeatherControls/><SegmentedControl label="Quality" value={s.quality} onChange={s.setQuality} options={[{value:'ultra',label:'极致'},{value:'high',label:'高'},{value:'eco',label:'省电'}]}/><Toggle label="自动画质" checked={terrain.automatic} onChange={()=>terrain.toggle('automatic')}/><Toggle label="减少动态效果" checked={s.reducedMotion} onChange={()=>s.toggle('reducedMotion')}/><a href="/">江山 ↗</a></GlassPanel>{new URLSearchParams(location.search).get('debug')==='1'&&<DebugConsole snapshot="weather-lab"/>}<div className="legal-strip">历史疆域为示意性近似，非测绘边界</div></main></ToastProvider>;}
