import { TerrainCanvas } from '../components/TerrainCanvas';
import { TerrainControls } from '../components/TerrainControls';
import { GlassButton, GlassPanel, SegmentedControl } from '../components/Glass';
import { ToastProvider } from '../components/Toast';
import { terrainBridge } from '../state/terrain';
import { useShell } from '../state/shell';
import { DebugConsole } from '../components/DebugConsole';
export default function TerrainLab() {
  const quality = useShell(s => s.quality), setQuality = useShell(s => s.setQuality);
  return <ToastProvider><main className="atlas-app terrain-lab" data-capture-root="true" data-quality={quality}><TerrainCanvas/><GlassPanel className="terrain-lab-controls"><p className="eyebrow">P2 · TERRAIN LAB</p><h1>夜蓝山河</h1><p>真实高程 · 黛青浮雕 · 三维视角</p><SegmentedControl label="画质" value={quality} onChange={setQuality} options={[{ value: 'ultra', label: '极致' }, { value: 'high', label: '高' }, { value: 'eco', label: '省电' }]}/><TerrainControls/><GlassButton icon="compass" onClick={() => terrainBridge.engine?.camera.reset()}>复位视角</GlassButton><small>拖动平移 · 滚轮缩放<br/>Shift / 右键拖动旋转与俯仰<br/>双指缩放、旋转、上下倾斜<br/>点击山河，拾取经纬度与高程</small><a href="/">返回江山 ↗</a></GlassPanel><DebugConsole snapshot="terrain-lab"/></main></ToastProvider>;
}
