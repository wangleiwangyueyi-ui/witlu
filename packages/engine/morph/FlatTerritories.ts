import { Matrix4, Mesh, NoBlending, Scene, ShaderMaterial, Vector2, Vector3 } from 'three';
import type { BufferGeometry, IUniform, OrthographicCamera, WebGLRenderer } from 'three';
import { renderTarget } from './Rasterizer';
import type { Rasterizer } from './Rasterizer';
import type { PolityGeometry } from './types';
import type { Quality } from '../Quality';

/** Resolve vector coverage at the canvas's real pixel size, without filtering packed IDs. */
export class FlatTerritories {
  private scene = new Scene();
  private target = renderTarget(1);
  private geometry: BufferGeometry[] = [];
  private material: ShaderMaterial;
  private mesh: Mesh | undefined;
  private viewport = new Vector2();
  private view = new Matrix4();
  private projection = new Matrix4();
  private last = -1;
  private size: Vector3;

  constructor(private renderer: WebGLRenderer, private raster: Rasterizer, uniforms: Record<string, IUniform>) {
    this.size = uniforms.screenStyleSize!.value as Vector3;
    uniforms.screenStyle!.value = this.target.texture;
    this.material = new ShaderMaterial({
      depthTest: false, depthWrite: false, blending: NoBlending, side: 2,
      uniforms: { palette: uniforms.polityPalette!, row: {value: .125} },
      vertexShader: 'attribute vec2 label;varying vec2 vLabel;void main(){vLabel=label;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform sampler2D palette;uniform float row;varying vec2 vLabel;void main(){float id=floor(vLabel.r*255.+.5)+floor(vLabel.g*255.+.5)*256.;vec4 s=texture2D(palette,vec2((id+.5)/1024.,row));gl_FragColor=vec4(s.rgb*s.a,s.a);}'
    });
  }

  setPair(a: PolityGeometry, b: PolityGeometry, ids: Map<string, number>) {
    this.geometry.forEach(g => g.dispose());
    this.geometry = [this.raster.geometry(a, ids, true)];
    this.geometry.push(a === b ? this.geometry[0]! : this.raster.geometry(b, ids, true));
    this.mesh?.removeFromParent();
    this.mesh = new Mesh(this.geometry[0], this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.last = -1;
  }

  update(camera: OrthographicCamera | undefined, side: number, quality: Quality) {
    this.size.z = 0;
    if (!camera || !this.mesh) return;
    this.renderer.getDrawingBufferSize(this.viewport);
    const {x, y} = this.viewport;
    const samples = quality === 'eco' ? 2 : 4;
    const resized = x !== this.target.width || y !== this.target.height || samples !== this.target.samples;
    if (resized) {
      // Three.js reallocates on size changes only. A same-size sample change
      // still needs new multisampled attachments.
      if(x===this.target.width && y===this.target.height)this.target.dispose();
      this.target.samples = samples;
      this.target.setSize(x, y);
    }
    if (resized || side !== this.last || !camera.matrixWorldInverse.equals(this.view) || !camera.projectionMatrix.equals(this.projection)) {
      this.mesh.geometry = this.geometry[side]!;
      this.material.uniforms.row!.value = side === 0 ? .125 : .375;
      this.raster.draw(this.scene, camera, this.target);
      this.view.copy(camera.matrixWorldInverse);
      this.projection.copy(camera.projectionMatrix);
      this.last = side;
    }
    this.size.set(x, y, 1);
  }

  dispose() {
    this.geometry.forEach(g => g.dispose());
    this.material.dispose();
    this.target.dispose();
  }
}
