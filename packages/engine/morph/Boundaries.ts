import { BufferGeometry, Color, Float32BufferAttribute, Mesh, ShaderMaterial, Vector2 } from 'three';
import type { Scene, WebGLRenderer } from 'three';
import type { PolityGeometry, PolityColor } from './types';
import type { TerrainManager } from '../terrain/TerrainManager';
import { project } from '../terrain/geo';
import { rings } from './Rasterizer';
export class Boundaries {
    readonly mesh: Mesh;
    private points: Float32Array;
    private lastTerrain = '';
    constructor(data: PolityGeometry, styles: PolityColor[], private terrain: TerrainManager, scene: Scene, white: string, cinnabar: string) {
        const start: number[] = [], end: number[] = [], side: number[] = [], along: number[] = [], colors: number[] = [], weight: number[] = [], distance: number[] = [];
        for (const f of data.features) {
            const style = styles.find(s => s.polityId === f.properties.polityId);
            if (!style)
                continue;
            const color = new Color(style.color);
            for (const polygon of rings(f))
                for (const ring of polygon) {
                    let path = 0;
                    for (let i = 1; i < ring.length; i++) {
                        const a = project(ring[i - 1]![0]!, ring[i - 1]![1]!), b = project(ring[i]![0]!, ring[i]![1]!), length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(1, Math.ceil(length / 8));
                        for (let step = 0; step < steps; step++) {
                            const ax = a.x + (b.x - a.x) * step / steps, az = a.z + (b.z - a.z) * step / steps, bx = a.x + (b.x - a.x) * (step + 1) / steps, bz = a.z + (b.z - a.z) * (step + 1) / steps;
                            for (const [u, v] of [[0, -1], [0, 1], [1, -1], [1, -1], [0, 1], [1, 1]]) {
                                start.push(ax, 0, az);
                                end.push(bx, 0, bz);
                                along.push(u!);
                                side.push(v!);
                                colors.push(color.r, color.g, color.b);
                                weight.push(style.role === 'neighbor' ? .35 : style.role === 'main' ? 1 : .8);
                                distance.push(path + length * (step + u!) / steps);
                            }
                        }
                        path += length;
                    }
                }
        }
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(start, 3));
        geometry.setAttribute('other', new Float32BufferAttribute(end, 3));
        geometry.setAttribute('side', new Float32BufferAttribute(side, 1));
        geometry.setAttribute('along', new Float32BufferAttribute(along, 1));
        geometry.setAttribute('lineColor', new Float32BufferAttribute(colors, 3));
        geometry.setAttribute('weight', new Float32BufferAttribute(weight, 1));
        geometry.setAttribute('distanceAlong', new Float32BufferAttribute(distance, 1));
        this.points = geometry.getAttribute('position').array as Float32Array;
        const material = new ShaderMaterial({ side: 2, transparent: true, depthWrite: false, uniforms: { resolution: { value: new Vector2(1440, 900) }, opacity: { value: 0 }, glow: { value: 1 }, trail: { value: 0 }, white: { value: new Color(white) }, cinnabar: { value: new Color(cinnabar) } },
            vertexShader: `attribute vec3 other;attribute float side;attribute float along;attribute vec3 lineColor;attribute float weight;attribute float distanceAlong;uniform vec2 resolution;varying float vSide;varying vec3 vColor;varying float vWeight;varying float vDistance;void main(){vec4 a=projectionMatrix*modelViewMatrix*vec4(position,1.0),b=projectionMatrix*modelViewMatrix*vec4(other,1.0);vec2 delta=(b.xy/b.w-a.xy/a.w)*resolution;vec2 n=length(delta)>.001?normalize(vec2(-delta.y,delta.x)):vec2(0.0,1.0);vec4 p=mix(a,b,along);p.xy+=n*side*8.0/resolution*p.w;gl_Position=p;vSide=side;vColor=lineColor;vWeight=weight;vDistance=distanceAlong;}`,
            fragmentShader: `uniform float opacity;uniform float glow;uniform float trail;uniform vec3 white;uniform vec3 cinnabar;varying float vSide;varying vec3 vColor;varying float vWeight;varying float vDistance;void main(){float px=abs(vSide)*4.0,core=1.0-smoothstep(.55,.85,px),halo=exp(-px*px*.28)*.26*glow;float dash=trail>.5?step(.4,fract(vDistance/65.0)):1.0;vec3 color=trail>.5?cinnabar:mix(vColor,white,(1.0-smoothstep(.18,.4,px))*.65*step(.5,vWeight));gl_FragColor=vec4(color,max(core,halo)*opacity*vWeight*dash);\n#include <colorspace_fragment>\n}` });
        this.mesh = new Mesh(geometry, material);
        this.mesh.frustumCulled = false;
        this.mesh.renderOrder = 5;
        scene.add(this.mesh);
    }
    update(renderer: WebGLRenderer, opacity: number, glow: boolean, trail = false) {
        const material = this.mesh.material as ShaderMaterial;
        material.uniforms.opacity!.value = opacity;
        material.uniforms.glow!.value = Number(glow);
        material.uniforms.trail!.value = Number(trail);
        renderer.getSize(material.uniforms.resolution!.value as Vector2);
        this.mesh.visible = opacity > .001;
        const signature = String(this.terrain.effects.displacement) + this.terrain.visible.map(t => `${t.id.z}/${t.id.x}/${t.id.y}`).join(',');
        if (signature === this.lastTerrain)
            return;
        this.lastTerrain = signature;
        const other = this.mesh.geometry.getAttribute('other');
        for (let i = 0; i < this.points.length; i += 3) {
            this.points[i + 1] = this.terrain.heightAt(this.points[i]!, this.points[i + 2]!) + .35;
            other.setY(i / 3, this.terrain.heightAt(other.getX(i / 3), other.getZ(i / 3)) + .35);
        }
        this.mesh.geometry.getAttribute('position').needsUpdate = true;
        other.needsUpdate = true;
    }
    dispose() { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); (this.mesh.material as ShaderMaterial).dispose(); }
}
