// The living photograph. One full-screen shader: every pixel starts as the photo, and the
// effects only nudge where it is sampled or add light on top.
import * as THREE from '../vendor/three.module.js';
import { CONFIG } from './config.js';
import { visibleRect, clampView } from './camera.js';
import { SQUASH } from './koi-sim.js';
import { POND_BOUNDS } from './pond.js';
import { RIPPLE_LIFE } from './ripples.js';

const MAX_RIPPLES = CONFIG.maxRipples;

const VERT = /* glsl */`
varying vec2 vS;
void main() { vS = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */`
precision highp float;
varying vec2 vS;                 // screen, origin bottom-left
uniform sampler2D uScene, uDepth, uMasks, uKoi;
uniform vec4 uRect;              // visible image area: u0, v0, u1, v1 (v down)
uniform vec4 uKoiRect;           // koi texture area: u0, v0, w, h
uniform vec4 uRipples[${MAX_RIPPLES}];  // u, v, age, on
uniform vec2 uPointer;           // -1..1, smoothed
uniform vec2 uPondV;             // far and near v of the pond
uniform vec2 uSun;
uniform float uTime, uAspect, uSquash, uParallax, uFade, uLife;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

float waterH(vec2 q, float t) {
  return vnoise(q * 34.0 + vec2(t * 0.30, t * 0.19)) * 0.55
       + vnoise(q * 67.0 + vec2(-t * 0.42, t * 0.27)) * 0.30
       + vnoise(q * 140.0 + vec2(t * 0.7, -t * 0.5)) * 0.10;
}

