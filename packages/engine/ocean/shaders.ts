import { environmentUniformsGLSL } from '../atmosphere/shared-shaders';
export const oceanVertex = /* glsl */`
varying vec2 vUv;
varying vec3 vWorld;
varying float vDistance;
void main() { vUv = uv; vec4 p = modelMatrix * vec4(position, 1.0); vWorld = p.xyz; vec4 view = viewMatrix * p; vDistance = -view.z; gl_Position = projectionMatrix * view; }
`;
export const oceanFragment = /* glsl */`
${environmentUniformsGLSL}
uniform sampler2D reliefMap;
uniform sampler2D heightMap;
uniform sampler2D coastDistance;
uniform sampler2D normalA;
uniform sampler2D normalB;
uniform vec4 coastTransform;
uniform float environmentReady;
uniform float waterMotion;
uniform float slowTime;
uniform float normalLayers;
uniform float moonStrength;
uniform float wavesEnabled;
uniform vec3 seaColor;
uniform vec3 shelfColor;
uniform vec3 coastColor;
uniform vec3 flowColor;
uniform vec3 waveColor;
uniform vec4 clipBounds;
varying vec2 vUv;
varying vec3 vWorld;
varying float vDistance;
void main() {
  if (vWorld.x < clipBounds.x || vWorld.z < clipBounds.y || vWorld.x > clipBounds.z || vWorld.z > clipBounds.w) discard;
  if (texture2D(reliefMap, vUv).a > 254.5/255.0) discard;
  float edge = min(min(vWorld.x - clipBounds.x, clipBounds.z - vWorld.x), min(vWorld.z - clipBounds.y, clipBounds.w - vWorld.z));
  if (envEnabled < 0.5) { gl_FragColor = vec4(seaColor, 0.16 * smoothstep(0.0, 600.0, edge)); }
  else {
    vec3 bytes = texture2D(heightMap, vUv).rgb * 255.0;
    float depth = max(0.0, 32768.0 - dot(bytes, vec3(256.0, 1.0, 1.0/256.0)));
    vec3 base = depth < 450.0 ? mix(coastColor, shelfColor, smoothstep(0.0, 450.0, depth)) : mix(shelfColor, seaColor, smoothstep(450.0, 3000.0, depth));
    float time = envTime * waterMotion;
    vec2 uv = vWorld.xz / 230.0;
    vec2 a = texture2D(normalA, uv + vec2(time * .0009, time * .00035)).rg * 2.0 - 1.0;
    vec2 b = texture2D(normalB, uv * 1.63 + vec2(-time * .00045, time * .00072)).rg * 2.0 - 1.0;
    vec2 ripple = a * .55 + b * .32 * step(1.5, normalLayers);
    vec3 normal = normalize(vec3(ripple.x * .24, 1.0, ripple.y * .24));
    vec3 view = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(0.0, dot(view, normal)), 3.0);
    vec3 halfVector = normalize(view + sunDirection);
    float specular = pow(max(0.0, dot(normal, halfVector)), 24.0);
    float reflection = min(.25, moonStrength * (specular * .8 + (ripple.x + ripple.y + 1.0) * .08));
    vec3 color = mix(base, flowColor, reflection);
    // Palette endpoints remain depth-driven; ambient exposure keeps L0 quiet.
    color *= .66;
    color = mix(color, mix(skyColor, horizonColor, .35), fresnel * .16);
    if (wavesEnabled > 0.5 && environmentReady > 0.5) {
      vec2 coastUv = (vWorld.xz - coastTransform.xy) / coastTransform.zw;
      vec4 field = texture2D(coastDistance, coastUv);
      float distanceKm = dot(field.rg * 255.0, vec2(256.0, 1.0)) / 65535.0 * 160.0;
      // Positive time advances crests towards smaller distances: towards land.
      float phase = distanceKm * 6.2831853 / 24.0 + slowTime * .38;
      float band = pow(max(0.0, cos(phase)), 5.0);
      float broken = .55 + .45 * texture2D(normalB, vWorld.xz / 400.0).b;
      float shore = smoothstep(1.5, 5.0, distanceKm) * (1.0 - smoothstep(12.0, 45.0, distanceKm));
      float aa = 1.0 - smoothstep(2.0, 5.0, fwidth(phase));
      color = mix(color, waveColor, band * broken * shore * aa * .055);
    }
    if(weatherRain>0.){vec2 cell=floor(vWorld.xz/24.),uvRain=fract(vWorld.xz/24.)-.5;float seed=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);float age=fract(weatherTime*1.7+seed);float ring=1.-smoothstep(.018,.07,abs(length(uvRain)-age*.48));color=mix(color,weatherBlue,ring*(1.-age)*weatherRain*.07);}
    color=weatherGrade(color,vWorld);
    color *= cloudShadow(vWorld);
    float fog = max(smoothstep(5000.0, 15000.0, vDistance) * .12 * fogEnabled, 1.0 - smoothstep(0.0, 600.0, edge));
    color = mix(color, mix(skyColor, horizonColor, .28), fog * smoothstep(0.0, 600.0, edge));
    color = mix(skyColor, color, smoothstep(0.0,600.0,edge));
    gl_FragColor = vec4(limitBackground(color), .88);
  }
  #include <colorspace_fragment>
}`;
