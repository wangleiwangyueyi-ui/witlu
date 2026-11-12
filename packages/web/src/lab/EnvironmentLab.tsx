import { TerrainCanvas } from '../components/TerrainCanvas';
import { EnvironmentControls } from '../components/EnvironmentControls';
import { GlassButton, GlassPanel, SegmentedControl } from '../components/Glass';
import { ToastProvider } from '../components/Toast';
import { terrainBridge } from '../state/terrain';
import { useShell } from '../state/shell';
import { DebugConsole } from '../components/DebugConsole';
const views = [
  { name: '东海', lon: 123, lat: 28, distance: 3300, pitch: 40 }, { name: '南海', lon: 114, lat: 16, distance: 3300, pitch: 40 },
  { name: '印度洋', lon: 84, lat: 12, distance: 4200, pitch: 40 }, { name: '太平洋', lon: 140, lat: 27, distance: 4500, pitch: 40 },
  { name: '山河云影', lon: 104, lat: 32, distance: 5800, pitch: 45 }
];
export default function EnvironmentLab({ mode }: { mode: 'ocean' | 'clouds' }) {
  const quality = useShell(s => s.quality), setQuality = useShell(s => s.setQuality);
  return <ToastProvider><main className="atlas-app terrain-lab environment-lab" data-capture-root="true" data-quality={quality}><TerrainCanvas environment initialPose={views[mode === 'ocean' ? 0 : 4]!}/><GlassPanel className="environment-lab-controls"><p className="eyebrow">P3 · {mode.toUpperCase()} LAB</p><h1>{mode === 'ocean' ? '海月潮生' : '云过山河'}</h1><p>{mode === 'ocean' ? '夜蓝海面 · 冷光拍岸 · 洋流缓行' : '薄云随风 · 山影流转 · 天光渐移'}</p><div className="environment-views">{views.map(view => <GlassButton key={view.name} onClick={() => terrainBridge.engine?.camera.flyTo(view)}>{view.name}</GlassButton>)}</div><details><summary>画质与特效</summary><SegmentedControl label="画质" value={quality} onChange={setQuality} options={[{ value: 'ultra', label: '极致' }, { value: 'high', label: '高' }, { value: 'eco', label: '省电' }]}/><EnvironmentControls/></details><a href="/">返回江山 ↗</a></GlassPanel>{new URLSearchParams(location.search).get('debug') === '1' && <DebugConsole snapshot={`${mode}-lab`}/>}</main></ToastProvider>;
}
