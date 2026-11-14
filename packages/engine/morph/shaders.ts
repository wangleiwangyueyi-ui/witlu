export const resolveVertex = `out vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
export const resolveFragment = `precision highp sampler2DArray;
uniform sampler2DArray fields;uniform sampler2D labelsA;uniform sampler2D labelsB;uniform sampler2D palette;
uniform float progress;uniform int count;uniform float ids[96];in vec2 vUv;out vec4 outputColor;
float decode(vec2 rg){return floor(rg.r*255.0+.5)+floor(rg.g*255.0+.5)*256.0;}
float participating(float id){return texture(palette,vec2((id+.5)/1024.0,.875)).r>.5?id:0.0;}
void main(){
  float a=participating(decode(texture(labelsA,vUv).rg)),b=participating(decode(texture(labelsB,vUv).rg));
  float winner=a,front=0.0;
  if(progress>=1.0)winner=b;
  else if(progress>0.0&&a!=b){float best=1e8,second=1e8;
    for(int i=0;i<96;i++){if(i>=count)break;float id=ids[i];if(id==0.0&&a!=0.0&&b!=0.0)continue;vec2 sdf=texture(fields,vec3(vUv,float(i))).rg;float score=mix(sdf.x,sdf.y,progress);if(score<best-.00001){second=best;best=score;winner=id;}else second=min(second,score);}
    // Equal-distance plateaus are possible when capitals coincide. Only light
    // the narrow moving edge, never flood an entire tied region with gold.
    float gap=second-best,width=fwidth(gap);
    front=(1.0-smoothstep(0.0,max(.001,width*1.35),gap))*smoothstep(.015,.12,width);
  }
  outputColor=vec4(mod(winner,256.0)/255.0,floor(winner/256.0)/255.0,front,1.0);
}`;
export const territoryGLSL = /*glsl*/ `
precision highp sampler2DArray;
uniform sampler2DArray territoryFields;
uniform vec3 territoryLens;uniform float territoryLabelSize;uniform float territoryFieldSize;uniform float polityFocus;uniform float territoryEdges;uniform float territoryEnabled;uniform sampler2D polityA;uniform sampler2D polityB;uniform sampler2D polityCurrent;uniform sampler2D polityPalette;
uniform vec4 territoryBounds;uniform float territoryProgress;uniform float territoryCrossfade;uniform float territoryOpacity;uniform float territoryFront;uniform float territoryInk;uniform vec3 territoryGold;
float polityId(vec2 rg){return floor(rg.x*255.0+.5)+floor(rg.y*255.0+.5)*256.0;}
vec4 polityStyle(float id,float row){return texture2D(polityPalette,vec2((id+.5)/1024.0,row));}
// Filter palette colors, never the packed regime IDs. The footprint covers
// one label texel at close range and remains bounded at distant views.
vec4 smoothPolity(sampler2D labels,vec2 uv,float row,float size){
 vec2 p=uv*size-.5,base=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 float a=polityId(texture2D(labels,(base+vec2(.5,.5))/size).rg),b=polityId(texture2D(labels,(base+vec2(1.5,.5))/size).rg),c=polityId(texture2D(labels,(base+vec2(.5,1.5))/size).rg),d=polityId(texture2D(labels,(base+vec2(1.5,1.5))/size).rg);
 if(a==b&&a==c&&a==d)return polityStyle(a,row);
 return mix(mix(polityStyle(a,row),polityStyle(b,row),f.x),mix(polityStyle(c,row),polityStyle(d,row),f.x),f.y);
}
float edgeId(vec2 uv);
vec4 timeStyle(float id){vec4 a=polityStyle(id,.125),b=polityStyle(id,.375);return a.a==0.?b:b.a==0.?a:mix(a,b,territoryProgress);}
// Reconstruct the continuous SDF contour only where neighboring ownership differs.
// This avoids magnifying the discrete low-resolution resolve grid at close range.
vec4 grownStyle(vec2 uv,out float edgePx,out float owner){
 vec2 base=floor(uv*territoryFieldSize-.5);
 vec4 ids=vec4(edgeId((base+vec2(.5,.5))/territoryFieldSize),edgeId((base+vec2(1.5,.5))/territoryFieldSize),edgeId((base+vec2(.5,1.5))/territoryFieldSize),edgeId((base+vec2(1.5,1.5))/territoryFieldSize));
 owner=ids.x;edgePx=1e5;
 float originalA=polityId(texture2D(polityA,uv).rg),originalB=polityId(texture2D(polityB,uv).rg);
 if(ids.x==ids.y&&ids.x==ids.z&&ids.x==ids.w){if(originalA==originalB)return mix(smoothPolity(polityA,uv,.125,territoryLabelSize),smoothPolity(polityB,uv,.375,territoryLabelSize),territoryProgress);return timeStyle(owner);}
 // Polities absent from the changed-set have no SDF layer. Keep their
 // high-resolution static coastline instead of extending a coarse winner.
 for(int i=0;i<4;i++){if(polityStyle(ids[i],.875).g<.5){vec4 style=mix(smoothPolity(polityA,uv,.125,territoryLabelSize),smoothPolity(polityB,uv,.375,territoryLabelSize),territoryProgress);float coverage=style.a/.4;edgePx=abs(coverage-.5)/max(fwidth(coverage),.0001);return style;}}
 float best=1e8,second=1e8,runner=owner;
 float a=polityId(texture2D(polityA,uv).rg),b=polityId(texture2D(polityB,uv).rg);
 for(int i=0;i<4;i++){
   float id=ids[i];bool duplicate=false;for(int j=0;j<4;j++){if(j>=i)break;if(ids[j]==id)duplicate=true;}
   if(duplicate||(id==0.&&polityStyle(a,.875).r>.5&&polityStyle(b,.875).r>.5))continue;
   float layer=polityStyle(id,.875).g-1.;if(layer<0.)continue;
   vec2 field=texture(territoryFields,vec3(uv,layer)).rg;float score=mix(field.x,field.y,territoryProgress);
   if(score<best){second=best;runner=owner;best=score;owner=id;}else if(score<second){second=score;runner=id;}
 }
 if(second>1e7)return timeStyle(owner);
 float gap=max(0.,second-best),aa=max(fwidth(gap),.001);edgePx=gap/aa;
 return mix(timeStyle(runner),timeStyle(owner),.5+.5*smoothstep(0.,aa,gap));
}
vec3 polityBlend(vec3 ground,vec4 style,vec2 uv){
  if(style.a<=0.0)return ground*.85;
  float luma=dot(ground,vec3(.2126,.7152,.0722)),source=dot(style.rgb,vec3(.2126,.7152,.0722));
  // L1 uses the same relief signal with a raised exposure; L0 is untouched.
  float reliefLuma=min(.48,.32*pow(clamp(luma/.018,.25,2.0),.65));
  vec3 tinted=style.rgb*reliefLuma/max(.0001,source);
  float opacity=style.a*territoryOpacity/.4;
  if(style.a<.2)opacity*=mix(.5,1.0,step(.45,fract((uv.x+uv.y)*420.0)));
  vec3 mixed=mix(ground,tinted,opacity);
  return mixed*min(1.0,.15/max(.0001,dot(mixed,vec3(.2126,.7152,.0722))));
}
float edgeId(vec2 uv){
  if(territoryProgress<=0.0)return polityId(texture2D(polityA,uv).rg);
  if(territoryProgress>=1.0)return polityId(texture2D(polityB,uv).rg);
  return polityId(texture2D(polityCurrent,uv).rg);
}
vec3 polityEdge(vec3 color,vec4 style,float id,float distancePx){
  if(polityFocus>.0)color*=abs(id-polityFocus)<.5?1.25:.55;
  if(territoryEdges<.5||style.a<=0.0||territoryProgress<=0.0||territoryProgress>=1.0)return color;
  float core=1.-smoothstep(.45,1.25,abs(distancePx)),halo=exp(-distancePx*distancePx/12.)*.12;
  return mix(color,style.rgb,core*.65+halo);

}
vec3 territoryColor(vec3 ground,vec3 world){
  if(territoryEnabled<.5)return ground;
  if(territoryLens.z>0.&&distance(gl_FragCoord.xy,territoryLens.xy)<territoryLens.z)return ground;
  vec2 uv=vec2((world.x-territoryBounds.x)/territoryBounds.z,(territoryBounds.y-world.z)/territoryBounds.w);
  if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))return ground*.85;
  float t=territoryProgress;
  if(t<=0.0){float id=polityId(texture2D(polityA,uv).rg);vec4 s=smoothPolity(polityA,uv,.125,territoryLabelSize);return polityEdge(polityBlend(ground,s,uv),s,id,0.);}
  if(t>=1.0){float id=polityId(texture2D(polityB,uv).rg);vec4 s=smoothPolity(polityB,uv,.375,territoryLabelSize);return polityEdge(polityBlend(ground,s,uv),s,id,0.);}
  float a=polityId(texture2D(polityA,uv).rg),b=polityId(texture2D(polityB,uv).rg);
  if(territoryCrossfade>.5)return mix(polityBlend(ground,polityStyle(a,.125),uv),polityBlend(ground,polityStyle(b,.375),uv),t);
  // Unchanged ground retains the full-resolution labels during a transition.
  // Reading the coarse SDF resolve target here used to turn static borders into a grid.
  vec4 current=texture2D(polityCurrent,uv);float id,edgePx;vec4 style=grownStyle(uv,edgePx,id);
  vec3 color=polityBlend(ground,style,uv);
  float envelope=sin(t*3.14159265);
  if(territoryInk>.0&&envelope>0.0){vec4 seed=polityStyle(id,.625);float radius=length(uv-seed.xy),grain=.5+.5*sin(radius*450.0+sin(uv.x*620.0)*.8+sin(uv.y*511.0));float ink=seed.z*grain*envelope*territoryInk*.14;color=mix(color,style.rgb*dot(ground,vec3(.2126,.7152,.0722))/max(.001,dot(style.rgb,vec3(.2126,.7152,.0722))),ink);}
  return polityEdge(mix(color,territoryGold,(a==b?0.0:current.b)*envelope*territoryFront*.55),style,id,edgePx);
}
`;
