export const openingVertex = `
varying vec2 screenUv;

void main() {
  screenUv = uv;
  gl_Position = vec4(position.xy, 0., 1.);
}
`;

export const openingFragment = `
uniform sampler2D dayMap;
uniform sampler2D earthLayers;
uniform vec2 viewport;
uniform vec2 focus;
uniform vec2 mapFocus;
uniform vec2 mapOrigin;
uniform vec3 orbit;
uniform vec3 east;
uniform vec3 north;
uniform vec3 sun;
uniform vec3 sky;
uniform vec3 blue;
uniform vec3 mist;
uniform vec3 gold;
uniform float focal;
uniform float altitude;
uniform float mapScale;
uniform float time;
uniform float reveal;
uniform float flatten;
uniform float passage;
uniform float outline;
varying vec2 screenUv;

const float PI = 3.14159265359;
const vec3 LUMA = vec3(.2126, .7152, .0722);

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * .1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec2 earthUv(vec3 normal) {
  return vec2(atan(normal.z, normal.x) / (2. * PI) + .5,
              asin(clamp(normal.y, -1., 1.)) / PI + .5);
}

// Explicit longitude derivatives keep the mip level continuous across the antimeridian.
vec3 globeSample(sampler2D atlas, vec2 uv) {
  vec2 dx = dFdx(uv), dy = dFdy(uv);
  dx.x -= round(dx.x);
  dy.x -= round(dy.x);
  return textureGrad(atlas,uv,dx,dy).rgb;
}

vec3 celestial(vec2 point) {
  float rotation = time * .012;
  float c = cos(rotation), s = sin(rotation);
  vec2 st = mat2(c,s,-s,c) * ((point - .5 * viewport) / viewport.y);
  vec2 cells = st * 115.;
  vec2 id = floor(cells);
  float brightness = hash(id);
  vec2 offset = vec2(hash(id + 3.),hash(id + 7.)) * .7 + .15;
  float size = .045 + brightness * .061;
  float star = (1. - smoothstep(size * .3,size + .04,length(fract(cells) - offset))) * step(.965,brightness);
  float glow = exp(-dot(st,st) * 3.) * .18;
  return sky * (.60 + glow) + mist * star * (.13 + .44 * hash(id + 6.));
}

void main() {
  vec2 point = screenUv * viewport;
  vec3 background = celestial(point);
  vec2 rayOffset = (point - focus) / focal;
  vec3 eye = orbit * (1. + altitude);
  vec3 ray = normalize(-orbit + east * rayOffset.x + north * rayOffset.y);
  float nearRay = -dot(eye, ray);
  float closestSquared = max(0., dot(eye,eye) - nearRay * nearRay);
  float radius = sqrt(closestSquared);
  float atmosphericRim = exp(-max(0., radius - 1.) * 88.) * (1. - smoothstep(1.0,1.075,radius));
  vec3 outputColor = background + blue * atmosphericRim * reveal * .24;

  if (radius < 1.002 || flatten > 0.) {
    vec3 normal = normalize(eye + ray * (nearRay - sqrt(max(0.,1. - closestSquared))));
    vec2 uv = earthUv(normal);
    vec2 planar = mapOrigin + (point - mapFocus) * mapScale;
    vec2 flatUv = vec2(planar.x / (2. * PI) + .5,
      (2. * atan(exp(clamp(planar.y,-3.14,3.14))) - PI * .5) / PI + .5);
    uv.x = mix(uv.x, flatUv.x + round(uv.x - flatUv.x), flatten);
    uv.y = mix(uv.y, flatUv.y, flatten);

    vec3 surface = globeSample(dayMap,uv);
    vec3 layers = globeSample(earthLayers,uv);
    float facingSun = dot(sun, normal);
    float day = smoothstep(-.24,.27,facingSun);
    float dayLight = .48 + .52 * max(0.,facingSun);
    float night = 1. - smoothstep(-.24,.02,facingSun);
    float relief = dot(surface,LUMA);
    vec3 color = mix(sky * (.75 + 1.20 * relief), mix(vec3(relief),surface,.60) * dayLight + sky * .32, day);
    color += gold * pow(layers.r, 1.85) * night * 1.30;

    float ocean = smoothstep(.015,.090,surface.b - max(surface.r,surface.g * 1.08));
    vec3 halfRay = normalize(sun - ray);
    vec3 waterNormal = normalize(normal + east * .012 * sin(uv.x * 590. + uv.y * 430.)
      + north * .010 * sin(uv.x * 270. - uv.y * 760.));
    float sparkle = pow(max(0.,dot(waterNormal,halfRay)), 39.) * day * ocean;
    color += mist * sparkle * .21;

    float cloudRay = nearRay - sqrt(max(0., 1.022 * 1.022 - closestSquared));
    vec2 cloudUv = earthUv(normalize(eye + ray * cloudRay));
    cloudUv = mix(cloudUv, uv, flatten) + vec2(-time*.0016, time*.00035);
    float cloud = smoothstep(.08,.94,globeSample(earthLayers,cloudUv).g);
    color = mix(color,mist * (.21 + day * .47),cloud * .54);

    float fresnel = pow(1. - max(0.,dot(normal,-ray)),3.4);
    color += blue * fresnel * (.12 + .35 * day) * (1. - flatten);
    float border = smoothstep(.1,.75,layers.b);
    color += gold * outline * (border * .96 + sqrt(layers.b) * .16);

    color = mix(color, color * .60 + sky * .42, flatten);
    float disk = mix(1. - smoothstep(.9985,1.0015,radius),1.,flatten);
    outputColor = mix(outputColor,mix(sky * .66,color,reveal),disk);
  }

  if (passage > 0.) {
    vec2 cloudCenter = vec2(.782,.675);
    float zoom = 1. - .68 * smoothstep(3.95,5.25,time);
    vec2 closeUv = cloudCenter + (point - mapFocus) / viewport.y * vec2(.20,.31) * zoom
      + vec2((time - 4.) * .012, .0);
    float billow = texture2D(earthLayers, vec2(fract(closeUv.x),closeUv.y)).g;
    float haze = passage * (.23 + .58 * smoothstep(.11,.84,billow));
    outputColor = mix(outputColor, mix(blue,mist,.65) * .78,haze);
  }
  gl_FragColor = vec4(outputColor,1.);
  #include <colorspace_fragment>
}
`;
