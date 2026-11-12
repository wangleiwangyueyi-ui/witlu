import { GlassButton } from './Glass';
import { Toggle } from './Toolbar';
import { useTerrainSettings, terrainBridge } from '../state/terrain';
import { useI18n } from '../i18n';
export function TerrainControls() {
  const s = useTerrainSettings(), { locale } = useI18n(), en = locale === 'en';
  return <div className="terrain-switches"><Toggle label={en ? 'Elevation displacement' : '高程位移'} checked={s.displacement} onChange={() => s.toggle('displacement')}/><Toggle label={en ? 'Baked relief' : '地形晕渲'} checked={s.relief} onChange={() => s.toggle('relief')}/><Toggle label={en ? 'Sea surface' : '海面'} checked={s.water} onChange={() => s.toggle('water')}/><Toggle label={en ? 'Automatic quality' : '自动画质'} checked={s.automatic} onChange={() => s.toggle('automatic')}/><GlassButton onClick={() => terrainBridge.engine?.camera.flyTo({ lon: 88.8, lat: 29.5, distance: 1800, bearing: -12, pitch: 45 })}>{en ? 'Fly to Tibet' : '飞往青藏'}</GlassButton></div>;
}
