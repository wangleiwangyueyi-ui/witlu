export const environmentUniformsGLSL = /* glsl */`
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
