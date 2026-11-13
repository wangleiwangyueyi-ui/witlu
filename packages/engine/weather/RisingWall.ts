import {BufferGeometry,Color,DoubleSide,Float32BufferAttribute,Mesh,ShaderMaterial} from 'three';
import type {Scene} from 'three';
import type {TerrainManager} from '../terrain/TerrainManager';
import {project} from '../terrain/geo';
/** Illustrative extruded wall follows the unmodified upstream Qin corridor. */
export class RisingWall {
  private mesh:Mesh<BufferGeometry,ShaderMaterial>;private built=false;
  constructor(scene:Scene,gold:string){
    this.mesh=new Mesh(new BufferGeometry(),new ShaderMaterial({transparent:true,side:DoubleSide,uniforms:{rise:{value:0},opacity:{value:0},tint:{value:new Color(gold)}},vertexShader:`attribute float crest;uniform float rise;varying float vCrest;void main(){vCrest=crest;vec3 p=position;p.y+=crest*rise;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform vec3 tint;uniform float opacity;varying float vCrest;void main(){gl_FragColor=vec4(tint*mix(.45,1.,vCrest),opacity);\n#include <colorspace_fragment>\n}`}));this.mesh.visible=false;this.mesh.frustumCulled=false;scene.add(this.mesh);
  }
  update(active:boolean,seconds:number,strength:number,lines:[number,number][][],terrain:TerrainManager){
    this.mesh.visible=active;if(!active)return;
    if(!this.built&&lines.length){const positions:number[]=[],crests:number[]=[],indices:number[]=[];
      for(const line of lines)for(let i=1;i<line.length;i++){
        const a=project(...line[i-1]!),b=project(...line[i]!),length=Math.max(1,Math.hypot(b.x-a.x,b.z-a.z)),nx=-(b.z-a.z)/length*3,nz=(b.x-a.x)/length*3,offset=crests.length;
        for(const top of [0,1])for(const [p,sign]of [[a,-1],[b,-1],[b,1],[a,1]]as const){positions.push(p.x+nx*sign,terrain.heightAt(p.x,p.z)+2,p.z+nz*sign);crests.push(top);}
        for(const face of [[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]])indices.push(offset+face[0]!,offset+face[1]!,offset+face[2]!,offset+face[0]!,offset+face[2]!,offset+face[3]!);
      }
      this.mesh.geometry.setAttribute('position',new Float32BufferAttribute(positions,3));this.mesh.geometry.setAttribute('crest',new Float32BufferAttribute(crests,1));this.mesh.geometry.setIndex(indices);this.built=true;
    }
    this.mesh.material.uniforms.rise!.value=Math.max(0,Math.min(1,(seconds-7)/1.2))*18;this.mesh.material.uniforms.opacity!.value=strength*.65;
  }
  dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.material.dispose();}
  warmMesh(){const mesh=this.mesh.clone();mesh.visible=true;return mesh;}
}
