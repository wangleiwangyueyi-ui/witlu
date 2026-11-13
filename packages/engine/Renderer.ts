import { Color, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import type { WebGLRendererParameters } from 'three';
import type { PlatformAdapter } from './platform/PlatformAdapter';
import { MapCamera } from './camera/MapCamera';
import { QualityController, QUALITY } from './Quality';
import type { Quality } from './Quality';
import { TerrainManager } from './terrain/TerrainManager';
import type { TerrainPalette } from './terrain/TerrainTile';
import { pickTerrain } from './picking/pickTerrain';
import type { TerrainPick } from './picking/pickTerrain';
import { Environment } from './atmosphere/Environment';
import { Resonance } from './atmosphere/Resonance';
import { project, unproject } from './terrain/geo';
import { Vector3 } from 'three';
import { TimeFlight } from './atmosphere/TimeFlight';
import { Morph } from './morph/Morph';
import { Weather } from './weather/Weather';
export interface EngineStats { fps: number; frameMs: number; cpuMs: number; drawCalls: number; triangles: number; tiles: number; cached: number; loading: number; errors: number; zoom: number; quality: Quality; pixelRatio: number; context: 'ready' | 'lost'; pose: ReturnType<AtlasRenderer['pose']>; environment: ReturnType<Environment['stats']>; weather:ReturnType<Weather['stats']>; morph:ReturnType<Morph['stats']> }
export class AtlasRenderer {
  readonly weather:Weather; readonly resonance: Resonance; readonly timeFlight: TimeFlight; readonly camera: MapCamera; readonly quality: QualityController; readonly terrain: TerrainManager; readonly environment: Environment; readonly morph:Morph;
  readonly renderer: WebGLRenderer; private scene = new Scene(); private frame = 0; private alive = true; private visible = true; private lost = false;
  private previous = 0; private lastLod = -Infinity; private lastReport = 0; private samples: number[] = []; private cpu: number[] = [];
  private cleanup: (() => void)[] = [];
  onStats: ((stats: EngineStats) => void) | null = null;
  onQuality: ((quality: Quality) => void) | null = null;
  onPick: ((pick: TerrainPick | null) => void) | null = null;
  constructor(private platform: PlatformAdapter, palette: TerrainPalette, initialQuality: Quality = 'high') {
    const viewport = platform.viewport(); this.camera = new MapCamera(viewport.mobile); this.quality = new QualityController(initialQuality);
    this.renderer = new WebGLRenderer({ canvas: platform.canvas as NonNullable<WebGLRendererParameters['canvas']>, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.outputColorSpace = SRGBColorSpace; this.scene.background = new Color(palette.sky);
    this.environment = new Environment(platform, palette.environment ?? { sky: palette.sky, horizon: palette.sky, shelf: palette.sea, coast: palette.sea, flow: palette.sea, wave: palette.sea, cloud: palette.sky }, this.scene);
    void this.environment.load();
    this.weather=new Weather(platform,this.scene,this.environment,palette.weather??{blue:palette.land,gold:palette.land,fire:palette.land,smoke:palette.land});
    this.timeFlight = new TimeFlight(this.scene, this.environment.uniforms);
    this.terrain = new TerrainManager(platform, this.scene, palette, initialQuality, viewport.mobile, this.environment.uniforms);
    this.resonance = new Resonance(this.scene, this.terrain, palette.morph?.gold ?? palette.land);
    this.morph=new Morph(platform,this.renderer,this.terrain,this.scene,palette.morph??{gold:palette.land,white:palette.land,cinnabar:palette.land,dust:palette.land});Object.assign(this.environment.uniforms,this.morph.uniforms);
    this.camera.onPick = (x, y) => this.onPick?.(pickTerrain(x, y, this.camera.width, this.camera.height, this.camera.camera, this.terrain.visible));
    this.cleanup.push(platform.bindInput(this.camera), platform.onResize(() => this.resize()), platform.onContextChange(() => {
      this.lost = true; platform.cancelFrame(this.frame); this.report(platform.now());
    }, () => { if (!this.alive) return; this.lost = false; this.previous = 0; this.terrain.restore(); this.environment.restore(); this.morph.restore(); this.resize(); this.start(); }), platform.onVisibility(visible => { this.visible = visible; platform.cancelFrame(this.frame); this.previous = 0; if (visible) this.start(); }));
    this.resize(); this.start();
  }
  frameSites(sites: [number,number][], rect: {left:number;top:number;width:number;height:number}, duration=1100) {
    if(!sites.length)return;
    const camera=new MapCamera(this.camera.mobile);camera.resize(this.camera.width,this.camera.height);
    let pose={...this.camera.pose,lon:sites.reduce((s,c)=>s+c[0],0)/sites.length,lat:sites.reduce((s,c)=>s+c[1],0)/sites.length,bearing:0,distance:2600};
    for(let i=0;i<8;i++){
      camera.flyTo(pose,0);
      const points=sites.map(c=>{const q=project(...c);const p=new Vector3(q.x,this.terrain.heightAt(q.x,q.z)+8,q.z).project(camera.camera);return {x:(p.x+1)*.5*camera.width,y:(1-p.y)*.5*camera.height};});
      const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
      const scale=pose.distance*2*Math.tan(21*Math.PI/180)/camera.height,q=project(pose.lon,pose.lat);
      const center=unproject(q.x+((minX+maxX)/2-rect.left-rect.width/2)*scale,q.z+((minY+maxY)/2-rect.top-rect.height/2)*scale/Math.sin(pose.pitch*Math.PI/180));
      pose={...pose,lon:center.lon,lat:center.lat,distance:Math.min(11000,pose.distance*Math.max(1,(maxX-minX)/(rect.width*.82),(maxY-minY)/(rect.height*.82)))};
    }
    this.camera.flyTo(pose,duration);
  }
  projectSite(coord: [number, number]) { const q = project(...coord), p = new Vector3(q.x, this.terrain.heightAt(q.x,q.z) + 8, q.z).project(this.camera.camera); return { x: (p.x+1)*.5*this.camera.width, y: (1-p.y)*.5*this.camera.height, visible: Math.abs(p.x)<=1 && Math.abs(p.y)<=1 && p.z>=-1 && p.z<=1 }; }
  pose() { return { ...this.camera.pose }; }
  setQuality(level: Quality) { this.quality.set(level); this.terrain.setQuality(level); this.resize(); }
  resize() { const v = this.platform.viewport(); this.camera.resize(Math.max(1, v.width), Math.max(1, v.height)); this.renderer.setPixelRatio(Math.min(v.pixelRatio, QUALITY[this.quality.level].pixelRatio)); this.renderer.setSize(Math.max(1, v.width), Math.max(1, v.height), false); this.lastLod = -Infinity; }
  private start() { if (this.alive && !this.lost && this.visible) this.frame = this.platform.requestFrame(now => this.tick(now)); }
  private tick(now: number) {
    if (!this.alive || this.lost || !this.visible) return;
    const start = this.platform.now(), dt = this.previous ? now - this.previous : 16.67; this.previous = now;
    this.timeFlight.update(dt, this.camera, this.quality.level, this.environment.reducedMotion);
    this.resonance.update(dt, this.quality.level, this.environment.reducedMotion);
    this.camera.update(dt);
    this.environment.update(dt, this.camera, this.quality.level);
    this.weather.update(now,this.camera,this.quality.level,this.terrain);
    if (now - this.lastLod >= 120) { this.terrain.update(this.camera.camera, this.camera.height, now); this.lastLod = now; }
    this.morph.precomputeEnabled=!this.weather.stats().active;
    this.morph.update(now,this.quality.level);
    this.renderer.render(this.scene, this.camera.camera);
    if (dt < 250) { this.samples.push(dt); this.cpu.push(this.platform.now() - start); }
    const change = this.quality.sample(dt); if (change) { this.terrain.setQuality(change); this.resize(); this.onQuality?.(change); }
    if (now - this.lastReport >= 500) this.report(now);
    this.start();
  }
  private report(now: number) {
    const mean = (values: number[]) => values.reduce((s, n) => s + n, 0) / Math.max(1, values.length);
    const frameMs = mean(this.samples); this.onStats?.({ fps: this.lost ? 0 : frameMs ? 1000 / frameMs : 0, frameMs, cpuMs: mean(this.cpu), drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, tiles: this.terrain.visible.length, cached: this.terrain.cacheSize, loading: this.terrain.loading, errors: this.terrain.errors, zoom: this.terrain.maxZoom, quality: this.quality.level, pixelRatio: this.renderer.getPixelRatio(), context: this.lost ? 'lost' : 'ready', pose: this.pose(), weather:this.weather.stats(), environment: this.environment.stats(), morph:this.morph.stats() });
    this.samples = []; this.cpu = []; this.lastReport = now;
  }
  renderNow() { if (!this.lost) this.renderer.render(this.scene, this.camera.camera); }
  prepareWeather(){this.weather.warm(this.renderer,this.camera.camera);}
  dispose() { this.alive = false; this.platform.cancelFrame(this.frame); this.cleanup.forEach(fn => fn()); this.camera.cancel(); this.terrain.dispose(); this.resonance.dispose(); this.timeFlight.dispose(); this.weather.dispose(); this.environment.dispose(); this.morph.dispose(); this.renderer.dispose(); }
}
