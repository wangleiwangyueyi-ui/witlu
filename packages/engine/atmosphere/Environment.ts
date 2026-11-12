import { BackSide, Color, DataTexture, LinearFilter, LinearMipmapLinearFilter, Mesh, NoColorSpace, RepeatWrapping, RGBAFormat, ShaderMaterial, SphereGeometry, Vector3, Vector4 } from 'three';
import type { IUniform, Scene } from 'three';
import type { PlatformAdapter } from '../platform/PlatformAdapter';
import type { MapCamera } from '../camera/MapCamera';
import type { Quality } from '../Quality';
import { DEFAULT_EFFECTS, effectiveSettings, sunAzimuth } from './model';
import type { EnvironmentEffects } from './model';
import { Clouds } from './Clouds';
import { Currents } from '../ocean/Currents';
import { project, WORLD_KM } from '../terrain/geo';
export interface EnvironmentPalette { sky: string; horizon: string; shelf: string; coast: string; flow: string; wave: string; cloud: string }
interface EnvironmentManifest { mercator: { x: number; y: number; width: number; height: number } }
export class Environment {
  readonly uniforms: Record<string, IUniform>;
  effects: EnvironmentEffects = { ...DEFAULT_EFFECTS }; enabled = false; reducedMotion = false;
  time = 0; ready = false; error: string | null = null; private slowTime = 0;
  private disposed = false; private maps: DataTexture[] = [];
  private sky: Mesh; private clouds: Clouds; private currents: Currents;
  private state = effectiveSettings('high', this.effects, false);
  constructor(private platform: PlatformAdapter, palette: EnvironmentPalette, scene: Scene) {
    const dummy = new DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1, RGBAFormat); dummy.needsUpdate = true; this.maps.push(dummy);
    this.uniforms = {
      envEnabled: { value: 0 }, envTime: { value: 0 }, slowTime: { value: 0 }, sunDirection: { value: new Vector3(-.5, .8, -.4).normalize() }, fogEnabled: { value: 1 }, lightCycleEnabled: { value: 1 },
      skyColor: { value: new Color(palette.sky) }, horizonColor: { value: new Color(palette.horizon) }, shelfColor: { value: new Color(palette.shelf) }, coastColor: { value: new Color(palette.coast) }, flowColor: { value: new Color(palette.flow) }, waveColor: { value: new Color(palette.wave) }, cloudColor: { value: new Color(palette.cloud).multiplyScalar(.65) },
      coastDistance: { value: dummy }, normalA: { value: dummy }, normalB: { value: dummy }, cloudCoverage: { value: dummy }, coastTransform: { value: new Vector4() }, environmentReady: { value: 0 },
      waterMotion: { value: 1 }, normalLayers: { value: 2 }, moonStrength: { value: .12 }, wavesEnabled: { value: 1 }, cloudShadowStrength: { value: .05 }, cloudVisibility: { value: 1 }, cloudCount: { value: 0 }, cloudData: { value: Array.from({ length: 6 }, () => new Vector4()) }, cloudDetails: { value: Array.from({ length: 6 }, () => new Vector4()) }, cloudBasis: { value: new Vector4(1, 0, 0, -1) }
    };
    // Bound each transparent layer too, so their composite preserves 7:1 white
    // contrast even above a snow peak, rather than only capping the terrain.
    for (const key of ['cloudColor', 'flowColor']) {
      const color = this.uniforms[key]!.value as Color, luminance = color.r * .2126 + color.g * .7152 + color.b * .0722;
      color.multiplyScalar(Math.min(1, .09 / Math.max(.0001, luminance)));
    }
    const material = new ShaderMaterial({ side: BackSide, depthWrite: false, uniforms: this.uniforms,
      vertexShader: `varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform vec3 skyColor;uniform vec3 horizonColor;varying vec3 vDirection;void main(){float horizon=pow(1.0-abs(normalize(vDirection).y),5.0);gl_FragColor=vec4(mix(skyColor,horizonColor,horizon*0.28),1.0);\n#include <colorspace_fragment>\n}`
    });
    this.sky = new Mesh(new SphereGeometry(28000, 32, 16), material); this.sky.frustumCulled = false; this.sky.renderOrder = -10; scene.add(this.sky);
    this.clouds = new Clouds(this.uniforms, scene); this.currents = new Currents(this.uniforms, scene);
  }
  async load() {
    try {
      const manifest = await this.platform.readJSON<EnvironmentManifest>('/tiles/environment/manifest.json');
      const entries = [['coastDistance', 'coast-distance.webp'], ['normalA', 'water-normal-a.webp'], ['normalB', 'water-normal-b.webp'], ['cloudCoverage', 'cloud-coverage.webp']] as const;
      for (const [uniform, name] of entries) {
        const pixels = await this.platform.decodeImage(await this.platform.readBytes(`/tiles/environment/${name}`)); if (this.disposed) return;
        const texture = new DataTexture(pixels.data, pixels.width, pixels.height, RGBAFormat); texture.colorSpace = NoColorSpace; texture.magFilter = LinearFilter; texture.flipY = false;
        const repeat = uniform === 'normalA' || uniform === 'normalB'; texture.minFilter = repeat ? LinearMipmapLinearFilter : LinearFilter; texture.generateMipmaps = repeat; if (repeat) texture.wrapS = texture.wrapT = RepeatWrapping;
        texture.needsUpdate = true; this.maps.push(texture); this.uniforms[uniform]!.value = texture;
      }
      const origin = project(-180, 0), m = manifest.mercator;
      (this.uniforms.coastTransform!.value as Vector4).set(origin.x + m.x * WORLD_KM, origin.z + (m.y - .5) * WORLD_KM, m.width * WORLD_KM, m.height * WORLD_KM);
      this.ready = true; this.uniforms.environmentReady!.value = 1;
    } catch (e) { if (!this.disposed) this.error = e instanceof Error ? e.message : String(e); }
  }
  update(dt: number, camera: MapCamera, quality: Quality) {
    this.state = effectiveSettings(quality, this.effects, this.reducedMotion);
    if (this.enabled && !this.reducedMotion) { const step = Math.min(dt, 100) / 1000; this.time += step; this.slowTime += step * Math.min(1, camera.pose.distance / 2500); }
    const active = this.enabled && this.ready; this.uniforms.envEnabled!.value = Number(active); this.uniforms.envTime!.value = this.time;
    this.uniforms.slowTime!.value = this.slowTime;
    this.uniforms.waterMotion!.value = Number(this.effects.waterMotion); this.uniforms.normalLayers!.value = this.state.normalLayers; this.uniforms.moonStrength!.value = this.state.moon;
    this.uniforms.wavesEnabled!.value = Number(this.state.waves); this.uniforms.fogEnabled!.value = Number(this.effects.fog); this.uniforms.lightCycleEnabled!.value = Number(this.effects.lightCycle);
    this.uniforms.cloudShadowStrength!.value = this.state.shadows;
    const azimuth = sunAzimuth(this.time, this.effects.lightCycle) * Math.PI / 180;
    (this.uniforms.sunDirection!.value as Vector3).set(Math.sin(azimuth) * .66, .75, -Math.cos(azimuth) * .66).normalize();
    this.sky.visible = active && this.effects.sky; this.sky.position.copy(camera.camera.position);
    this.clouds.update(this.time, camera.pose.distance, project(camera.pose.lon, camera.pose.lat), camera.camera, this.effects, this.state.cloudLayers, this.state.cloudLimit, active);
    this.currents.update(this.slowTime, this.state.currents, active);
  }
  stats() { return { enabled: this.enabled, ready: this.ready, error: this.error, time: this.time, sunAzimuth: sunAzimuth(this.time, this.effects.lightCycle), clouds: this.uniforms.cloudCount!.value as number, cloudLayers: this.state.cloudLayers, shadowStrength: this.state.shadows, normalLayers: this.state.normalLayers, currentParticles: this.state.currents, reducedMotion: this.reducedMotion, effects: { ...this.effects } }; }
  restore() { this.maps.forEach(texture => { texture.needsUpdate = true; }); }
  dispose() { this.disposed = true; this.clouds.dispose(); this.currents.dispose(); this.sky.removeFromParent(); this.sky.geometry.dispose(); (this.sky.material as ShaderMaterial).dispose(); this.maps.forEach(texture => texture.dispose()); }
}
