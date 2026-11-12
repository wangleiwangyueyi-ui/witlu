import { CatmullRomCurve3, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, Vector3 } from 'three';
import type { IUniform, Scene } from 'three';
import { project } from '../terrain/geo';
const ROUTES = [
  { closed: false, points: [[123, 19], [123.8, 23], [126.5, 27], [130.5, 30.5], [138, 34.5], [146, 38]] },
  { closed: true, points: [[110.5, 12], [112, 17.5], [116, 19], [119, 16.5], [116, 10.5], [112, 8.5]] }
];
export class Currents {
  readonly mesh: InstancedMesh;
  private curves = ROUTES.map(r => new CatmullRomCurve3(r.points.map(([lon, lat]) => { const p = project(lon!, lat!); return new Vector3(p.x, .5, p.z); }), r.closed));
  private matrix = new Matrix4(); private rotation = new Quaternion(); private position = new Vector3(); private scale = new Vector3(); private up = new Vector3(0, 1, 0);
  constructor(uniforms: Record<string, IUniform>, scene: Scene) {
    const material = new ShaderMaterial({ transparent: true, depthWrite: false, uniforms,
      vertexShader: `varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vec4 world=modelMatrix*instanceMatrix*vec4(position,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
      fragmentShader: `uniform sampler2D coastDistance;uniform vec4 coastTransform;uniform vec3 flowColor;varying vec2 vUv;varying vec3 vWorld;void main(){vec2 uv=(vWorld.xz-coastTransform.xy)/coastTransform.zw; if(texture2D(coastDistance,uv).b>0.5)discard;float alpha=pow(sin(vUv.x*3.14159265),2.0)*pow(sin(vUv.y*3.14159265),2.0)*0.18;gl_FragColor=vec4(flowColor,alpha);\n#include <colorspace_fragment>\n}`
    });
    const geometry = new PlaneGeometry(1, 1); geometry.rotateX(-Math.PI / 2);
    this.mesh = new InstancedMesh(geometry, material, 40); this.mesh.frustumCulled = false; this.mesh.renderOrder = 2; scene.add(this.mesh);
  }
  update(seconds: number, count: number, ready: boolean) {
    this.mesh.visible = count > 0 && ready; this.mesh.count = count;
    for (let i = 0; i < count; i++) { const route = this.curves[i % 2]!, phase = ((Math.floor(i / 2) / Math.ceil(count / 2) + seconds / 1600) % 1); route.getPointAt(phase, this.position); const tangent = route.getTangentAt(phase); this.rotation.setFromAxisAngle(this.up, -Math.atan2(tangent.z, tangent.x)); this.scale.set(85, 1, 5); this.matrix.compose(this.position, this.rotation, this.scale); this.mesh.setMatrixAt(i, this.matrix); }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  dispose() { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); (this.mesh.material as ShaderMaterial).dispose(); }
}
