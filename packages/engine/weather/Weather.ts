import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, LineBasicMaterial, LineSegments, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Vector4 } from 'three';
import { Scene as WarmupScene } from 'three';
import type { IUniform, Scene, WebGLRenderer, PerspectiveCamera } from 'three';
import { WeatherDirector } from '@witlu/core/weather';
import type { WeatherEvent, Story } from '@witlu/core/weather';
import type { Environment } from '../atmosphere/Environment';
import type { MapCamera } from '../camera/MapCamera';
import type { Quality } from '../Quality';
import type { PlatformAdapter } from '../platform/PlatformAdapter';
import type { TerrainManager } from '../terrain/TerrainManager';
import { project } from '../terrain/geo';
import { WeatherParticles } from './Particles';
import { RisingWall } from './RisingWall';
export interface WeatherPalette { blue:string;gold:string;fire:string;smoke:string }
export interface WeatherAudio {rain:number;wind:number;waves:number;thunder:boolean;delay:number;quiet:boolean}
export class Weather {
  readonly director=new WeatherDirector(); readonly uniforms:Record<string,IUniform>;
  onAudio:((cue:WeatherAudio)=>void)|null=null;
  private particles:WeatherParticles;private bolts:LineSegments<BufferGeometry,LineBasicMaterial>;private beams:Mesh<PlaneGeometry,ShaderMaterial>;
  private wall:RisingWall;private surface:Mesh<PlaneGeometry,ShaderMaterial>;
  private baseSky:Color;private baseHorizon:Color;private baseCloud:Color;private blue:Color;private gold:Color;
  private state=this.director.sample(0,'high');private now=0;private visualTime=0;private flashed=false;private flashAt=-Infinity;private flashes=0;private lastAudio=-Infinity;private disposed=false;
  private rivers:[number,number][][]=[];private walls:[number,number][][]=[];private focus=new Vector3();private riverKey='';
  error:string|null=null;ready=false;
  constructor(private platform:PlatformAdapter,scene:Scene,private environment:Environment,palette:WeatherPalette){
    this.baseSky=environment.uniforms.skyColor!.value.clone();this.baseHorizon=environment.uniforms.horizonColor!.value.clone();this.baseCloud=environment.uniforms.cloudColor!.value.clone();this.blue=new Color(palette.blue);this.gold=new Color(palette.gold);
    this.uniforms={weatherStorm:{value:0},weatherRain:{value:0},weatherTime:{value:0},weatherFlash:{value:0},weatherSorrow:{value:0},weatherFlood:{value:0},weatherFire:{value:0},weatherBlue:{value:this.blue},weatherGold:{value:this.gold},weatherFocus:{value:new Vector3()},weatherRiver:{value:Array.from({length:32},()=>new Vector4())},weatherRiverCount:{value:0}};
    Object.assign(environment.uniforms,this.uniforms);
    this.particles=new WeatherParticles(scene,palette.blue,palette.gold,palette.fire,palette.smoke);
    this.bolts=new LineSegments(new BufferGeometry(),new LineBasicMaterial({color:palette.blue,transparent:true,opacity:0,depthWrite:false,blending:AdditiveBlending}));this.bolts.frustumCulled=false;this.bolts.renderOrder=9;scene.add(this.bolts);
    this.wall=new RisingWall(scene,palette.gold);
    this.beams=new Mesh(new PlaneGeometry(2,2),new ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{...environment.uniforms,amount:{value:0},samples:{value:8},source:{value:new Vector2(.62,.94)}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.99,1.);}`,fragmentShader:`varying vec2 vUv;uniform sampler2D cloudCoverage;uniform float amount;uniform int samples;uniform float weatherTime;uniform vec3 weatherGold;uniform vec2 source;void main(){vec2 delta=(source-vUv)*.055;vec2 p=vUv;float rays=0.;for(int i=0;i<16;i++){if(i>=samples)break;p+=delta;float mask=1.-texture2D(cloudCoverage,p*2.+vec2(weatherTime*.008,0.)).r;rays+=mask*(.5+.5*sin(atan(p.y-source.y,p.x-source.x)*38.));}rays/=max(1.,float(samples));float fade=1.-smoothstep(.05,1.1,distance(vUv,source));gl_FragColor=vec4(weatherGold,amount*rays*fade*.095);\n#include <colorspace_fragment>\n}`}));this.beams.frustumCulled=false;this.beams.renderOrder=10;scene.add(this.beams);
    this.surface=new Mesh(new PlaneGeometry(1,1),new ShaderMaterial({transparent:true,depthWrite:false,uniforms:{...this.uniforms,amount:{value:0},capital:{value:0},fireTint:{value:new Color(palette.fire)}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float weatherTime;uniform vec3 weatherGold;uniform vec3 fireTint;uniform float amount;uniform float capital;void main(){vec2 p=vUv*2.-1.;float edge=1.-smoothstep(.2,1.,length(p));float flicker=.6+.4*sin(p.x*28.+weatherTime*9.+sin(p.y*17.-weatherTime*4.));float flame=pow(max(0.,1.-abs(p.x)),.5)*(1.-smoothstep(-.5,.9,p.y+sin(p.x*30.+weatherTime*4.)*.16));gl_FragColor=vec4(mix(fireTint,weatherGold,capital),amount*edge*mix(flame*flicker,.32,capital));\n#include <colorspace_fragment>\n}`}));this.surface.renderOrder=7;scene.add(this.surface);
    void this.load();
  }
  private async load(){try{const [r,c]=await Promise.all([this.platform.readJSON<{rivers:{lines:[number,number][][]}[]}>('/data/rivers.json'),this.platform.readJSON<{key:string;segments:[number,number][][]}[]>('/data/corridors.json')]);if(this.disposed)return;this.rivers=r.rivers.flatMap(x=>x.lines);this.walls=c.find(x=>x.key==='wall_qin')?.segments??[];this.ready=true;}catch(e){this.error=String(e);}}
  trigger(event:WeatherEvent,story:Story|null=null){if(!this.director.trigger(event,this.platform.now(),story))return false;this.flashed=false;this.flashAt=-Infinity;this.flashes=0;this.visualTime=0;this.riverKey='';return true;}
  warm(renderer:WebGLRenderer,camera:PerspectiveCamera){const scene=new WarmupScene();for(const mesh of [...this.particles.warmMeshes(),this.wall.warmMesh(),this.bolts.clone(),this.beams.clone(),this.surface.clone()]){mesh.visible=true;scene.add(mesh);}renderer.compile(scene,camera);scene.clear();}
  private makeBolt(focus:Vector3){const points:number[]=[];let seed=71;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const branch=(a:Vector3,b:Vector3,depth:number)=>{if(!depth){points.push(...a.toArray(),...b.toArray());return;}const m=a.clone().lerp(b,.5);m.x+=(rnd()-.5)*a.distanceTo(b)*.22;m.z+=(rnd()-.5)*a.distanceTo(b)*.14;branch(a,m,depth-1);branch(m,b,depth-1);if(depth>2&&rnd()>.4)branch(m,m.clone().add(new Vector3((rnd()-.5)*280,-180,(rnd()-.5)*160)),depth-2);};branch(focus.clone().add(new Vector3(-80,850,-130)),focus,5);this.bolts.geometry.dispose();this.bolts.geometry=new BufferGeometry();this.bolts.geometry.setAttribute('position',new Float32BufferAttribute(points,3));}
  private river(focus:Vector3){const candidates:{a:Vector3;b:Vector3;distance:number}[]=[];for(const line of this.rivers)for(let i=1;i<line.length;i++){const p=project(...line[i-1]!),q=project(...line[i]!),a=new Vector3(p.x,0,p.z),b=new Vector3(q.x,0,q.z);const ab=b.clone().sub(a),t=Math.max(0,Math.min(1,focus.clone().sub(a).dot(ab)/Math.max(1,ab.lengthSq())));const distance=a.clone().addScaledVector(ab,t).distanceTo(focus);if(distance<550)candidates.push({a,b,distance});}candidates.sort((a,b)=>a.distance-b.distance);const values=this.uniforms.weatherRiver!.value as Vector4[];candidates.slice(0,32).forEach((v,i)=>values[i]!.set(v.a.x,v.a.z,v.b.x,v.b.z));this.uniforms.weatherRiverCount!.value=Math.min(32,candidates.length);}
  update(now:number,camera:MapCamera,quality:Quality,terrain:TerrainManager){
    const elapsed=this.now?Math.min(.1,Math.max(0,(now-this.now)/1000)):0;this.now=now;this.director.reduced=this.environment.reducedMotion;const s=this.state=this.director.sample(now,quality),u=this.uniforms;
    if(s.active&&!s.skyOnly)this.visualTime+=elapsed;
    const q=project(...(s.cue?.coord??s.event?.coord??[camera.pose.lon,camera.pose.lat]));this.focus.set(q.x,terrain.heightAt(q.x,q.z)+4,q.z);u.weatherFocus!.value.copy(this.focus);
    const key=`${q.x},${q.z}`;if(s.active&&this.ready&&key!==this.riverKey){this.river(this.focus);this.riverKey=key;}
    u.weatherTime!.value=this.visualTime;u.weatherRain!.value=s.ripples?s.strength*(s.mood==='solemn'?.25:1):0;u.weatherStorm!.value=!s.skyOnly&&s.mood==='sorrow'?s.strength:0;u.weatherSorrow!.value=s.skyOnly?0:s.mood==='sorrow'?s.skyStrength*.4:s.mood==='solemn'?s.skyStrength*.2:0;
    u.weatherFlood!.value=s.flood?s.strength*Math.min(1,Math.max(0,(s.seconds-(s.story==='qin'?2.6:0))/1.2)):0;u.weatherFire!.value=s.fire?s.strength:0;
    const firstFlash=!this.flashed&&!s.skyOnly&&s.mood==='sorrow'&&quality!=='eco'&&this.director.effects.lightning&&s.seconds>=1.5&&s.seconds<3;
    if(firstFlash){this.flashAt=now;this.flashed=true;this.flashes++;this.makeBolt(this.focus);}
    if(s.skyOnly&&s.seconds>=1.5)this.flashed=true;
    s.lightning=!s.skyOnly&&this.director.effects.lightning&&quality!=='eco'&&now-this.flashAt<150;
    u.weatherFlash!.value=s.lightning?.13*Math.sin(Math.max(0,now-this.flashAt)/150*Math.PI):0;
    const sky=this.environment.uniforms.skyColor!.value as Color,horizon=this.environment.uniforms.horizonColor!.value as Color,cloud=this.environment.uniforms.cloudColor!.value as Color;
    sky.copy(this.baseSky);horizon.copy(this.baseHorizon);cloud.copy(this.baseCloud);
    if(s.mood==='sorrow'||s.mood==='solemn'){sky.multiplyScalar(1-s.skyStrength*.3);horizon.lerp(this.baseSky,s.skyStrength*.7);if(!s.skyOnly)cloud.multiplyScalar(1-s.skyStrength*.3);}
    if(s.mood==='glory')horizon.lerp(this.gold,s.skyStrength*.24);
    if(s.mood==='fire')horizon.lerp(this.gold,s.skyStrength*.08);
    cloud.lerp(this.blue,u.weatherFlash!.value as number);horizon.lerp(this.blue,(u.weatherFlash!.value as number)*.35);
    const anchor=project(camera.pose.lon,camera.pose.lat);this.particles.update(this.visualTime,s.particles,camera,new Vector3(anchor.x,0,anchor.z),this.focus,s.strength);
    this.bolts.visible=s.lightning;this.bolts.material.opacity=s.lightning?.6:0;

    this.beams.visible=s.rays>0;this.beams.material.uniforms.amount!.value=s.strength;this.beams.material.uniforms.samples!.value=s.rays;
    this.surface.visible=s.fire||s.capital;this.surface.material.uniforms.amount!.value=s.strength*.5;this.surface.material.uniforms.capital!.value=Number(s.capital);this.surface.position.copy(this.focus);this.surface.position.y+=s.fire?60:20;this.surface.quaternion.copy(camera.camera.quaternion);this.surface.scale.set(s.capital?270:260,s.capital?150:180,1);
    this.wall.update(s.wall,s.seconds,s.strength,this.walls,terrain);
    if(s.shake){const pixels=Math.sin(s.shakePhase*Math.PI*4)*(1-s.shakePhase)*1.2*s.strength,worldPerPixel=camera.pose.distance*2*Math.tan(21*Math.PI/180)/camera.height;camera.camera.position.x+=pixels*worldPerPixel;camera.camera.updateMatrixWorld();}
    if(firstFlash||now-this.lastAudio>100){this.lastAudio=now;this.onAudio?.({rain:s.skyOnly?0:Math.min(1,s.particles.rain/Math.max(1,quality==='ultra'?30000:quality==='high'?8000:2000)),wind:s.skyOnly?0:s.strength*(s.mood==='voyage'?.5:.16),waves:s.skyOnly?0:this.environment.coastalProximity(camera.pose.lon,camera.pose.lat)*Math.min(1,1800/camera.pose.distance),thunder:firstFlash,delay:.8,quiet:s.skyOnly});}
  }
  stats(){return {...this.state,flashes:this.flashes,thunderDelay:.8,ready:this.ready,error:this.error,cooldownMs:Math.max(0,10000-(this.now-this.director.lastTrigger)),riverSegments:this.uniforms.weatherRiverCount!.value as number};}
  dispose(){this.disposed=true;this.particles.dispose();this.wall.dispose();for(const m of [this.bolts,this.beams,this.surface]){m.removeFromParent();m.geometry.dispose();m.material.dispose();}this.onAudio=null;}
}
