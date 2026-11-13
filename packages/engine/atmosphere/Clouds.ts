import { InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, Vector3, Vector4 } from 'three';
import type { IUniform, PerspectiveCamera, Scene } from 'three';
import { cloudCohorts, cloudFade } from './model';
import type { EnvironmentEffects } from './model';
export class Clouds {
  readonly mesh: InstancedMesh;
  private matrix = new Matrix4(); private position = new Vector3(); private scale = new Vector3(); private rotation = new Quaternion();
  private anchors = new Map<number, { x: number; z: number }>();
  private alpha = new Float32Array(24); private alphaAttribute: InstancedBufferAttribute;
  constructor(private uniforms: Record<string, IUniform>, scene: Scene) {
    const geometry = new PlaneGeometry(1, 1); this.alphaAttribute = new InstancedBufferAttribute(this.alpha, 1); geometry.setAttribute('cloudAlpha', this.alphaAttribute);
    const material = new ShaderMaterial({ transparent: true, depthWrite: false, uniforms,
      vertexShader: `attribute float cloudAlpha; varying vec2 vUv; varying float vAlpha; void main(){vUv=uv;vAlpha=cloudAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform sampler2D cloudCoverage; uniform vec3 cloudColor; varying vec2 vUv; varying float vAlpha; void main(){ float density=texture2D(cloudCoverage,vUv).r; float alpha=min(0.35,density*vAlpha); if(alpha<0.001) discard; gl_FragColor=vec4(cloudColor,alpha); #include <colorspace_fragment> }`.replace(' #include', '\n#include').replace('> }', '>\n}')
    });
    this.mesh = new InstancedMesh(geometry, material, 24); this.mesh.frustumCulled = false; this.mesh.renderOrder = 4; this.mesh.count = 0; scene.add(this.mesh);
  }
  update(time: number, distance: number, anchor: { x: number; z: number }, camera: PerspectiveCamera, effects: EnvironmentEffects, layers: number, limit: number, enabled: boolean) {
    const cohorts = cloudCohorts(time, limit), fade = cloudFade(distance), data = this.uniforms.cloudData!.value as Vector4[], details = this.uniforms.cloudDetails!.value as Vector4[];
    const storm=(this.uniforms.weatherStorm?.value??0) as number;
    if(storm>0){if(cohorts.length>=limit)cohorts.pop();cohorts.push({id:-999,age:0,offsetX:-300,offsetZ:-1700+Math.min(1,((this.uniforms.weatherTime?.value??0) as number)/3)*1000,alpha:storm*.25});}
    const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion), up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    (this.uniforms.cloudBasis!.value as Vector4).set(right.x, right.z, up.x, up.z);
    this.uniforms.cloudVisibility!.value = fade; this.uniforms.cloudCount!.value = enabled && effects.clouds ? cohorts.length : 0;
    let instance = 0;
    for (let i = 0; i < cohorts.length; i++) {
      const cloud = cohorts[i]!; if (!this.anchors.has(cloud.id)) this.anchors.set(cloud.id, { ...anchor }); const origin = this.anchors.get(cloud.id)!;
      const x = origin.x + cloud.offsetX, z = origin.z + cloud.offsetZ, altitude = 110 + (Math.abs(cloud.id) % 3) * 25, width = 1100, height = 540;
      data[i]!.set(x, z, width, cloud.alpha); details[i]!.set(altitude, height, 0, 0);
      for (let layer = 0; layer < layers; layer++) {
        this.position.set(x, altitude + layer * 12, z); this.scale.set(width * (1 - layer * .035), height * (1 - layer * .04), 1); this.rotation.copy(camera.quaternion);
        // Even complete overlap of every sprite stays below the 35% budget.
        const opacityBudget = 1 - Math.pow(1 - .35, 1 / Math.max(1, limit * layers));
        this.matrix.compose(this.position, this.rotation, this.scale); this.mesh.setMatrixAt(instance, this.matrix); this.alpha[instance] = Math.min(cloud.alpha / layers, opacityBudget) * fade; instance++;
      }
    }
    const active = new Set(cohorts.map(c => c.id)); for (const id of this.anchors.keys()) if (!active.has(id)) this.anchors.delete(id);
    this.mesh.count = instance; this.mesh.visible = enabled && effects.clouds && fade > 0; this.mesh.instanceMatrix.needsUpdate = true; this.alphaAttribute.needsUpdate = true;
  }
  dispose() { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); (this.mesh.material as ShaderMaterial).dispose(); }
}
