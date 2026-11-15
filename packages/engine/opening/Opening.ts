import {Scene,PerspectiveCamera,Mesh,SphereGeometry,ShaderMaterial,Color,DataTexture,RGBAFormat,SRGBColorSpace,Vector3} from 'three';
import type {WebGLRenderer} from 'three';
import type {PlatformAdapter} from '../platform/PlatformAdapter';
import type {Quality} from '../Quality';
/** Standalone globe scene: environment access stays behind PlatformAdapter. */
export class Opening {
 readonly scene=new Scene();readonly camera=new PerspectiveCamera(42,1,.001,30);
 active=false;progress=0;reduced=false;private elapsed=0;private texture:DataTexture|null=null;private disposed=false;
 private globe:Mesh<SphereGeometry,ShaderMaterial>;private clouds:Mesh<SphereGeometry,ShaderMaterial>;
 constructor(private platform:PlatformAdapter,sky:string,light:string){
  this.scene.background=new Color(sky);
  this.globe=new Mesh(new SphereGeometry(1,96,48),new ShaderMaterial({uniforms:{map:{value:null},light:{value:new Color(light)}},vertexShader:'varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D map;uniform vec3 light;varying vec2 vUv;varying vec3 vN;void main(){float n=dot(normalize(vN),normalize(vec3(-.5,.8,-.9)));vec3 c=texture2D(map,vUv).rgb*(.55+.45*max(0.,n));float rim=pow(1.-abs(dot(normalize(vN),normalize(vec3(-.29,.53,-.8)))),3.);gl_FragColor=vec4(c+light*rim*.065,1.);#include <colorspace_fragment> }'.replace(';#',';\n#').replace('> }','>\n}') }));this.scene.add(this.globe);
  this.clouds=new Mesh(new SphereGeometry(1.027,64,32),new ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},tint:{value:new Color(light)}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float time;uniform vec3 tint;varying vec3 p;float h(vec3 q){return fract(sin(dot(q,vec3(17.3,47.7,31.1)))*43758.54);}float n(vec3 q){vec3 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}void main(){vec3 q=p*9.+vec3(time*.02,0,0);float cloud=n(q)*.65+n(q*2.)*.35;gl_FragColor=vec4(tint,smoothstep(.43,.72,cloud)*.3);}' }));this.scene.add(this.clouds);
 }
 async start(reduced=false){this.reduced=reduced;this.elapsed=0;this.progress=0;if(!this.texture){const image=await this.platform.decodeImage(await this.platform.readBytes('/brand/earth.webp'));if(this.disposed)return;this.texture=new DataTexture(image.data,image.width,image.height,RGBAFormat);this.texture.colorSpace=SRGBColorSpace;this.texture.flipY=true;this.texture.needsUpdate=true;this.globe.material.uniforms.map!.value=this.texture;}this.active=true;}
 update(dt:number,quality:Quality){if(!this.active)return;this.elapsed+=Math.min(dt,100);this.progress=Math.min(1,this.elapsed/(this.reduced?1800:7200));const t=this.reduced?0:this.progress,tween=t*t*(3-2*t),lon=(65+45*tween)*Math.PI/180,lat=(18+14*tween)*Math.PI/180,distance=4.3*(1-tween)+1.042*tween;this.camera.position.set(Math.cos(lon)*Math.cos(lat),Math.sin(lat),-Math.sin(lon)*Math.cos(lat)).multiplyScalar(distance);this.camera.lookAt(new Vector3(0,0,0));this.clouds.visible=quality!=='eco'&&!this.reduced;this.clouds.material.uniforms.time!.value=this.elapsed*.001;if(this.progress===1)this.active=false;}
 render(renderer:WebGLRenderer,width:number,height:number){this.camera.aspect=width/height;this.camera.updateProjectionMatrix();renderer.render(this.scene,this.camera);}
 stop(){this.active=false;this.progress=1;}
 dispose(){this.disposed=true;this.globe.geometry.dispose();this.globe.material.dispose();this.clouds.geometry.dispose();this.clouds.material.dispose();this.texture?.dispose();}
}
