// Draws the school into an offscreen texture laid out in image space (the pond's bounding
// box). The scene shader then samples it through the water.
import * as THREE from '../vendor/three.module.js';
import { CONFIG } from './config.js';
import { SQUASH, SKIN_COUNT, bodyLength } from './koi-sim.js';
import { POND_BOUNDS } from './pond.js';
import { paintKoiSkins } from './koi-skins.js';

const PAD = 0.03;
export const KOI_RECT = {
  u0: POND_BOUNDS.u0 - PAD, v0: POND_BOUNDS.v0 - PAD,
  w: POND_BOUNDS.u1 - POND_BOUNDS.u0 + PAD * 2, h: POND_BOUNDS.v1 - POND_BOUNDS.v0 + PAD * 2,
};
const SEGMENTS = 28;
const SPAN = 0.375;   // lateral extent of the skin, in body lengths (SKIN_H / SKIN_W)

const VERT = /* glsl */`
attribute vec2 iPos;      // u, v
attribute vec4 iMotion;   // heading, phase, turn, speed
attribute vec2 iLook;     // body length (image-width units), skin row
uniform vec4 uRect;       // u0, v0, w, h
uniform float uSquash, uAspect;
uniform float uSpan;
uniform float uSkinCount;
varying vec2 vTex;
void main() {
  float s = position.x + 0.5;                 // 0 tail tip .. 1 nose
  float back = 1.0 - s;
  float amp = 0.035 + iMotion.w * 1.1;
  float wave = sin(iMotion.y - back * 5.2) * amp * (0.12 + back * back * 1.25);
  float bend = -iMotion.z * 0.045 * back * back;       // lean into the turn
  // The spine lies on the foreshortened water plane; the body is round, so its
  // thickness is not foreshortened.
  float c = cos(iMotion.x), sn = sin(iMotion.x);
  vec2 dir = vec2(c, sn * uSquash);
  vec2 side = vec2(-sn, c * uSquash);
  vec2 thick = normalize(vec2(-dir.y, dir.x));
  vec2 p = (dir * position.x + side * (wave + bend) + thick * position.y * uSpan * 0.82) * iLook.x;
  vec2 uv = iPos + vec2(p.x, p.y * uAspect);
  vec2 n = (uv - uRect.xy) / uRect.zw;
  gl_Position = vec4(n.x * 2.0 - 1.0, 1.0 - n.y * 2.0, 0.0, 1.0);
  vTex = vec2(s, (iLook.y + position.y + 0.5) / uSkinCount);
}
`;
const FRAG = /* glsl */`
precision highp float;
uniform sampler2D uSkins;
varying vec2 vTex;
void main() {
  vec4 t = texture2D(uSkins, vTex);
  gl_FragColor = vec4(t.rgb * t.a, t.a);    // premultiplied
}
`;

export function createKoiRenderer(renderer, count) {
  const width = 2048, height = Math.round(width * (KOI_RECT.h / KOI_RECT.w) / CONFIG.imageAspect);
  const target = new THREE.WebGLRenderTarget(width, height, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  target.texture.colorSpace = THREE.NoColorSpace;

  const skins = new THREE.CanvasTexture(paintKoiSkins());
  skins.colorSpace = THREE.NoColorSpace; skins.flipY = false; skins.premultiplyAlpha = false;
  skins.minFilter = THREE.LinearMipmapLinearFilter; skins.generateMipmaps = true;

  const base = new THREE.PlaneGeometry(1, 1, SEGMENTS, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index; geo.setAttribute('position', base.attributes.position);
  const iPos = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2);
  const iMotion = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  const iLook = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2);
  for (const a of [iPos, iMotion, iLook]) a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('iPos', iPos); geo.setAttribute('iMotion', iMotion); geo.setAttribute('iLook', iLook);
  geo.instanceCount = count;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      uSkins: { value: skins },
      uRect: { value: new THREE.Vector4(KOI_RECT.u0, KOI_RECT.v0, KOI_RECT.w, KOI_RECT.h) },
      uSquash: { value: SQUASH }, uAspect: { value: CONFIG.imageAspect },
      uSpan: { value: SPAN },
      uSkinCount: { value: SKIN_COUNT },
    },
    transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(geo, material); mesh.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(mesh);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function update(school) {
    // far fish first so nearer ones draw over them
    const order = [...school].sort((a, b) => a.v - b.v);
    order.forEach((k, i) => {
      iPos.setXY(i, k.u, k.v);
      iMotion.setXYZW(i, k.heading, k.phase, k.turn, k.speed);
      iLook.setXY(i, bodyLength(k), k.skin);
    });
    iPos.needsUpdate = iMotion.needsUpdate = iLook.needsUpdate = true;
  }

  const clear = new THREE.Color(0, 0, 0);
  function render() {
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.setClearColor(clear, 0); renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(prev);
  }

  return { update, render, texture: target.texture, rect: KOI_RECT };
}
