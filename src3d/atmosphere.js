// Sky, sun, fog and drifting mist: the early-morning light of the pine hills.
import * as THREE from 'three';
import { Sky } from '../vendor/jsm/objects/Sky.js';

const MIST_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const MIST_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uTime, uSeed, uOpacity;
uniform vec3 uColour;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vec2(vUv.x * 5.0 + uSeed + uTime * 0.012, vUv.y * 2.2);
  float n = noise(p) * 0.6 + noise(p * 2.3 + 7.0) * 0.4;
  float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
  gl_FragColor = vec4(uColour, smoothstep(0.3, 0.8, n) * edge * uOpacity);
}
`;

export function createAtmosphere(scene, renderer) {
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(68), THREE.MathUtils.degToRad(222));

  const sky = new Sky();
  sky.scale.setScalar(4000);
  const u = sky.material.uniforms;
  u.turbidity.value = 11; u.rayleigh.value = 1.1; u.mieCoefficient.value = 0.012; u.mieDirectionalG.value = 0.86;
  u.sunPosition.value.copy(sunDir);
  if (u.cloudCoverage) { u.cloudCoverage.value = 0.45; u.cloudDensity.value = 0.35; }
  scene.add(sky);

  const fogColour = new THREE.Color(0xdfe3d8);
  scene.fog = new THREE.FogExp2(fogColour, 0.019);

  scene.add(new THREE.HemisphereLight(0xf0f3f5, 0x6f7f52, 2.1));
  const sun = new THREE.DirectionalLight(0xffdcae, 3.0);
  sun.position.copy(sunDir).multiplyScalar(70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 160 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);

  // sheets of mist standing among the trees
  const mist = [];
  const geo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.3, r = 26 + (i % 4) * 9;
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: MIST_VERT, fragmentShader: MIST_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uSeed: { value: i * 3.7 }, uOpacity: { value: 0.5 }, uColour: { value: new THREE.Color(0xe9ece4) } },
    }));
    m.scale.set(46, 11, 1);
    m.position.set(Math.cos(a) * r, 5 + (i % 3) * 2.2, Math.sin(a) * r + 2);
    m.lookAt(0, m.position.y, 2);
    m.renderOrder = 5;
    scene.add(m); mist.push(m);
  }

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  return {
    sunDir,
    update(t) {
      for (const m of mist) m.material.uniforms.uTime.value = t;
      if (u.time) u.time.value = t;
    },
  };
}
