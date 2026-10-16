export const FIRE_VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// An advected, domain-warped density field gives fire translucent, ragged edges.
// There are no repeating petals, solid outlines, or geometric flame cutouts.
export const FIRE_FRAGMENT = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float heat;
uniform float strength;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}
float turbulence(vec2 p) {
  float value = 0.0, weight = 0.55;
  for (int i = 0; i < 4; i++) {
    value += noise(p) * weight;
    p = mat2(0.8, -0.6, 0.6, 0.8) * p * 2.05 + vec2(7.1, 13.7);
    weight *= 0.48;
  }
  return value;
}
void main() {
  vec2 p = (gl_FragCoord.xy / resolution - 0.5) * 3.8;
  float radius = length(p);
  float distance = radius - 0.94;
  if (radius < 0.90 || radius > 1.82) { gl_FragColor = vec4(0.0); return; }

  // Different flow speeds form billows that stretch, shear, and break apart.
  vec2 flow = vec2(p.x * 3.7, p.y * 4.4 - time * 1.55);
  float drift = turbulence(flow * 0.57 + vec2(time * 0.13, 0.0));
  vec2 warped = flow + vec2((drift - 0.5) * 1.8, drift * 0.8);
  float billow = turbulence(warped);
  float detail = turbulence(warped * 2.6 - vec2(0.0, time * 1.1));
  float upward = mix(0.58, 1.25, smoothstep(-0.8, 0.9, p.y));
  float reach = (0.16 + pow(billow, 1.6) * 0.70 + heat * 0.13) * upward;
  float fuel = 1.0 - distance / max(reach, 0.05);
  float density = smoothstep(0.04, 0.93, fuel + (detail - 0.5) * 0.8);
  density *= smoothstep(0.91, 1.01, radius);
  density *= 1.0 - smoothstep(0.34, 0.82, distance);
  float wisps = smoothstep(0.45, 0.78, detail) * smoothstep(0.0, 0.19, distance);
  density *= 0.68 + wisps * 0.32;

  // Real fire temperatures: deep red fringes, orange body, pale golden heart.
  float temperature = clamp(density * 0.82 + (1.0 - smoothstep(0.0, 0.28, distance)) * 0.26, 0.0, 1.0);
  vec3 color = mix(vec3(0.50, 0.025, 0.003), vec3(1.0, 0.30, 0.018), smoothstep(0.05, 0.52, temperature));
  color = mix(color, vec3(1.0, 0.70, 0.22), smoothstep(0.45, 0.82, temperature));
  color = mix(color, vec3(1.0, 0.96, 0.72), smoothstep(0.78, 1.0, temperature));
  float alpha = pow(density, 1.35) * 0.92 * strength;
  gl_FragColor = vec4(color, alpha);
}
`;