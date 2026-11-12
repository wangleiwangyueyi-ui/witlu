import { BufferGeometry, Color, Float32BufferAttribute, Mesh, NearestFilter, NoBlending, NoColorSpace, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, ShapeUtils, Vector2, Vector4, WebGLRenderTarget } from 'three';
import type { WebGLRenderer } from 'three';
import type { PolityGeometry } from './types';
import { BOUNDS, project } from '../terrain/geo';
export const nw = project(BOUNDS.west, BOUNDS.north), se = project(BOUNDS.east, BOUNDS.south);
export const territoryTransform = new Vector4(nw.x, se.z, se.x - nw.x, se.z - nw.z);
export function territoryUV(lon: number, lat: number) { const p = project(lon, lat); return { x: (p.x - nw.x) / (se.x - nw.x), y: (se.z - p.z) / (se.z - nw.z) }; }
export function rings(feature: PolityGeometry['features'][number]): number[][][][] { return feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates as number[][][]] : feature.geometry.coordinates as number[][][][]; }
export function renderTarget(size: number) { const target = new WebGLRenderTarget(size, size, { depthBuffer: false, stencilBuffer: false, minFilter: NearestFilter, magFilter: NearestFilter }); target.texture.colorSpace = NoColorSpace; target.texture.generateMipmaps = false; return target; }
export class Rasterizer {
    private camera = new OrthographicCamera(nw.x, se.x, -nw.z, -se.z, .1, 100);
    private scene = new Scene();
    constructor(private renderer: WebGLRenderer) { this.camera.position.z = 10; }
    rasterize(data: PolityGeometry, ids: Map<string, number>, size: number) {
        const positions: number[] = [], labels: number[] = [];
        // Stable draw precedence: neighbors below Chinese polities, then source order.
        for (const feature of [...data.features].sort((a, b) => Number(a.properties.role !== 'neighbor') - Number(b.properties.role !== 'neighbor'))) {
            const id = ids.get(feature.properties.polityId);
            if (!id)
                continue;
            for (const polygon of rings(feature)) {
                const projected = polygon.map(ring => ring.slice(0, ring.length > 1 && ring[0]![0] === ring.at(-1)![0] && ring[0]![1] === ring.at(-1)![1] ? -1 : undefined).map(p => { const q = project(p[0]!, p[1]!); return new Vector2(q.x, -q.z); }));
                const contour = projected[0];
                if (!contour || contour.length < 3)
                    continue;
                const points = projected.flat(), triangles = ShapeUtils.triangulateShape(contour, projected.slice(1));
                for (const triangle of triangles)
                    for (const index of triangle) {
                        const p = points[index]!;
                        positions.push(p.x, p.y, 0);
                        labels.push((id & 255) / 255, (id >> 8) / 255);
                    }
            }
        }
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setAttribute('label', new Float32BufferAttribute(labels, 2));
        const material = new ShaderMaterial({ depthTest: false, depthWrite: false, blending: NoBlending, side: 2, vertexShader: 'attribute vec2 label;varying vec2 vLabel;void main(){vLabel=label;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'varying vec2 vLabel;void main(){gl_FragColor=vec4(vLabel,0.0,1.0);}' });
        const mesh = new Mesh(geometry, material);
        mesh.frustumCulled = false;
        this.scene.add(mesh);
        const target = renderTarget(size);
        this.draw(this.scene, this.camera, target);
        mesh.removeFromParent();
        geometry.dispose();
        material.dispose();
        return target;
    }
    draw(scene: Scene, camera: OrthographicCamera, target: WebGLRenderTarget, rect?: {
        x: number;
        y: number;
        width: number;
        height: number;
    }) {
        if (rect && (!rect.width || !rect.height))
            return;
        const previous = this.renderer.getRenderTarget(), color = this.renderer.getClearColor(new Color()), alpha = this.renderer.getClearAlpha(), autoClear = this.renderer.autoClear;
        target.scissorTest = Boolean(rect);
        if (rect)
            target.scissor.set(rect.x, rect.y, rect.width, rect.height);
        this.renderer.setRenderTarget(target);
        this.renderer.autoClear = false;
        this.renderer.setClearColor(0, 0);
        if (!rect)
            this.renderer.clear();
        this.renderer.render(scene, camera);
        this.renderer.setRenderTarget(previous);
        this.renderer.setClearColor(color, alpha);
        this.renderer.autoClear = autoClear;
        target.scissorTest = false;
    }
    async labels(target: WebGLRenderTarget, size: number, active: Set<number>) {
        const small = renderTarget(size), scene = new Scene(), camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1), material = new ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { source: { value: target.texture } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}', fragmentShader: 'uniform sampler2D source;varying vec2 vUv;void main(){gl_FragColor=texture2D(source,vUv);}' }), mesh = new Mesh(new PlaneGeometry(2, 2), material);
        scene.add(mesh);
        this.draw(scene, camera, small);
        const bytes = new Uint8Array(size * size * 4);
        try {
            await this.renderer.readRenderTargetPixelsAsync(small, 0, 0, size, size, bytes);
            const labels = new Uint16Array(size * size);
            for (let i = 0; i < labels.length; i++) {
                const id = bytes[i * 4]! + bytes[i * 4 + 1]! * 256;
                labels[i] = active.has(id) ? id : 0;
            }
            return labels;
        }
        finally {
            small.dispose();
            mesh.geometry.dispose();
            material.dispose();
        }
    }
}
