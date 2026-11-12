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
uniform float territoryEnabled;uniform sampler2D polityA;uniform sampler2D polityB;uniform sampler2D polityCurrent;uniform sampler2D polityPalette;
uniform vec4 territoryBounds;uniform float territoryProgress;uniform float territoryCrossfade;uniform float territoryOpacity;uniform float territoryFront;uniform float territoryInk;uniform vec3 territoryGold;
float polityId(vec2 rg){return floor(rg.x*255.0+.5)+floor(rg.y*255.0+.5)*256.0;}
vec4 polityStyle(float id,float row){return texture2D(polityPalette,vec2((id+.5)/1024.0,row));}
vec3 polityBlend(vec3 ground,vec4 style,vec2 uv){
  if(style.a<=0.0)return ground*.85;
  float luma=dot(ground,vec3(.2126,.7152,.0722)),source=dot(style.rgb,vec3(.2126,.7152,.0722));
  vec3 tinted=style.rgb*luma/max(.0001,source);
  float opacity=style.a*territoryOpacity/.4;
  if(style.a<.2)opacity*=mix(.5,1.0,step(.45,fract((uv.x+uv.y)*420.0)));
  return mix(ground,tinted,opacity);
}
vec3 territoryColor(vec3 ground,vec3 world){
  if(territoryEnabled<.5)return ground;
  vec2 uv=vec2((world.x-territoryBounds.x)/territoryBounds.z,(territoryBounds.y-world.z)/territoryBounds.w);
  if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))return ground*.85;
  float t=territoryProgress;
  if(t<=0.0)return polityBlend(ground,polityStyle(polityId(texture2D(polityA,uv).rg),.125),uv);
  if(t>=1.0)return polityBlend(ground,polityStyle(polityId(texture2D(polityB,uv).rg),.375),uv);
  float a=polityId(texture2D(polityA,uv).rg),b=polityId(texture2D(polityB,uv).rg);
  if(territoryCrossfade>.5)return mix(polityBlend(ground,polityStyle(a,.125),uv),polityBlend(ground,polityStyle(b,.375),uv),t);
  vec4 current=texture2D(polityCurrent,uv);float id=t<=0.0?a:t>=1.0?b:a==b?a:polityId(current.rg);
  vec4 ca=polityStyle(id,.125),cb=polityStyle(id,.375);vec4 style=mix(ca,cb,t);
  // A newly founded / vanished polity keeps its color while its area grows/shrinks.
  if(ca.a==0.0)style=cb;else if(cb.a==0.0)style=ca;
  vec3 color=polityBlend(ground,style,uv);
  float envelope=sin(t*3.14159265);
  if(territoryInk>.0&&envelope>0.0){vec4 seed=polityStyle(id,.625);float radius=length(uv-seed.xy),grain=.5+.5*sin(radius*450.0+sin(uv.x*620.0)*.8+sin(uv.y*511.0));float ink=seed.z*grain*envelope*territoryInk*.14;color=mix(color,style.rgb*dot(ground,vec3(.2126,.7152,.0722))/max(.001,dot(style.rgb,vec3(.2126,.7152,.0722))),ink);}
  return mix(color,territoryGold,(a==b?0.0:current.b)*envelope*territoryFront*.55);
}
`;