void main() {
  vec2 s = vec2(vS.x, 1.0 - vS.y);
  vec2 uv = mix(uRect.xy, uRect.zw, s);
  float t = uTime;

  // depth parallax: near things slide a little more than far ones
  float d0 = texture2D(uDepth, uv).r;
  uv += uPointer * (d0 - 0.32) * uParallax;
  float depth = texture2D(uDepth, uv).r;
  vec3 m = texture2D(uMasks, uv).rgb;

  // foliage sway: slow gusts plus a finer flutter, only where the mask allows
  float gust = vnoise(vec2(uv.x * 2.2 - t * 0.11, uv.y * 1.6 + t * 0.03));
  vec2 flutter = vec2(vnoise(uv * 17.0 + vec2(t * 0.55, 0.0)), vnoise(uv * 17.0 + vec2(9.0, t * 0.45))) - 0.5;
  vec2 sway = (vec2(gust - 0.5, 0.0) * 0.0042 + flutter * vec2(0.0022, 0.0012)) * m.g;

  // water surface
  float w = m.r;
  float ps = mix(0.45, 1.0, clamp((uv.y - uPondV.x) / (uPondV.y - uPondV.x), 0.0, 1.0));
  vec2 plane = vec2(uv.x, uv.y / uAspect / uSquash);
  vec2 q = plane / ps;
  float e = 0.0035;
  vec2 grad = vec2(waterH(q + vec2(e, 0), t) - waterH(q - vec2(e, 0), t),
                   waterH(q + vec2(0, e), t) - waterH(q - vec2(0, e), t)) / (2.0 * e);
  float crest = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = uRipples[i];
    if (r.w < 0.5) continue;
    vec2 dq = (plane - vec2(r.x, r.y / uAspect / uSquash)) / ps;
    float dist = length(dq) + 1e-5;
    float life = r.z / uLife;
    float radius = 0.006 + r.z * 0.045;
    float band = dist - radius;
    float ring = sin(band * 300.0) * exp(-band * band * 5200.0);
    // older, wider rings behind the front
    float trail = band + 0.018;
    ring += 0.5 * sin(band * 300.0) * exp(-trail * trail * 3000.0);
    float fade = pow(1.0 - life, 1.6) * smoothstep(0.0, 0.12, r.z);
    grad += dq / dist * ring * fade * 42.0;
    crest += ring * fade;
  }
  vec2 wob = vec2(grad.x, grad.y * uSquash * uAspect) * 0.00008 * ps * w * w;

  vec3 col = texture2D(uScene, uv + sway + wob).rgb;

  // koi, seen through the surface
  if (w > 0.01) {
    vec2 kuv = (uv + wob * 1.25 - uKoiRect.xy) / uKoiRect.zw;
    kuv.y = 1.0 - kuv.y;
    vec2 px = vec2(0.0012, 0.0022);
    vec4 k = texture2D(uKoi, kuv) * 0.4
           + (texture2D(uKoi, kuv + vec2(px.x, 0)) + texture2D(uKoi, kuv - vec2(px.x, 0))
            + texture2D(uKoi, kuv + vec2(0, px.y)) + texture2D(uKoi, kuv - vec2(0, px.y))) * 0.15;
    float shadow = texture2D(uKoi, kuv + vec2(0.006, -0.016)).a;
    float bright = lum(col);
    // the fish's own shadow on the bottom, visible only where the water is not a mirror
    col *= 1.0 - shadow * (1.0 - k.a) * 0.22 * w * (1.0 - smoothstep(0.55, 0.9, bright));
    vec3 fish = k.rgb / max(k.a, 1e-3);
    // water tints and dims what is under it; the surface reflection sits on top
    vec3 tint = mix(vec3(0.86, 0.95, 0.92), vec3(0.97, 0.99, 0.98), smoothstep(0.3, 0.8, bright));
    fish = fish * tint * mix(0.9, 1.0, smoothstep(0.2, 0.7, bright));
    fish = mix(fish, col, 0.10 + 0.14 * smoothstep(0.6, 0.95, bright));
    col = mix(col, fish, k.a * w * 0.93);
  }

  // sparkle and ripple crests on the water
  float glint = pow(vnoise(q * 190.0 + t * vec2(0.9, 0.5)), 26.0) * smoothstep(0.6, 0.9, lum(col));
  col += (glint * 0.5 + max(crest, 0.0) * 0.07) * w;
  col -= max(-crest, 0.0) * 0.035 * w;

  // drifting mist over the far forest
  float far = 1.0 - smoothstep(0.04, 0.26, depth);
  float band = smoothstep(0.12, 0.3, uv.y) * (1.0 - smoothstep(0.5, 0.64, uv.y));
  float mist = vnoise(vec2(uv.x * 2.6 - t * 0.011, uv.y * 5.5)) * 0.62 + vnoise(vec2(uv.x * 6.5 + t * 0.017, uv.y * 12.0 - t * 0.004)) * 0.38;
  col = mix(col, vec3(0.90, 0.91, 0.87), smoothstep(0.42, 0.82, mist) * far * band * 0.26);

  // a thin thread of smoke from the chimney
  vec2 sp = uv - vec2(0.533, 0.214);
  float rise = -sp.y;
  float spread = 0.005 + rise * 0.15;
  float off = sp.x - rise * 0.18 - 0.01 * sin(rise * 34.0 - t * 0.5);
  float plume = exp(-off * off / (spread * spread)) * smoothstep(0.0, 0.012, rise) * (1.0 - smoothstep(0.04, 0.17, rise));
  float puff = vnoise(vec2(sp.x * 55.0, rise * 38.0 + t * 0.42)) * 0.6 + vnoise(vec2(sp.x * 120.0 + 3.0, rise * 85.0 + t * 0.8)) * 0.4;
  col = mix(col, vec3(0.87, 0.87, 0.85), plume * smoothstep(0.3, 0.75, puff) * 0.2);

  // sunlight breathing through the pines
  vec2 ds = (uv - uSun) * vec2(uAspect, 1.0);
  float ang = atan(ds.y, ds.x), dist = length(ds);
  float ray = vnoise(vec2(ang * 9.0, t * 0.05)) * vnoise(vec2(ang * 21.0 + 4.0, t * 0.035 + 2.0));
  ray = smoothstep(0.16, 0.5, ray) * exp(-dist * 1.9) * smoothstep(0.02, 0.14, dist);
  float breath = 0.5 + 0.5 * sin(t * 0.17);
  col += vec3(1.0, 0.91, 0.72) * (ray * 0.13 + exp(-dist * 5.0) * 0.035 * breath);

  // warm lamps and windows
  float flick = 0.045 * sin(t * 2.1) + 0.03 * sin(t * 5.3 + 1.0) + 0.05 * (vnoise(vec2(t * 2.4, 3.0)) - 0.5);
  col += col * vec3(1.0, 0.8, 0.5) * m.b * flick;

  gl_FragColor = vec4(col * uFade, 1.0);
}
`;

export function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, (t) => {
      t.colorSpace = THREE.NoColorSpace;   // pass pixels through untouched
      t.flipY = false;                     // image space: v down
      t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      resolve(t);
    }, undefined, () => reject(new Error(`Không tải được ${url}`)));
  });
}

export function createScene(canvas, textures) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;  // no conversion: output == photo
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = false;

  const ripples = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, 0, 0));
  const uniforms = {
    uScene: { value: textures.scene }, uDepth: { value: textures.depth }, uMasks: { value: textures.masks },
    uKoi: { value: null },
    uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uKoiRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uRipples: { value: ripples },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uPondV: { value: new THREE.Vector2(POND_BOUNDS.v0, POND_BOUNDS.v1) },
    uSun: { value: new THREE.Vector2(0.07, 0.1) },
    uTime: { value: 0 }, uAspect: { value: CONFIG.imageAspect }, uSquash: { value: SQUASH },
    uParallax: { value: CONFIG.parallax }, uFade: { value: 1 }, uLife: { value: RIPPLE_LIFE },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let viewAspect = 1;
  let view = { cx: 0.5, cy: 0.5, zoom: 1 };

  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr));
    renderer.setSize(w, h, false);
    viewAspect = w / h;
  }

  return {
    renderer, uniforms, resize,
    get viewAspect() { return viewAspect; },
    get view() { return view; },
    setView(v) { view = clampView(v, viewAspect, CONFIG.imageAspect); return view; },
    setTime(t) { uniforms.uTime.value = t; },
    setFade(f) { uniforms.uFade.value = f; },
    setPointer(x, y) { uniforms.uPointer.value.set(x, y); },
    setKoi(texture, rect) { uniforms.uKoi.value = texture; uniforms.uKoiRect.value.set(rect.u0, rect.v0, rect.w, rect.h); },
    setRipples(list) {
      ripples.forEach((r, i) => { const it = list[i]; if (it) r.set(it.u, it.v, it.age, 1); else r.set(0, 0, 0, 0); });
    },
    render() {
      const r = visibleRect(view, viewAspect, CONFIG.imageAspect);
      uniforms.uRect.value.set(r.u0, r.v0, r.u1, r.v1);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
  };
}
