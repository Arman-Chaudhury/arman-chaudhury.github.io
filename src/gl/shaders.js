// All GLSL lives here. The sheet deformation is mirrored in JS (sheet.js) so DOM
// titles and hit-testing land exactly on the bent cards — keep the two in sync.

export const sheetGLSL = /* glsl */ `
#define PI 3.14159265
uniform vec2 u_half;     // frustum half extents at z = 0 (px)
uniform float u_V;       // normalised scroll speed 0..1
uniform float u_C;       // 1 = S-curve, 0 = bowl
uniform float u_lean;    // door lean, fraction of W

const float SPAN = 1.15;
const float SHIFT = -0.2;
const float BANK = -0.16;
const float DIAG = 0.03;
const float REAR_Y = 0.1;
const float REAR_Z = 0.2;
const float TWIST = 1.8;

float shapeF(float q) { return mix(1.0 - q * q, sin(PI * q), u_C) * exp(-q * q); }
float shapeD(float q) { return (shapeF(q + 0.001) - shapeF(q - 0.001)) * 500.0; }
float ramp(float s) { s = clamp(s, -1.0, 1.0); return s * (1.5 - 0.5 * s * s); }
float rampD(float s) { return abs(s) >= 1.0 ? 0.0 : 1.5 - 1.5 * s * s; }

// world-space point on the strip -> point on the sheet.
// outputs the sheet displacement (for depth shading) and surface slopes.
vec3 sheet(vec3 p, out float zs, out vec2 slope) {
  float W = u_half.x;
  float V = u_V;
  float D = W * 0.2 * (1.0 + 1.1 * V);
  float xs = p.x / W;
  float q = xs * SPAN + SHIFT;
  float ds = shapeD(q);
  float a = BANK * ds / PI * u_C + TWIST * V * smoothstep(0.3, 0.9, abs(xs)) * sign(xs);
  float ca = cos(a), sa = sin(a);
  float m = 1.0 - smoothstep(-1.0, 0.3, xs);
  float A = W * u_lean;

  zs = -D * shapeF(q) + A * ramp(xs) + REAR_Z * W * V * m;
  vec3 o;
  o.x = p.x;
  o.y = p.y * ca + DIAG * p.x + REAR_Y * W * V * m;
  o.z = p.z + p.y * sa + zs;
  slope = vec2(-D * ds * SPAN / W + A * rampD(xs) / W, sa / max(ca, 0.2));
  return o;
}
`

export const cardVert = /* glsl */ `
${sheetGLSL}
uniform float u_sheetP;
uniform float u_hover;
uniform float u_dent;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;
varying float vDepth;

void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vec2 sz = vec2(modelMatrix[0][0], modelMatrix[1][1]);

  // hover: the card is pressed inward like a soft dome
  vec2 qd = uv * 2.0 - 1.0;
  float dome = (1.0 - qd.x * qd.x) * (1.0 - qd.y * qd.y);
  float dent = u_hover * u_dent * sz.y;
  w.z -= dent * dome;
  vec2 dDent = vec2(2.0 * qd.x * (1.0 - qd.y * qd.y) * 2.0 / sz.x, 2.0 * qd.y * (1.0 - qd.x * qd.x) * 2.0 / sz.y) * dent;

  float zs;
  vec2 slope;
  vec3 s = sheet(w.xyz, zs, slope);
  w.xyz = mix(w.xyz, s, u_sheetP);
  slope = slope * u_sheetP + dDent;

  float D = u_half.x * 0.2 * (1.0 + 1.1 * u_V);
  vDepth = clamp((D - zs * u_sheetP) / (2.0 * D) + dent * dome / (2.0 * D), 0.0, 1.0);
  vN = normalize(vec3(-slope.x, -slope.y, 1.0));
  vView = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

export const cardFrag = /* glsl */ `
uniform sampler2D u_map;
uniform vec2 u_img;
uniform vec2 u_size;
uniform float u_radius;
uniform float u_alpha;
uniform float u_shade;
uniform float u_spread;
uniform float u_scrim;
uniform float u_white;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;
varying float vDepth;

