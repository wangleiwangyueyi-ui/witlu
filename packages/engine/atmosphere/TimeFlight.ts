import { Color, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import type { IUniform, Scene } from 'three';
import type { MapCamera } from '../camera/MapCamera';
import type { Quality } from '../Quality';
/** A camera rise and descent through the existing self-hosted cloud coverage. */
export class TimeFlight {
    private mesh: Mesh<PlaneGeometry, ShaderMaterial>;
    private elapsed = -1;
    private descended = false;
    private home: MapCamera['pose'] | undefined;
    constructor(scene: Scene, uniforms: Record<string, IUniform>) {
        this.mesh = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
            depthTest: false, depthWrite: false, transparent: true,
            uniforms: { coverage: uniforms.cloudCoverage!, tint: { value: (uniforms.cloudColor!.value as Color).clone() }, passage: { value: 0 }, opacity: { value: 0 } },
            vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
            fragmentShader: `uniform sampler2D coverage;uniform vec3 tint;uniform float passage;uniform float opacity;varying vec2 vUv;
        void main(){vec2 uv=(vUv-.5)*(1.8-passage*.7)+.5+vec2(passage*.16,0.0);
        float density=texture2D(coverage,uv).r;gl_FragColor=vec4(tint,opacity*smoothstep(.05,.8,density));
        #include <colorspace_fragment>
        }`
        }));
        this.mesh.frustumCulled = false;
        this.mesh.renderOrder = 100;
        this.mesh.visible = false;
        scene.add(this.mesh);
    }
    start(camera: MapCamera) {
        const home = this.home ?? camera.pose;
        this.cancel(camera);
        this.home = { ...home };
        this.elapsed = 0;
        this.descended = false;
        camera.flyTo({ distance: Math.min(11000, this.home.distance * 1.55), pitch: 60 }, 650);
    }
    cancel(camera: MapCamera) { if (this.home)
        camera.flyTo(this.home, 240); this.home = undefined; this.elapsed = -1; this.mesh.visible = false; }
    update(dt: number, camera: MapCamera, quality: Quality, reduced: boolean) {
        if (this.elapsed < 0)
            return;
        if (reduced) {
            this.cancel(camera);
            return;
        }
        this.elapsed += Math.min(50, dt);
        const t = Math.min(1, this.elapsed / 1400);
        if (t >= .5 && !this.descended) {
            this.descended = true;
            camera.flyTo(this.home!, 700);
        }
        this.mesh.visible = t < 1;
        this.mesh.material.uniforms.passage!.value = t;
        this.mesh.material.uniforms.opacity!.value = Math.sin(t * Math.PI) * (quality === 'eco' ? .32 : .58);
        if (t === 1) {
            this.elapsed = -1;
            this.home = undefined;
        }
    }
    dispose() { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
