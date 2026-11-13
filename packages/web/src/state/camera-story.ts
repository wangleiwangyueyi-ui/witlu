import { terrainBridge } from './terrain';
import { useShell } from './shell';
import type { RegistryPolity } from '@witlu/core/time';
export function frameSites(sites: [number, number][], duration = 1100) {
  const engine = terrainBridge.engine; if (!engine || !sites.length) return;
  const mobile = matchMedia('(max-width: 767px) and (orientation: portrait)').matches;
  const rect={left:mobile?24:80,top:150,width:Math.max(180,innerWidth-(mobile?48:540)),height:Math.max(120,innerHeight*(mobile?.43:1)-(mobile?150:600))};
  engine.frameSites(sites,rect,useShell.getState().reducedMotion?0:duration);
}
export function focusPolity(polity: RegistryPolity, snapshot: string) { const sites = polity.occurrences.find(o => o.snapshot === snapshot)?.capitals.map(c => c.coord) ?? []; frameSites(sites); }
export function siteScreen(coord: [number, number]) { return terrainBridge.engine?.projectSite(coord) ?? null; }
