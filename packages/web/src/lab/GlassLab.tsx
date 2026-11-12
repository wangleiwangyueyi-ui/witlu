import { MotionConfig } from 'motion/react';
import { GlassButton, GlassChip, GlassPanel, Popover, SegmentedControl, useReducedEffects } from '../components/Glass';
import { GlassIcon } from '../components/GlassIcon';
import type { IconName } from '../components/GlassIcon';
import { ToastProvider, useToast } from '../components/Toast';
import { Refraction, supportsRefraction } from '../components/Refraction';
import { Toggle } from '../components/Toolbar';
import { useShell } from '../state/shell';
import { useI18n } from '../i18n';
const icons: IconName[] = ['search', 'layers', 'music', 'language', 'share', 'play', 'pause', 'previous', 'next', 'compass', 'more', 'close'];
function Gallery() {
  const { t } = useI18n(); const state = useShell(); const toast = useToast();
  return <div className="lab-scroll"><div className="lab-backdrop"/><main className="lab-content"><header><p className="eyebrow">WITLU · P1 · LIQUID GLASS</p><h1>玻璃界面实验室</h1><a href="/">返回地图 ↗</a></header><GlassPanel className="lab-settings"><h2>画质与降级</h2><SegmentedControl label={t('quality')} value={state.quality} options={(['ultra', 'high', 'eco'] as const).map(value => ({ value, label: t(value) }))} onChange={state.setQuality}/><Toggle label={t('highlight')} checked={state.highlight} onChange={() => state.toggle('highlight')}/><Toggle label={t('refraction')} checked={state.refraction && supportsRefraction()} disabled={!supportsRefraction()} onChange={() => state.toggle('refraction')}/><Toggle label={t('motion')} checked={state.reducedMotion} onChange={() => state.toggle('reducedMotion')}/></GlassPanel><GlassPanel className="lab-specimen"><h2>Panel · Button · Chip · Popover · Toast</h2><p>移动指针观察镜面高光，按住按钮观察 0.96 形变，切换省电或减少动态检验降级。</p><div className="lab-actions"><GlassButton icon="play" onClick={() => toast('玻璃组件已就绪')}>按压与提示</GlassButton><Popover icon="layers" label="玻璃弹层"><p>模糊、折射与文字分层。</p></Popover><GlassChip>L2 · Information</GlassChip></div></GlassPanel><GlassPanel className="lab-icons"><h2>分层 SVG 图标</h2><div>{icons.map(name => <figure key={name}><GlassIcon name={name}/><figcaption>{name}</figcaption></figure>)}</div></GlassPanel></main></div>;
}
export default function GlassLab() { const state = useShell(); const reduced = useReducedEffects(); return <MotionConfig reducedMotion={reduced ? 'always' : 'never'}><ToastProvider><div className="atlas-app lab-app" data-quality={state.quality} data-highlight={state.highlight && !reduced} data-refraction={state.refraction && supportsRefraction() && state.quality !== 'eco' && !reduced} data-reduced-motion={reduced}><Refraction/><Gallery/></div></ToastProvider></MotionConfig>; }
