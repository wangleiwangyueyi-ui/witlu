export const environmentUniformsGLSL = /* glsl */`
uniform float weatherRain;
uniform float weatherTime;
uniform float weatherFlash;
uniform float weatherSorrow;
uniform float weatherFlood;
uniform float weatherFire;
uniform vec3 weatherBlue;
uniform vec3 weatherGold;
uniform vec3 weatherFocus;
uniform vec4 weatherRiver[32];
uniform int weatherRiverCount;
float riverDistance(vec2 p){float d=100000.;for(int i=0;i<32;i++){if(i>=weatherRiverCount)break;vec4 r=weatherRiver[i];vec2 ab=r.zw-r.xy;float t=clamp(dot(p-r.xy,ab)/max(1.,dot(ab,ab)),0.,1.);d=min(d,length(p-r.xy-ab*t));}return d;}
vec3 weatherGrade(vec3 color,vec3 world){float lum=dot(color,vec3(.2126,.7152,.0722));color=mix(color,weatherBlue*lum*1.7,weatherSorrow);color=mix(color,weatherBlue,weatherFlash*.3);
float focusDistance=distance(world.xz,weatherFocus.xz);if((weatherFlood>0.||weatherFire>0.)&&focusDistance<480.){float d=riverDistance(world.xz),local=1.-smoothstep(100.,480.,focusDistance);float width=mix(4.,55.,weatherFlood);float water=(1.-smoothstep(width*.6,width,d))*local;float ripple=.65+.35*sin(d*.4-weatherTime*2.);color=mix(color,weatherBlue*.23,water*weatherFlood*.5);float reflection=(1.-smoothstep(0.,18.,d))*local*(.55+.45*sin(world.x*1.5+weatherTime*8.));color=mix(color,weatherGold,reflection*weatherFire*.2*ripple);}return color;}
uniform float envEnabled;
uniform float envTime;
uniform vec3 sunDirection;
uniform float fogEnabled;
uniform vec3 skyColor;
uniform vec3 horizonColor;
uniform float cloudShadowStrength;
uniform sampler2D cloudCoverage;
uniform int cloudCount;
uniform vec4 cloudData[6];
uniform vec4 cloudDetails[6];
uniform vec4 cloudBasis;
uniform float cloudVisibility;
uniform float lightCycleEnabled;
vec3 limitBackground(vec3 color) {
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return color * min(1.0, 0.09 / max(0.0001, luminance));
}
float cloudShadow(vec3 world) {
  if (envEnabled < 0.5 || cloudShadowStrength <= 0.0 || cloudVisibility <= 0.0) return 1.0;
  float opacity = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= cloudCount) break;
    vec4 data = cloudData[i]; vec4 detail = cloudDetails[i];
    vec2 shadowCenter = data.xy - sunDirection.xz * detail.x / max(0.2, sunDirection.y);
    vec2 delta = world.xz - shadowCenter;
    float det = cloudBasis.x * cloudBasis.w - cloudBasis.y * cloudBasis.z;
    vec2 plane = vec2(delta.x * cloudBasis.w - delta.y * cloudBasis.z, delta.y * cloudBasis.x - delta.x * cloudBasis.y) / det;
    vec2 uv = plane / vec2(data.z, detail.y) + 0.5;
    if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) opacity = max(opacity, texture2D(cloudCoverage, uv).r * data.w / 0.27);
  }
  return 1.0 - opacity * cloudShadowStrength * cloudVisibility;
}
`;
