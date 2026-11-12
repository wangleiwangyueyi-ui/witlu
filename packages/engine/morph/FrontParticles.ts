import { BufferGeometry, Color, Float32BufferAttribute, Points, ShaderMaterial } from 'three';
import type { IUniform, Scene } from 'three';
import type { TerrainManager } from '../terrain/TerrainManager';
import { nw, se } from './Rasterizer';
export class FrontParticles {
    private mesh: Points;
    constructor(seeds: Float32Array, shared: Record<string, IUniform>, scene: Scene, color: string, terrain: TerrainManager) { const positions: number[] = [], crossings: number[] = [], sides: number[] = [], random: number[] = []; for (let i = 0; i < seeds.length; i += 4) {
        const x = nw.x + seeds[i]! * (se.x - nw.x), z = se.z - seeds[i + 1]! * (se.z - nw.z);
        positions.push(x, terrain.heightAt(x, z) + 3, z);
        crossings.push(seeds[i + 2]!);
        sides.push(seeds[i + 3]!);
        random.push(((i * 1664525 + 1013904223) >>> 0) / 4294967296);
    } const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setAttribute('crossing', new Float32BufferAttribute(crossings, 1)); geometry.setAttribute('originSide', new Float32BufferAttribute(sides, 1)); geometry.setAttribute('randomValue', new Float32BufferAttribute(random, 1)); const material = new ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { ...shared, particleColor: { value: new Color(color) } }, vertexShader: `attribute float crossing;attribute float originSide;attribute float randomValue;uniform float territoryProgress;uniform float particleEnabled;uniform float particleRatio;varying float vAlpha;void main(){float p=originSide>.5?1.0-territoryProgress:territoryProgress;float age=(p-crossing)*1.4;float life=clamp(age/0.42,0.0,1.0);vAlpha=particleEnabled*step(randomValue,particleRatio)*step(0.0,age)*(1.0-life)*sin(life*3.14159);vec3 point=position+vec3(life*75.0,life*(22.0+randomValue*45.0),-life*30.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(point,1.0);gl_PointSize=2.0+randomValue*2.0;}`, fragmentShader: `uniform vec3 particleColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5)*2.0;gl_FragColor=vec4(particleColor,vAlpha*(1.0-smoothstep(.1,1.0,d))*.5);\n#include <colorspace_fragment>\n}` }); this.mesh = new Points(geometry, material); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; scene.add(this.mesh); }
    dispose() { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); (this.mesh.material as ShaderMaterial).dispose(); }
}
