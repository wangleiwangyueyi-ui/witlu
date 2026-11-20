import { Camera, Color, DataTexture, LinearFilter, LinearMipmapLinearFilter, Mesh, PlaneGeometry, RepeatWrapping, RGBAFormat, Scene, ShaderMaterial, SRGBColorSpace, Vector2, Vector3, WebGLRenderer } from 'three';
import type { WebGLRendererParameters } from 'three';
import type { PlatformAdapter } from '../platform/PlatformAdapter';
import type { Quality } from '../Quality';
import { openingFragment, openingVertex } from './shaders';

export const OPENING_MS = 5600;
export const STATIC_OPENING_MS = 1500;
const radians = Math.PI / 180;
const earthRadius = 6378137;

export interface OpeningTarget {
  lon: number;
  lat: number;
  metresPerPixel: number;
  x: number;
  y: number;
}

interface OpeningPalette { sky: string; blue: string; mist: string; gold: string }

export function openingEase(start: number, end: number, value: number) {
  const p = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return p * p * (3 - 2 * p);
}

function direction(lon: number, lat: number, target: Vector3) {
  return target.set(Math.cos(lon) * Math.cos(lat), Math.sin(lat), Math.sin(lon) * Math.cos(lat));
}

/** A lazy, independent scene so the atlas can finish its first frame before any globe work. */
export class Opening {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new Camera();
  private readonly geometry = new PlaneGeometry(2, 2);
  private readonly uniforms;
  private readonly material: ShaderMaterial;
  private disposed = false;
  readonly resolution: number;

  constructor(private readonly platform: PlatformAdapter, palette: OpeningPalette) {
    const { mobile } = platform.viewport();
    this.resolution = mobile ? 2048 : 4096;
    this.renderer = new WebGLRenderer({
      canvas: platform.canvas as NonNullable<WebGLRendererParameters['canvas']>,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.uniforms = {
      dayMap: {value: null as DataTexture | null}, earthLayers: {value: null as DataTexture | null},
      viewport: {value: new Vector2()}, focus: {value: new Vector2()}, mapFocus: {value: new Vector2()}, mapOrigin: {value: new Vector2()},
      orbit: {value: new Vector3()}, east: {value: new Vector3()}, north: {value: new Vector3()}, sun: {value: new Vector3()},
      sky: {value: new Color(palette.sky)}, blue: {value: new Color(palette.blue)}, mist: {value: new Color(palette.mist)}, gold: {value: new Color(palette.gold)},
      focal: {value: 0}, altitude: {value: 0}, mapScale: {value: 0}, time: {value: 0},
      reveal: {value: 0}, flatten: {value: 0}, passage: {value: 0}, outline: {value: 0},
    };
    this.material = new ShaderMaterial({ uniforms: this.uniforms, vertexShader: openingVertex, fragmentShader: openingFragment, depthTest: false, depthWrite: false });
    const plane = new Mesh(this.geometry, this.material);
    plane.frustumCulled = false;
    this.scene.add(plane);
  }

  async load() {
    const images = await Promise.all(['day', 'masks'].map(async layer =>
      this.platform.decodeImage(await this.platform.readBytes(`/brand/opening/${layer}-${this.resolution}.webp`))));
    if (this.disposed) return;
    for (const image of images) {
      if (image.width !== this.resolution || image.height !== this.resolution / 2) throw new Error('Invalid Earth texture dimensions');
    }
    const textures = images.map((image, index) => {
      const texture = new DataTexture(image.data, image.width, image.height, RGBAFormat);
      if (index === 0) texture.colorSpace = SRGBColorSpace;
      texture.flipY = true;
      texture.wrapS = RepeatWrapping;
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
      this.renderer.initTexture(texture);
      return texture;
    });
    this.uniforms.dayMap.value = textures[0]!;
    this.uniforms.earthLayers.value = textures[1]!;
    // The opening can be skipped immediately. A polling compile would outlive disposal.
    this.renderer.compile(this.scene, this.camera);
  }

  resize(quality: Quality) {
    const {width,height,pixelRatio,mobile} = this.platform.viewport();
    this.uniforms.viewport.value.set(width,height);
    const limit = mobile ? .95 : quality === 'ultra' ? 1.25 : 1;
    this.renderer.setPixelRatio(Math.min(pixelRatio, limit));
    this.renderer.setSize(Math.max(1,width),Math.max(1,height),false);
  }

  draw(ms: number, target: OpeningTarget, still: boolean) {
    const u = this.uniforms, {x: width, y: height} = u.viewport.value;
    const turn = still ? 0 : openingEase(1050,3880,ms);
    const zoom = still ? 0 : openingEase(1450,4510,ms);
    const longitude = still ? target.lon + 22 : 164 + (target.lon - 164) * turn;
    const latitude = still ? target.lat - 4 : 15 + (target.lat - 15) * turn;
    const lon = longitude * radians, lat = latitude * radians, mapLat = target.lat * radians;
    const focal = height / (2 * Math.tan(21 * radians));
    const diameter = Math.min(width,height) * .76;
    const startAltitude = Math.hypot(1,2 * focal / diameter) - 1;
    const endAltitude = focal * Math.cos(mapLat) * target.metresPerPixel / earthRadius;
    direction(lon,lat,u.orbit.value);
    u.east.value.set(-Math.sin(lon),0,Math.cos(lon));
    u.north.value.crossVectors(u.east.value,u.orbit.value);
    direction((46 + 41 * turn) * radians,(-12 + 26 * turn) * radians,u.sun.value);
    u.focal.value = focal;
    u.altitude.value = startAltitude * (endAltitude / startAltitude) ** zoom;
    u.mapFocus.value.set(target.x,height-target.y);
    u.focus.value.set(width*.5 + (target.x-width*.5)*zoom,height*.59 + (height-target.y-height*.59)*zoom);
    u.mapOrigin.value.set(target.lon*radians,Math.asinh(Math.tan(mapLat)));
    u.mapScale.value = target.metresPerPixel / earthRadius;
    u.time.value = still ? 0 : ms / 1000;
    u.reveal.value = still ? 1 : .13 + .87 * openingEase(0,1420,ms);
    u.flatten.value = still ? 0 : openingEase(4020,4560,ms);
    u.passage.value = still ? 0 : openingEase(3910,4450,ms) * (1 - openingEase(4590,5450,ms));
    u.outline.value = still ? 0 : openingEase(2080,3100,ms) * (1 - openingEase(4080,4670,ms));
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.uniforms.dayMap.value?.dispose();
    this.uniforms.earthLayers.value?.dispose();
    this.material.dispose();
    this.geometry.dispose();
    this.renderer.dispose();
  }
}
