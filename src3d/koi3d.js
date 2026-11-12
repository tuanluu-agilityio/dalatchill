// Koi as real 3D bodies under the water: a rounded body whose spine bends as it swims,
// with a flat sheet for the soft tail and fins.
import * as THREE from 'three';
import { paintKoiSkins } from '../src/koi-skins.js';
import { SKINS } from './koi-sim3d.js';

const RINGS = 16, SIDES = 10, SPAN = 0.375;   // SPAN: width of a skin row, in body lengths

// half-width of the body at s (0 tail tip .. 1 nose); matches the painted skin
function halfWidth(s) {
  if (s < 0.2) return 0;
  const t = (s - 0.2) / 0.8;
  return 0.02 * (1 - t) + 0.092 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.85);
}

function koiGeometry(skin) {
  const pos = [], uv = [], idx = [];
  const v = (lateral) => (skin + 0.5 + lateral / SPAN) / SKINS;      // top-down projection into the atlas
  for (let i = 0; i <= RINGS; i++) {
    const s = 0.2 + 0.8 * i / RINGS, w = halfWidth(s);
    for (let j = 0; j <= SIDES; j++) {
      const a = (j / SIDES) * Math.PI * 2;
      const z = Math.cos(a) * w, y = Math.sin(a) * w * 0.95;
      pos.push(s - 0.5, y, z); uv.push(s, v(z * (y < 0 ? 0.6 : 1)));
    }
  }
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < SIDES; j++) {
    const a = i * (SIDES + 1) + j, b = a + SIDES + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  // the flat sheet carrying tail and fins, sampled straight from the skin
  const base = pos.length / 3, cols = 20;
  for (let i = 0; i <= cols; i++) for (const side of [-1, 1]) {
    const s = i / cols;
    pos.push(s - 0.5, 0, side * SPAN / 2); uv.push(s, v(side * SPAN / 2));
  }
  for (let i = 0; i < cols; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  g.userData.rest = Float32Array.from(pos);
  return g;
}

export function createKoi3D(scene, school) {
  const atlas = new THREE.CanvasTexture(paintKoiSkins());
  atlas.colorSpace = THREE.SRGBColorSpace; atlas.flipY = false; atlas.anisotropy = 8;
  const material = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.42, alphaTest: 0.35, side: THREE.DoubleSide });

  const fish = school.map((k) => {
    const mesh = new THREE.Mesh(koiGeometry(k.skin), material);
    mesh.scale.setScalar(k.length); mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  });

  return {
    update() {
      school.forEach((k, i) => {
        const mesh = fish[i], p = mesh.geometry.attributes.position, rest = mesh.geometry.userData.rest;
        const amp = 0.03 + k.speed * 0.045;
        for (let n = 0; n < p.count; n++) {
          const back = 0.5 - rest[n * 3];              // 0 at the nose, 1 at the tail tip
          const wave = Math.sin(k.phase - back * 5.2) * amp * (0.12 + back * back * 1.25) - k.turn * 0.05 * back * back;
          p.setZ(n, rest[n * 3 + 2] + wave);
        }
        p.needsUpdate = true;
        mesh.position.set(k.x, k.y, k.z);
        mesh.rotation.y = -k.heading;
      });
    },
  };
}
