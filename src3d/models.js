// Scanned plants and rocks (Poly Haven, CC0). Loads the packs and scatters them as instances.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';

const PACKS = ['pine', 'fern', 'shrub', 'understory', 'calathea', 'grass', 'grass_tuft', 'celandine', 'ursinia', 'periwinkle', 'weed', 'rock', 'boulder', 'stump'];
const FAR = ['a', 'b', 'c'];                        // pine variants that have far-away pictures
const BASE = new URL('../assets/models/', import.meta.url).href;
const TEXTURES = new URL('../assets/textures/', import.meta.url).href;

const LEAF_LIFT = 1.6;
// Some scans are of dry or shaded plants; this garden is watered and in the sun.
const LIFT = {
  grass_medium_01: [1.7, 2.2, 1.3], grass_medium_02: [1.6, 2.0, 1.2], pine_sapling_medium_twig: [1.5, 2.0, 1.3],
  shrub_02: [1.15, 1.6, 0.9], shrub_03: [1.1, 1.45, 0.9],
};
export const DETAIL_LAYER = 1;                      // small ground cover: drawn for the eye, skipped in the water's mirror

// Make leaves sway: the higher above the root, the further they move.
export function addWind(material, wind, strength = 1) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = wind;
    shader.vertexShader = 'uniform float uWind;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      #ifdef USE_INSTANCING
        vec3 root = instanceMatrix[3].xyz;
        float sway = sin(uWind * 1.3 + root.x * 0.35 + root.z * 0.27) + 0.5 * sin(uWind * 2.9 + root.x * 1.1 + position.y * 2.0);
        float bend = position.y * position.y * ${strength.toFixed(3)};
        transformed.x += sway * bend; transformed.z += sway * bend * 0.45;
      #endif`);
  };
  material.customProgramCacheKey = () => `wind${strength}`;
  return material;
}

function tidy(material) {
  const cut = material.transparent || material.alphaTest > 0;
  material.transparent = false; material.depthWrite = true;
  material.vertexColors = false;                   // the scans keep wind masks there, not colour
  if (cut) { material.alphaTest = 0.5; material.side = THREE.DoubleSide; }
  if (/rock|stump/.test(material.name)) material.color.setScalar(1.7);        // scanned in deep shade
  if (cut || /twig/.test(material.name)) {
    // leaves let light through: scans are dark on their own, so lift them and let them glow a little
    material.color.setRGB(...(LIFT[material.name] || [LEAF_LIFT, LEAF_LIFT, LEAF_LIFT]));
    material.emissiveMap = material.map; material.emissive.setRGB(0.2, 0.24, 0.14);
  }
  return material;
}

// One pack -> [{ name, parts: [{ geometry, material }], size: Vector3 }], sorted by name
function variantsOf(gltf) {
  const out = [];
  gltf.scene.updateMatrixWorld(true);
  for (const node of gltf.scene.children) {
    const parts = [];
    node.traverse((o) => {
      if (!o.isMesh) return;
      const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
      parts.push({ geometry, material: tidy(o.material) });
    });
    if (!parts.length) continue;
    const box = new THREE.Box3();
    for (const p of parts) { p.geometry.computeBoundingBox(); box.union(p.geometry.boundingBox); }
    out.push({ name: node.name.replace(/_LOD0$/, ''), parts, size: box.getSize(new THREE.Vector3()) });
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : 1));
}

export async function loadModels(onProgress = () => {}) {
  const gltf = new GLTFLoader(), tex = new THREE.TextureLoader();
  let done = 0; const total = PACKS.length + FAR.length * 2 + 1;
  const tick = (v) => { onProgress(++done / total); return v; };
  const models = {};
  const jobs = PACKS.map((name) => gltf.loadAsync(`${BASE}${name}.glb`).then((g) => { models[name] = variantsOf(g); tick(); }));
  const far = {};
  jobs.push(fetch(`${BASE}pine_far.json`).then((r) => r.json()).then((meta) => { for (const k of FAR) far[k] = { ...meta[k], maps: [] }; tick(); }));
  const pics = FAR.flatMap((k) => [0, 1].map((v) => tex.loadAsync(`${BASE}pine_${k}_far${v}.png`).then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return tick([k, v, t]); })));
  // the photographed ground must be there before the first frame, or the lawn starts out black
  const GROUND = { lawn: 'leafy_grass_diff', lawnNormal: 'leafy_grass_nor', forest: 'forest_ground_04_diff', gravel: 'gravel_floor_diff' };
  models.ground = {};
  for (const [key, file] of Object.entries(GROUND)) jobs.push(tex.loadAsync(`${TEXTURES}${file}.jpg`).then((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (key !== 'lawnNormal') t.colorSpace = THREE.SRGBColorSpace;
    models.ground[key] = t;
  }));
  await Promise.all(jobs);
  for (const [k, v, t] of await Promise.all(pics)) far[k].maps[v] = t;
  models.pineFar = far;
  return models;
}

const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
export function matrixOf(m, { x, y, z, s = 1, sy = s, ry = 0, rx = 0, rz = 0 }) {
  return m.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz, 'YXZ')), S.set(s, sy, s));
}

// Draw one variant at many spots. spots: [{ x, y, z, s, sy, ry, rx, rz, tint }]
export function scatter(scene, variant, spots, { cast = false, receive = true, layer = 0, material = null } = {}) {
  if (!spots.length) return [];
  return variant.parts.map((part) => {
    const mesh = new THREE.InstancedMesh(part.geometry, material ? material(part.material) : part.material, spots.length);
    spots.forEach((spot, i) => { mesh.setMatrixAt(i, matrixOf(M, spot)); if (spot.tint) mesh.setColorAt(i, spot.tint); });
    mesh.castShadow = cast; mesh.receiveShadow = receive; mesh.layers.set(layer);
    mesh.computeBoundingSphere();
    scene.add(mesh);
    return mesh;
  });
}
