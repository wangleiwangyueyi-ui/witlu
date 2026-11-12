import { BufferGeometry, Color, DataTexture, Float32BufferAttribute, Group, LinearFilter, Mesh, MeshBasicMaterial, NoColorSpace, RGBAFormat, ShaderMaterial, SRGBColorSpace, Vector4 } from 'three';
import type { DecodedImage } from '../platform/PlatformAdapter';
import type { IUniform } from 'three';
import type { EnvironmentPalette } from '../atmosphere/Environment';
import type { MorphPalette } from '../morph/Morph';
import { BOUNDS, elevationKm, latFromY, project, sampleHeight, tileBounds } from './geo';
import type { TileId } from './geo';
import { terrainFragment, terrainVertex } from './shaders';
import { oceanFragment, oceanVertex } from '../ocean/shaders';
export interface TerrainPalette { sky: string; land: string; sea: string; environment?: EnvironmentPalette; morph?:MorphPalette }

function texture(image: DecodedImage, srgb: boolean) { const tex = new DataTexture(image.data, image.width, image.height, RGBAFormat); tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace; tex.minFilter = tex.magFilter = LinearFilter; tex.generateMipmaps = false; tex.flipY = false; tex.needsUpdate = true; return tex; }
export class TerrainTile {
  readonly group = new Group(); readonly pickMesh: Mesh;
  private geometry: BufferGeometry; private waterGeometry: BufferGeometry;
  private dem: DataTexture; private relief: DataTexture;
  private material: ShaderMaterial; private waterMaterial: ShaderMaterial;
  private originalPickHeights: Float32Array;
  lastUsed = 0;
  constructor(readonly id: TileId, private heights: DecodedImage, color: DecodedImage, segments: number, palette: TerrainPalette, environment: Record<string, IUniform> = {}) {
    const b = tileBounds(id), positions: number[] = [], uvs: number[] = [], skirts: number[] = [], indices: number[] = [], pickPositions: number[] = [];
    const add = (u: number, v: number, skirt = 0) => {
      const i = positions.length / 3, height = sampleHeight(heights.data, heights.width, heights.height, u, v), lat = latFromY((id.y + v) / 2 ** id.z);
      positions.push(u * b.size, 0, v * b.size); pickPositions.push(u * b.size, elevationKm(height, lat) - skirt, v * b.size); uvs.push(u, v); skirts.push(skirt); return i;
    };
    for (let y = 0; y <= segments; y++) for (let x = 0; x <= segments; x++) add(x / segments, y / segments);
    for (let y = 0; y < segments; y++) for (let x = 0; x < segments; x++) { const a = y * (segments + 1) + x, c = a + segments + 1; indices.push(a, c, a + 1, a + 1, c, c + 1); }
    // Edge skirts cover cracks between independently sampled LODs. Picking excludes skirts.
    const surfaceIndices = [...indices]; const surfacePositions = new Float32Array(pickPositions);
    for (let edge = 0; edge < 4; edge++) {
      const top: number[] = [], bottom: number[] = [];
      for (let i = 0; i <= segments; i++) { const u = edge === 0 ? i / segments : edge === 1 ? 1 : edge === 2 ? 1 - i / segments : 0; const v = edge === 0 ? 0 : edge === 1 ? i / segments : edge === 2 ? 1 : 1 - i / segments; top.push(Math.round(v * segments) * (segments + 1) + Math.round(u * segments)); bottom.push(add(u, v, Math.max(.5, b.size * .002))); }
      for (let i = 0; i < segments; i++) indices.push(top[i]!, bottom[i]!, top[i + 1]!, top[i + 1]!, bottom[i]!, bottom[i + 1]!);
    }
    this.geometry = new BufferGeometry(); this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); this.geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2)); this.geometry.setAttribute('skirt', new Float32BufferAttribute(skirts, 1)); this.geometry.setIndex(indices);
    this.dem = texture(heights, false); this.relief = texture(color, true);
    const nw = project(BOUNDS.west, BOUNDS.north), se = project(BOUNDS.east, BOUNDS.south), clip = new Vector4(nw.x, nw.z, se.x, se.z);
    this.material = new ShaderMaterial({ vertexShader: terrainVertex, fragmentShader: terrainFragment, uniforms: { ...environment, heightMap: { value: this.dem }, reliefMap: { value: this.relief }, tileSize: { value: b.size }, tileY: { value: id.y }, zoomScale: { value: 2 ** id.z }, displacement: { value: 1 }, reliefEnabled: { value: 1 }, fogColor: { value: new Color(palette.sky) }, landColor: { value: new Color(palette.land) }, seaColor: { value: new Color(palette.sea) }, clipBounds: { value: clip } } });
    const mesh = new Mesh(this.geometry, this.material); mesh.frustumCulled = false; this.group.add(mesh);
    const pickGeometry = new BufferGeometry(); pickGeometry.setAttribute('position', new Float32BufferAttribute(surfacePositions, 3)); pickGeometry.setIndex(surfaceIndices); pickGeometry.computeBoundingSphere(); pickGeometry.computeBoundingBox();
    this.originalPickHeights = surfacePositions;
    this.pickMesh = new Mesh(pickGeometry, new MeshBasicMaterial()); this.pickMesh.position.set(b.x, 0, b.z); this.pickMesh.updateMatrixWorld();
    this.waterGeometry = new BufferGeometry(); this.waterGeometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, b.size, 0, 0, 0, 0, b.size, b.size, 0, b.size], 3)); this.waterGeometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2)); this.waterGeometry.setIndex([0, 2, 1, 1, 2, 3]);
    this.waterMaterial = new ShaderMaterial({ vertexShader: oceanVertex, fragmentShader: oceanFragment, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4, uniforms: { ...environment, heightMap: { value: this.dem }, reliefMap: { value: this.relief }, seaColor: { value: new Color(palette.sea) }, clipBounds: { value: clip } } });
    const water = new Mesh(this.waterGeometry, this.waterMaterial); water.frustumCulled = false; water.renderOrder = 1; this.group.add(water); this.group.position.set(b.x, 0, b.z);
  }
  effects(displacement: boolean, relief: boolean, water: boolean) {
    if (this.material.uniforms.displacement!.value !== Number(displacement)) {
      this.material.uniforms.displacement!.value = Number(displacement);
      const position = this.pickMesh.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) position.setY(i, displacement ? this.originalPickHeights[i * 3 + 1]! : 0);
      position.needsUpdate = true; this.pickMesh.geometry.computeBoundingSphere(); this.pickMesh.geometry.computeBoundingBox();
    }
    this.material.uniforms.reliefEnabled!.value = Number(relief); this.group.children[1]!.visible = water;
  }
  restore() { this.dem.needsUpdate = this.relief.needsUpdate = true; this.material.needsUpdate = this.waterMaterial.needsUpdate = true; }
  heightAt(x:number,z:number){const b=tileBounds(this.id),u=(x-b.x)/b.size,v=(z-b.z)/b.size;if(u<0||u>1||v<0||v>1)return null;return elevationKm(sampleHeight(this.heights.data,this.heights.width,this.heights.height,u,v),latFromY((this.id.y+v)/2**this.id.z),Boolean(this.material.uniforms.displacement!.value));}
  dispose() { this.group.removeFromParent(); this.geometry.dispose(); this.waterGeometry.dispose(); this.pickMesh.geometry.dispose(); (this.pickMesh.material as MeshBasicMaterial).dispose(); this.dem.dispose(); this.relief.dispose(); this.material.dispose(); this.waterMaterial.dispose(); }
}
