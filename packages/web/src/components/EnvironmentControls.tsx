import { Toggle } from './Toolbar';
import { useEnvironmentSettings } from '../state/environment';
import { useI18n } from '../i18n';
import type { EnvironmentEffects } from '@witlu/engine';
const effects: (keyof EnvironmentEffects)[] = ['waterMotion', 'moonlight', 'coastWaves', 'currents', 'sky', 'fog', 'lightCycle', 'clouds', 'cloudShadows'];
export function EnvironmentControls() {
  const s = useEnvironmentSettings(), { t } = useI18n();
  return <div className="terrain-switches environment-switches">{effects.map(key => <Toggle key={key} label={t(key)} checked={s.effects[key]} onChange={() => s.toggle(key)}/>)}</div>;
}
