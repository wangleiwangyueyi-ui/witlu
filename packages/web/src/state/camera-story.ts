import { terrainBridge } from './terrain';
import { useShell } from './shell';
import type { RegistryPolity } from '@witlu/core/time';
export function frameSites(sites: [number, number][], duration = 1100) {
  const engine = terrainBridge.engine; if (!engine || !sites.length) return;
  const mobile=matchMedia('(max-width:768px)').matches;
  const rect={left:24,top:mobile?80:50,width:Math.max(180,engine.camera.width-48),height:Math.max(120,engine.camera.height*(mobile?.65:1)-(mobile?160:130))};
  engine.frameSites(sites,rect,useShell.getState().reducedMotion?0:duration);
}
export function focusPolity(polity: RegistryPolity, snapshot: string) { const sites = polity.occurrences.find(o => o.snapshot === snapshot)?.capitals.map(c => c.coord) ?? []; frameSites(sites); }
export function siteScreen(coord: [number, number]) { return terrainBridge.engine?.projectSite(coord) ?? null; }
