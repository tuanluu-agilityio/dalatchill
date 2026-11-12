// Small living details drawn over the photo: dust in the sunbeams and a few butterflies.
// Positions are in image coordinates so they stay glued to the scene while the camera moves.
import * as THREE from '../vendor/three.module.js';

const DUST = 34;
const BUTTERFLIES = [
  { u: 0.105, v: 0.555, r: 0.045, colour: [1.0, 0.97, 0.9], size: 15 },
  { u: 0.945, v: 0.575, r: 0.035, colour: [1.0, 0.86, 0.45], size: 16 },
  { u: 0.35, v: 0.775, r: 0.04, colour: [0.98, 0.98, 1.0], size: 17 },
];

const VERT = /* glsl */`
attribute vec2 aPos;
attribute vec4 aLook;     // size px, kind (0 dust, 1 butterfly), phase, alpha
attribute vec3 aColour;
uniform vec4 uRect;
uniform float uScale;
varying vec4 vLook; varying vec3 vColour;
void main() {
  vec2 n = (aPos - uRect.xy) / (uRect.zw - uRect.xy);
  gl_Position = vec4(n.x * 2.0 - 1.0, 1.0 - n.y * 2.0, 0.0, 1.0);
  gl_PointSize = aLook.x * uScale;
  vLook = aLook; vColour = aColour;
}
`;
const FRAG = /* glsl */`
precision highp float;
varying vec4 vLook; varying vec3 vColour;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a;
  vec3 col = vColour;
  if (vLook.y < 0.5) {
    a = smoothstep(0.5, 0.0, length(c));
    a *= a;
  } else {
    float flap = 0.14 + 0.86 * abs(sin(vLook.z));
    float x = c.x / flap;
    float wing = length(vec2(abs(x) - 0.2, c.y * 1.3 + 0.04 * sign(c.y)));
    a = smoothstep(0.21, 0.15, wing) * step(abs(x), 0.5);
    float body = smoothstep(0.035, 0.015, abs(c.x)) * smoothstep(0.3, 0.2, abs(c.y));
    col = mix(col * (0.8 + 0.2 * flap), vec3(0.15, 0.12, 0.1), body);
    a = max(a * 0.9, body * 0.9);
  }
  gl_FragColor = vec4(col, a * vLook.w);
}
`;

export function createAmbient(renderer) {
  const count = DUST + BUTTERFLIES.length;
  const aPos = new THREE.BufferAttribute(new Float32Array(count * 2), 2);
  const aLook = new THREE.BufferAttribute(new Float32Array(count * 4), 4);
  const aColour = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  aPos.setUsage(THREE.DynamicDrawUsage); aLook.setUsage(THREE.DynamicDrawUsage);

  const dust = Array.from({ length: DUST }, () => ({
    u: 0.02 + Math.random() * 0.5, v: 0.1 + Math.random() * 0.5,
    size: 2.5 + Math.random() * 4, seed: Math.random() * 100, rate: 0.2 + Math.random() * 0.5,
  }));
  dust.forEach((_, i) => aColour.setXYZ(i, 1.0, 0.94, 0.78));
  BUTTERFLIES.forEach((b, i) => aColour.setXYZ(DUST + i, ...b.colour));

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aPos', aPos); geo.setAttribute('aLook', aLook); geo.setAttribute('aColour', aColour);
  const uniforms = { uRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uScale: { value: 1 } };
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthTest: false, depthWrite: false });
  const points = new THREE.Points(geo, material); points.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(points);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function update(t) {
    dust.forEach((d, i) => {
      const u = d.u + Math.sin(t * 0.05 * d.rate + d.seed) * 0.03 + t * 0.0006 * d.rate;
      const v = d.v + Math.cos(t * 0.07 * d.rate + d.seed * 1.7) * 0.025;
      const twinkle = 0.5 + 0.5 * Math.sin(t * d.rate * 1.3 + d.seed * 3.1);
      // brightest inside the sunbeams fanning out from the top-left corner
      const beam = Math.max(0, 1 - Math.hypot((u % 0.6) - 0.07, v - 0.1) * 1.5);
      aPos.setXY(i, 0.02 + ((u - 0.02) % 0.52), v);
      aLook.setXYZW(i, d.size, 0, 0, 0.32 * twinkle * beam);
    });
    BUTTERFLIES.forEach((b, i) => {
      const k = i * 2.3;
      // a wandering loop near its flowers, with a pause-and-flutter rhythm
      const u = b.u + Math.sin(t * 0.21 + k) * b.r + Math.sin(t * 0.83 + k * 2.0) * b.r * 0.3;
      const v = b.v + Math.sin(t * 0.33 + k * 1.3) * b.r * 0.7 + Math.cos(t * 1.1 + k) * b.r * 0.2;
      aPos.setXY(DUST + i, u, v);
      aLook.setXYZW(DUST + i, b.size, 1, t * 11 + k, 0.92);
    });
    aPos.needsUpdate = aLook.needsUpdate = true;
  }

  function render(rect, zoom, heightPx) {
    uniforms.uRect.value.set(rect.u0, rect.v0, rect.u1, rect.v1);
    uniforms.uScale.value = zoom * heightPx / 768;
    renderer.render(scene, camera);
  }

  return { update, render };
}
