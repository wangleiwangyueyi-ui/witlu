import { Color, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from 'three';
import type { Scene } from 'three';
import { WEATHER_BUDGET } from '@witlu/core/weather';
import type { ParticleKind } from '@witlu/core/weather';
import type { MapCamera } from '../camera/MapCamera';
const kinds:ParticleKind[]=['rain','snow','petals','dust','sparks','smoke'];
export class WeatherParticles {
  private meshes:Mesh<InstancedBufferGeometry,ShaderMaterial>[]=[];
  constructor(scene:Scene,blue:string,gold:string,fire:string,smoke:string){
    kinds.forEach((kind,index)=>{
      const geometry=new InstancedBufferGeometry(),quad=new PlaneGeometry(1,1);geometry.index=quad.index;geometry.attributes=quad.attributes;
      const seeds=new Float32Array(WEATHER_BUDGET.ultra[kind]*4);let seed=1729+index;
      for(let i=0;i<seeds.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;seeds[i]=seed/4294967296;}
      geometry.setAttribute('seed',new InstancedBufferAttribute(seeds,4));geometry.instanceCount=0;
      const material=new ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},anchor:{value:new Vector3()},focus:{value:new Vector3()},span:{value:3000},viewport:{value:new Vector2(1440,900)},kind:{value:index},tint:{value:new Color(index===3?gold:index===4?fire:index===5?smoke:blue)},strength:{value:0}},
        vertexShader:`attribute vec4 seed;uniform float time;uniform vec3 anchor;uniform vec3 focus;uniform float span;uniform vec2 viewport;uniform float kind;varying vec2 vUv;varying float vAlpha;
        void main(){vUv=uv;float speed=kind<.5?.75:kind<2.5?.045:.08;float life=fract(seed.y+time*speed);vec3 p=anchor+vec3((seed.x-.5)*span*2.5,(1.-life)*span*.6,(seed.z-.5)*span*1.5);p.x+=sin(time*.6+seed.w*30.)*span*.015;
        if(kind>3.5){p=focus+vec3((seed.x-.5)*span*.16,life*span*(kind>4.5?.2:.08),(seed.z-.5)*span*.1);}
        vec4 mv=viewMatrix*vec4(p,1.);float px=kind<.5?1.:kind<1.5?2.:kind<2.5?3.:kind<3.5?1.5:kind<4.5?2.:36.;vec2 size=vec2(px,kind<.5?12.:px);vec2 q=position.xy;if(kind>1.5&&kind<2.5){float a=time+seed.w*6.28;q=mat2(cos(a),-sin(a),sin(a),cos(a))*q;}
        gl_Position=projectionMatrix*mv;gl_Position.xy+=q*size*2./viewport*gl_Position.w;vAlpha=smoothstep(0.,.08,life)*(1.-smoothstep(.75,1.,life));}`,
        fragmentShader:`uniform vec3 tint;uniform float kind;uniform float strength;varying vec2 vUv;varying float vAlpha;void main(){vec2 p=vUv*2.-1.;float a=1.-smoothstep(.1,1.,length(p));if(kind<.5)a=(1.-abs(p.x))*(1.-abs(p.y));if(kind>1.5&&kind<2.5)a*=.6+.4*cos(p.x*5.);float opacity=kind>4.5?.1:kind<.5?.19:.42;gl_FragColor=vec4(tint,a*vAlpha*opacity*strength);\n#include <colorspace_fragment>\n}`});
      const mesh=new Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=8;scene.add(mesh);this.meshes.push(mesh);
    });
  }
  update(time:number,counts:Record<ParticleKind,number>,camera:MapCamera,anchor:Vector3,focus:Vector3,strength:number){
    this.meshes.forEach((mesh,i)=>{mesh.geometry.instanceCount=counts[kinds[i]!]!;mesh.visible=mesh.geometry.instanceCount>0;const u=mesh.material.uniforms;u.time!.value=time;u.anchor!.value.copy(anchor);u.focus!.value.copy(focus);u.span!.value=camera.pose.distance;u.viewport!.value.set(camera.width,camera.height);u.strength!.value=strength;});
  }
  dispose(){this.meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();m.material.dispose();});}
  warmMeshes(){return this.meshes.map(m=>{const clone=m.clone();clone.visible=true;return clone;});}
}
