import { environmentUniformsGLSL } from '../atmosphere/shared-shaders';
import { territoryGLSL } from '../morph/shaders';
export const terrainVertex = /* glsl */`
uniform sampler2D heightMap;
uniform float tileY;
uniform float zoomScale;
uniform float displacement;
attribute float skirt;
varying vec2 vUv;
varying vec3 vWorld;
varying float vDistance;
void main() {
  vUv = uv;
  vec3 bytes = texture2D(heightMap, uv).rgb * 255.0;
  float metres = dot(bytes, vec3(256.0, 1.0, 1.0/256.0)) - 32768.0;
  float merc = 3.14159265359 * (1.0 - 2.0 * ((tileY + uv.y) / zoomScale));
  float scale = (exp(merc) + exp(-merc)) * 0.5;
  vec3 p = position;
  p.y = metres * 0.001 * (metres >= 0.0 ? 1.8 : 0.5) * scale * displacement - skirt;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vec4 view = viewMatrix * world;
  vDistance = -view.z;
  gl_Position = projectionMatrix * view;
}`;
export const terrainFragment = /* glsl */`
${environmentUniformsGLSL}
${territoryGLSL}
uniform sampler2D heightMap;
uniform float tileSize;
uniform sampler2D reliefMap;
uniform vec3 fogColor;
uniform vec4 clipBounds;
uniform float reliefEnabled;
uniform vec3 landColor;
uniform vec3 seaColor;
varying vec2 vUv;
varying vec3 vWorld;
varying float vDistance;
float elevation(vec2 uv) { return (dot(texture2D(heightMap, uv).rgb * 255.0, vec3(256.0, 1.0, 1.0/256.0)) - 32768.0) * .001; }
void main() {
  if (vWorld.x < clipBounds.x || vWorld.z < clipBounds.y || vWorld.x > clipBounds.z || vWorld.z > clipBounds.w) discard;
  vec4 texel = texture2D(reliefMap, vUv);
  vec3 color = mix(mix(seaColor, landColor, step(254.5/255.0, texel.a)), texel.rgb, reliefEnabled);
  if (envEnabled > .5) {
    if (lightCycleEnabled > .5 && texel.a > 254.5/255.0) {
      float dx = elevation(vUv + vec2(1.0/256.0,0.0)) - elevation(vUv - vec2(1.0/256.0,0.0));
      float dz = elevation(vUv + vec2(0.0,1.0/256.0)) - elevation(vUv - vec2(0.0,1.0/256.0));
      vec3 normal = normalize(vec3(-dx * 12.0, tileSize / 128.0, -dz * 12.0));
      vec3 reference = normalize(vec3(-.42424,.75,-.50559));
      color *= 1.0 + (dot(normal,sunDirection)-dot(normal,reference))*.2;
    }
    color *= cloudShadow(vWorld);
    color = limitBackground(color);
  }
  if(texel.a>254.5/255.0)color=territoryColor(color,vWorld);
  color=weatherGrade(color,vWorld);
  float edge = min(min(vWorld.x - clipBounds.x, clipBounds.z - vWorld.x), min(vWorld.z - clipBounds.y, clipBounds.w - vWorld.z));
  float fog = max(smoothstep(8000.0, 20000.0, vDistance) * 0.55 * (envEnabled > .5 ? fogEnabled : 1.0), 1.0 - smoothstep(0.0, 600.0, edge));
  vec3 fogTint = envEnabled > .5 ? mix(skyColor, horizonColor, .28) : fogColor;
  color = mix(color, fogTint, fog * smoothstep(0.0,600.0,edge));
  gl_FragColor = vec4(mix(fogColor,color,smoothstep(0.0,600.0,edge)), 1.0);
  #include <colorspace_fragment>
}`;