const vec3 LIGHT = vec3(-0.4, 0.5, 1.0);

vec2 cover(vec2 plane, vec2 img, vec2 uv) {
  float pr = plane.x / plane.y;
  float ir = img.x / img.y;
  vec2 s = pr > ir ? vec2(1.0, ir / pr) : vec2(pr / ir, 1.0);
  return (uv - 0.5) * s + 0.5;
}

float roundedBox(vec2 p, vec2 mid, float r) {
  vec2 q = abs(p - mid) - (mid - r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec3 col = texture2D(u_map, cover(u_size, u_img, vUv)).rgb;

  // further along the sheet = darker
  col = mix(col, vec3(0.059), 0.8 * pow(vDepth, u_spread) * u_shade);

  // soft key light with a tight specular sheen
  vec3 n = normalize(vN);
  vec3 l = normalize(LIGHT);
  vec3 h = normalize(l + normalize(vView));
  col *= 1.0 - 0.12 * u_shade * (1.0 - (dot(n, l) * 0.5 + 0.5));
  col += pow(max(dot(n, h), 0.0), 48.0) * 0.35 * u_shade;

  // title scrim along the bottom edge
  float g = 1.0 - smoothstep(0.0, 0.5, vUv.y);
  col = mix(col, vec3(0.0), u_scrim * 0.65 * g * g);

  col = mix(col, vec3(1.0), u_white);

  vec2 sz = vec2(u_size.x / u_size.y, 1.0);
  float d = roundedBox(vUv * sz, sz * 0.5, u_radius);
  float aa = fwidth(d);
  float mask = 1.0 - smoothstep(-aa, aa, d);
  gl_FragColor = vec4(col, mask * u_alpha);
}
`

export const floorVert = /* glsl */ `
uniform mat4 u_texMat;
varying vec3 vWorld;
varying vec4 vRefl;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vRefl = u_texMat * w;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

export const floorFrag = /* glsl */ `
uniform sampler2D u_refl;
uniform float u_cell;
uniform float u_depth;
uniform float u_alpha;
varying vec3 vWorld;
varying vec4 vRefl;

void main() {
  // signed distance from the strip, toward the camera is positive
  float far = vWorld.z / u_depth;
  vec2 p = vWorld.xz / u_cell;
  vec2 fw = fwidth(p) * 1.5;
  vec2 gl = 1.0 - smoothstep(vec2(0.0), fw, abs(fract(p - 0.5) - 0.5));
  float line = max(gl.x, gl.y);
  float fade = 1.0 - smoothstep(0.2, 0.95, abs(far));

  vec3 refl = texture2DProj(u_refl, vRefl).rgb;
  vec3 col = vec3(0.08) * line * fade;
  col += refl * line * 0.5 * exp(-abs(far) * 6.0);
  float shadow = exp(-abs(far) * 14.0) * 0.55;
  col *= 1.0 - shadow;
  gl_FragColor = vec4(col, 0.9 * u_alpha);
}
`

export const fullVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// Cursor trail: a decaying, diffusing height field (not a fluid).
export const trailFrag = /* glsl */ `
uniform sampler2D u_prev;
uniform vec2 u_texel;
uniform vec2 u_pos;
uniform float u_amp;
uniform float u_rad;
uniform float u_decay;
uniform float u_diff;
uniform float u_aspect;
varying vec2 vUv;

void main() {
  float c = texture2D(u_prev, vUv).r;
  float avg = 0.25 * (
    texture2D(u_prev, vUv + vec2(u_texel.x, 0.0)).r +
    texture2D(u_prev, vUv - vec2(u_texel.x, 0.0)).r +
    texture2D(u_prev, vUv + vec2(0.0, u_texel.y)).r +
    texture2D(u_prev, vUv - vec2(0.0, u_texel.y)).r);
  float h = mix(c, avg, u_diff) * u_decay;
  vec2 q = vUv - u_pos;
  q.y /= u_aspect;
  h += u_amp * exp(-dot(q, q) / (u_rad * u_rad));
  gl_FragColor = vec4(min(h, 1.5), 0.0, 0.0, 1.0);
}
`

// Final pass: the cursor dent (trail gradient) and the black-hole lens.
export const postFrag = /* glsl */ `
#define PI 3.14159265
uniform sampler2D u_scene;
uniform sampler2D u_trail;
uniform vec2 u_trailTexel;
uniform vec2 u_res;
uniform float u_ballWarp;
uniform float u_ballShade;
uniform float u_ballA;
uniform vec2 u_holeC;
uniform float u_holeR;
uniform float u_holeP;
uniform float u_holeSq;
uniform float u_holeT;
uniform float u_time;
varying vec2 vUv;

const float LENS = 1.5;
const float REACH = 0.09;
const float ORBIT = 0.3;
const float WAVE = 0.05;
const float ABERR = 0.004;
const float BREATH = 0.015;

float field(vec2 uv) { return texture2D(u_trail, uv).r; }

vec3 tap(vec2 uv) {
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec3(0.0);
  return texture2D(u_scene, uv).rgb;
}

float lobes(float a) {
  return 0.6 * sin(3.0 * a + 0.7 * u_time) + 0.4 * sin(5.0 * a - 0.45 * u_time);
}

void main() {
  vec2 uv = vUv;
  vec2 asp = vec2(1.0, u_res.y / u_res.x); // width-share units

  // --- ball: gradient of the trail field dents the image
  vec2 o = u_trailTexel * 1.5;
  vec2 g = vec2(field(uv + vec2(o.x, 0.0)) - field(uv - vec2(o.x, 0.0)),
                field(uv + vec2(0.0, o.y)) - field(uv - vec2(0.0, o.y)));
  float edge = 1.0 - smoothstep(0.22, 0.5, length((uv - 0.5) * asp));
  vec2 off = g * u_ballWarp * u_ballA * edge;
  vec2 suv = uv + off * smoothstep(0.0, 0.002, length(off));

  vec3 col;
  if (u_holeP > 0.0) {
    // --- hole: inverse lens equation b = t - E^2 / t
    vec2 sq = vec2(1.0 + u_holeSq, 1.0 - u_holeSq);
    vec2 q = (suv - u_holeC) * asp * sq;
    float t = length(q);
    float ang = atan(q.y, q.x);
    float n = lobes(ang) * WAVE * sin(PI * u_holeP);
    float r = u_holeP * u_holeR * (1.0 + BREATH * sin(1.6 * u_time)) + n;
    float e = LENS * r;
    float fall = 1.0 - smoothstep(r, r + REACH, t);
    float pullG = fall * e * e / max(t, 0.001);
    float er = e * (1.0 + ABERR), eb = e * (1.0 - ABERR);
    float pullR = fall * er * er / max(t, 0.001);
    float pullB = fall * eb * eb / max(t, 0.001);
    // frame dragging
    float rot = pullG * ORBIT * min(u_holeT, 15.0);
    vec2 dir = q / max(t, 1e-5);
    dir = mat2(cos(rot), sin(rot), -sin(rot), cos(rot)) * dir;
    vec2 back = 1.0 / (asp * sq);
    col.r = tap(u_holeC + dir * (t - pullR) * back).r;
    col.g = tap(u_holeC + dir * (t - pullG) * back).g;
    col.b = tap(u_holeC + dir * (t - pullB) * back).b;
    float aa = fwidth(t);
    col *= smoothstep(r - aa, r + aa, t);
  } else {
    col = tap(suv);
  }

  // ball lighting, kept off pale areas
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  float shade = dot(-g, normalize(vec2(-0.3, 1.0))) * u_ballShade * u_ballA * edge;
  col *= 1.0 + clamp(shade, -0.5, 0.5) * (1.0 - smoothstep(0.7, 0.95, luma));

  gl_FragColor = vec4(col, 1.0);
}
`
