import { create } from 'zustand';
import type { CameraPose } from '@witlu/engine';
import type { RegistryPolity } from '@witlu/core/time';
import type { Chronicle } from '../store/chronicle';
import { focusPolity, frameSites } from './camera-story';
import { terrainBridge } from './terrain';

export const usePolityFocus = create<{focus: {snapshot: string; key: string; returnPose: CameraPose | undefined} | null}>(()=>({ focus: null }));

export function setPolityPreview(key: string | null) {
  terrainBridge.engine?.morph.focusPolity(key);
}

export function togglePolityFocus(polity: RegistryPolity, snapshot: string, data: Chronicle | undefined) {
  const {focus} = usePolityFocus.getState();
  const engine = terrainBridge.engine;
  const previous = focus?.snapshot === snapshot ? focus : null;
  const next = previous?.key === polity.key ? null : { snapshot, key: polity.key, returnPose: previous?.returnPose ?? engine?.pose() };
  usePolityFocus.setState({ focus: next });
  setPolityPreview(next?.key ?? null);
  if (!next) {
    if (previous?.returnPose) engine?.camera.flyTo(previous.returnPose);
    return;
  }
  window.dispatchEvent(new Event('atlas:peek-chronicle'));
  const style = data?.colors.find(row=>row.snapshot===snapshot)?.colors.find(row=>row.polityId===polity.key);
  if (style?.bounds && engine?.flat) {
    const [west,south,east,north] = style.bounds;
    frameSites([[west,south],[east,north]]);
  } else if (style?.anchor && engine?.flat) frameSites([style.anchor]);
  else focusPolity(polity, snapshot);
}
