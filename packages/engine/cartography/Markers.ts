import {BoxGeometry,ConeGeometry,CylinderGeometry,SphereGeometry,TorusGeometry,InstancedMesh,MeshPhysicalMaterial,ShaderMaterial,Color,Matrix4,Quaternion,Vector3,AmbientLight,DirectionalLight,Scene,Mesh,MeshBasicMaterial,BackSide,PMREMGenerator} from 'three';
import type {BufferGeometry,WebGLRenderer} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Site} from '@witlu/core/places';
import type {TerrainManager} from '../terrain/TerrainManager';
import type {MapCamera} from '../camera/MapCamera';
import type {Quality} from '../Quality';
import {project} from '../terrain/geo';
export class Markers {
 private groups=new Map<Site['kind'],InstancedMesh>();private sites:Site[]=[];private start=0;private matrix=new Matrix4();private light:AmbientLight;private sun:DirectionalLight;private env;private generator;private physical:MeshPhysicalMaterial;private cheap:ShaderMaterial;private rings:InstancedMesh;
 visibleIds:Set<string>|null=null;readonly bytes:number;
 constructor(private scene:Scene,renderer:WebGLRenderer,gold:string,blue:string){
  const envScene=new Scene();envScene.add(new Mesh(new SphereGeometry(10,16,8),new MeshBasicMaterial({color:blue,side:BackSide})));const highlight=new Mesh(new BoxGeometry(8,2,2),new MeshBasicMaterial({color:gold}));highlight.position.set(0,5,0);envScene.add(highlight);this.generator=new PMREMGenerator(renderer);this.env=this.generator.fromScene(envScene,0,.1,100);for(const o of envScene.children){const mesh=o as Mesh;mesh.geometry.dispose();(mesh.material as MeshBasicMaterial).dispose();}
  this.physical=new MeshPhysicalMaterial({color:gold,transmission:.7,thickness:.8,roughness:.18,metalness:.08,ior:1.45,envMap:this.env.texture,envMapIntensity:1.2,transparent:true,opacity:.92,depthWrite:false});
  this.cheap=new ShaderMaterial({transparent:true,depthWrite:false,uniforms:{tint:{value:new Color(gold)},shine:{value:new Color(blue)}},vertexShader:'varying vec3 vNormal;void main(){vNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 tint;uniform vec3 shine;varying vec3 vNormal;void main(){float rim=pow(1.-abs(vNormal.z),2.);gl_FragColor=vec4(mix(tint*.5,shine,rim*.7)+tint*max(0.,vNormal.y)*.3,.65+rim*.3);\n#include <colorspace_fragment>\n}'});
  const box=(x:number,y:number,z:number,px=0,py=0)=>new BoxGeometry(x,y,z).translate(px,py,0);
  const shapes:Record<Site['kind'],BufferGeometry[]>={seal:[box(1,.65,1,0,.35),new SphereGeometry(.22,8,6).translate(0,.85,0)],gate:[box(.26,1.2,.5,-.42,.6),box(.26,1.2,.5,.42,.6),box(1.3,.22,.75,0,1.25),new ConeGeometry(.9,.35,4).rotateY(Math.PI/4).translate(0,1.5,0)],battle:[box(.1,1.8,.1).rotateZ(.65),box(.1,1.8,.1).rotateZ(-.65),new ConeGeometry(.25,.5,3).rotateZ(.65).translate(-.6,.8,0),new ConeGeometry(.25,.5,3).rotateZ(-.65).translate(.6,.8,0)],scroll:[box(.8,.9,.12,0,.55),new CylinderGeometry(.12,.12,1.15,8).rotateZ(Math.PI/2).translate(0,1,0),new CylinderGeometry(.12,.12,1.15,8).rotateZ(Math.PI/2).translate(0,.1,0)],bead:[new SphereGeometry(.48,12,8).translate(0,.5,0)],lantern:[new SphereGeometry(.5,10,8).scale(.8,1.1,.8).translate(0,.7,0),box(.6,.12,.6,0,1.25),box(.12,.35,.12,0,.05)]};
  let bytes=0;for(const [kind,parts]of Object.entries(shapes)){const geo=mergeGeometries(parts.map(g=>g.toNonIndexed()));for(const a of Object.values(geo.attributes))bytes+=a.array.byteLength;parts.forEach(g=>g.dispose());const mesh=new InstancedMesh(geo,this.cheap,512);mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=6;scene.add(mesh);this.groups.set(kind as Site['kind'],mesh);}this.bytes=bytes;
  this.rings=new InstancedMesh(new TorusGeometry(.75,.035,4,24).rotateX(Math.PI/2),this.cheap,512);this.rings.count=0;this.rings.frustumCulled=false;scene.add(this.rings);
  this.light=new AmbientLight(blue,2);this.sun=new DirectionalLight(gold,2);this.sun.position.set(-2000,6000,1000);scene.add(this.light,this.sun);
 }
 set(sites:Site[],now:number){this.sites=sites.slice(0,512);this.start=now;this.visibleIds=null;}
 update(now:number,camera:MapCamera,terrain:TerrainManager,quality:Quality,reduced:boolean,enabled:boolean,bloom=true){const age=(now-this.start)/1000,spring=reduced?1:1-Math.exp(-age*6)*Math.cos(age*10),scale=Math.max(3,camera.pose.distance/camera.height*11);const counts=new Map<Site['kind'],number>();let rings=0;
 for(const mesh of this.groups.values()){mesh.material=quality!=='eco'?this.physical:this.cheap;mesh.visible=enabled;}
 for(const site of this.sites){if(this.visibleIds&&!this.visibleIds.has(site.id)&&site.priority<90)continue;const mesh=this.groups.get(site.kind)!,index=counts.get(site.kind)??0,p=project(...site.coord);this.matrix.compose(new Vector3(p.x,terrain.heightAt(p.x,p.z)+2,p.z),new Quaternion(),new Vector3(scale,scale,scale).multiplyScalar(Math.max(.01,spring)*(site.id.startsWith('demo:')?2:1)));mesh.setMatrixAt(index,this.matrix);counts.set(site.kind,index+1);if(age<1.4&&!reduced&&bloom){this.matrix.compose(new Vector3(p.x,terrain.heightAt(p.x,p.z)+3,p.z),new Quaternion(),new Vector3(scale,scale,scale).multiplyScalar(1+age*2));this.rings.setMatrixAt(rings++,this.matrix);}}
 for(const [kind,mesh]of this.groups){mesh.count=counts.get(kind)??0;mesh.instanceMatrix.needsUpdate=true;}this.rings.visible=enabled;this.rings.count=rings;this.rings.instanceMatrix.needsUpdate=true;
 }
 stats(){return {instances:this.sites.length,geometryBytes:this.bytes,material:this.groups.get('seal')?.material===this.physical?'transmission':'shader'};}
 dispose(){for(const mesh of [...this.groups.values(),this.rings]){mesh.removeFromParent();mesh.geometry.dispose();}this.physical.dispose();this.cheap.dispose();this.env.dispose();this.generator.dispose();this.light.removeFromParent();this.sun.removeFromParent();}
}
