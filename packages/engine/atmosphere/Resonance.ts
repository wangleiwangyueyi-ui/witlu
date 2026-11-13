import { BufferGeometry, Color, Float32BufferAttribute, Group, Line, LineBasicMaterial, Mesh, RingGeometry, ShaderMaterial, Vector3 } from 'three';
import type { Scene } from 'three';
import type { TerrainManager } from '../terrain/TerrainManager';
import { project } from '../terrain/geo';
import type { Quality } from '../Quality';
/** B14: all same-year sites, brief rings and links. No text or platform APIs. */
export class Resonance {
  enabled = true; private group = new Group(); private elapsed = 2000; private sites: [number, number][] = [];
  private material: ShaderMaterial; private lines: Line[] = [];
  constructor(scene: Scene, private terrain: TerrainManager, private color: string) {
    this.material = new ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { tint: { value: new Color(color) }, alpha: { value: 0 } }, vertexShader: 'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'uniform vec3 tint;uniform float alpha;void main(){gl_FragColor=vec4(tint,alpha);\n#include <colorspace_fragment>\n}' });
    scene.add(this.group); this.group.renderOrder = 7;
  }
  trigger(sites: [number, number][]) {
    this.clear(); this.sites = sites; this.elapsed = 0;
    for (const coord of sites) {
      const p = project(...coord), ring = new Mesh(new RingGeometry(25, 29, 48), this.material);
      ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, this.terrain.heightAt(p.x, p.z) + 5, p.z); ring.frustumCulled = false; this.group.add(ring);
    }
    // A connected tree links every site without quadratic geometry or visual clutter.
    for (let i = 1; i < sites.length; i++) {
      const a = project(...sites[i - 1]!), b = project(...sites[i]!); const points = Array.from({ length: 25 }, (_, j) => {
        const t = j / 24, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        return new Vector3(x, this.terrain.heightAt(x, z) + 5 + Math.sin(t * Math.PI) * 45, z);
      });
      const line = new Line(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(points.flatMap(v => [v.x, v.y, v.z]), 3)), new LineBasicMaterial({ color: this.color, transparent: true, opacity: .2, depthWrite: false }));
      this.lines.push(line); this.group.add(line);
    }
  }
  update(dt: number, quality: Quality, reduced: boolean) {
    this.elapsed += Math.max(0, dt); const t = Math.min(1, this.elapsed / 1800);
    this.group.visible = this.enabled && !reduced && t < 1 && this.sites.length > 1;
    this.material.uniforms.alpha!.value = Math.sin(Math.PI * t) * (quality === 'eco' ? .4 : .7);
    for (const child of this.group.children) if (child instanceof Mesh) child.scale.setScalar(1 + t * 3);
    for (const line of this.lines) { (line.material as LineBasicMaterial).opacity = Math.sin(Math.PI * t) * .22; line.visible = quality !== 'eco'; }
  }
  stats() { return { sites: this.sites.length, active: this.group.visible, elapsed: this.elapsed, enabled: this.enabled }; }
  private clear() { for (const child of [...this.group.children]) { if (child instanceof Mesh || child instanceof Line) child.geometry.dispose(); if (child instanceof Line) (child.material as LineBasicMaterial).dispose(); child.removeFromParent(); } this.lines = []; }
  dispose() { this.clear(); this.material.dispose(); this.group.removeFromParent(); }
}
