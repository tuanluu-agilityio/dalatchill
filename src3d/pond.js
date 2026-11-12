// The koi pond: reflective, see-through water, rocks on the rim, lily pads, the plank bridge.
import * as THREE from 'three';
import { Water } from '../vendor/jsm/objects/Water2.js';
import { POND, WATER_Y, BRIDGE, pondEdge, terrainHeight } from './world.js';
import { waterNormals, seeded } from './textures.js';
import { scatter, DETAIL_LAYER } from './models.js';

// Point on the contour pondEdge == k, at angle a.
function shore(a, k = 1) {
  const wobble = 1 + 0.11 * Math.sin(3 * a + 0.5) + 0.06 * Math.sin(5 * a + 2);
  return [POND.x + Math.cos(a) * POND.rx * wobble * k, POND.z + Math.sin(a) * POND.rz * wobble * k];
}

function lumpyRock(r, detail = 2) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position;
  const seen = new Map();
  for (let i = 0; i < p.count; i++) {         // same push for shared corners, so no cracks
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, 0.84 + r() * 0.3);
    const k = seen.get(key);
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  // rounded shading: the direction from the centre is close enough to the true normal
  const n = g.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
  return g;
}

export function createPond(scene, models) {
  const r = seeded(77);
  const tmp = { m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), e: new THREE.Euler() };
  const place = (mesh, i, x, y, z, sx, sy, sz, ry = r() * 6.28, rx = 0) => {
    tmp.p.set(x, y, z); tmp.q.setFromEuler(tmp.e.set(rx, ry, (r() - 0.5) * 0.3)); tmp.s.set(sx, sy, sz);
    mesh.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s));
  };

  // --- water ---------------------------------------------------------------
  const outline = new THREE.Shape();
  for (let i = 0; i <= 96; i++) {
    const [x, z] = shore((i / 96) * Math.PI * 2, 1.07);
    if (i === 0) outline.moveTo(x - POND.x, -(z - POND.z)); else outline.lineTo(x - POND.x, -(z - POND.z));
  }
  const water = new Water(new THREE.ShapeGeometry(outline, 24), {
    color: 0xcfe6dc, scale: 0.35, flowDirection: new THREE.Vector2(0.6, 0.25), flowSpeed: 0.012,
    textureWidth: 1024, textureHeight: 1024, reflectivity: 0.32,
    normalMap0: waterNormals(3), normalMap1: waterNormals(9),
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(POND.x, WATER_Y, POND.z);
  // the mirror copies the viewer's camera: keep the small ground cover out of it
  const drawWater = water.onBeforeRender;
  water.onBeforeRender = function (renderer, sc, camera, ...rest) {
    camera.layers.disable(DETAIL_LAYER);
    try { drawWater.call(this, renderer, sc, camera, ...rest); } finally { camera.layers.enable(DETAIL_LAYER); }
  };
  scene.add(water);

  const tint = new THREE.Color();
  // --- rocks on the rim, stones on the bed, moss mounds ------------------------
  // scanned mossy rocks: a ring on the rim, more lying on the bed
  const rim = [], bedRocks = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 + r() * 0.08, [x, z] = shore(a, 1.02 + r() * 0.1);
    const s = (0.26 + r() * 0.26) * (r() < 0.15 ? 1.5 : 1);
    rim.push({ x, y: Math.max(WATER_Y, terrainHeight(x, z)) - 0.1 * s, z, s, sy: s * (0.8 + r() * 0.4), ry: r() * 6.28 });
  }
  for (let i = 0; i < 40; i++) {
    let x, z; do { x = POND.x + (r() * 2 - 1) * POND.rx; z = POND.z + (r() * 2 - 1) * POND.rz; } while (pondEdge(x, z) > 0.92);
    const s = 0.2 + r() * 0.3;
    bedRocks.push({ x, y: terrainHeight(x, z) - 0.1 * s, z, s, sy: s * 0.6, ry: r() * 6.28, tint: tint.clone().setRGB(0.55, 0.75, 0.66) });
  }
  models.rock.forEach((v, k) => {
    scatter(scene, v, rim.filter((_, i) => i % models.rock.length === k), { cast: true });
    scatter(scene, v, bedRocks.filter((_, i) => i % models.rock.length === k));
  });

  // --- lily pads and blooms ---------------------------------------------------
  const padMat = new THREE.MeshStandardMaterial({ color: 0x4f8f3a, roughness: 0.6, side: THREE.DoubleSide });
  const padGeo = new THREE.CircleGeometry(1, 20, 0.25, Math.PI * 2 - 0.5); padGeo.rotateX(-Math.PI / 2);
  const clusters = [[-4.6, 4.2], [-3.2, 5.6], [3.6, 0.9], [1.6, 6.2], [-5.2, 1.6]];
  const pads = new THREE.InstancedMesh(padGeo, padMat, clusters.length * 6);
  const petals = new THREE.InstancedMesh(new THREE.ConeGeometry(0.04, 0.14, 5), new THREE.MeshStandardMaterial({ roughness: 0.6 }), clusters.length * 9);
  let pi = 0, fi = 0;
  const lilies = [];
  for (const [cx, cz] of clusters) {
    for (let j = 0; j < 6; j++) {
      const a = r() * 6.28, d = r() * 0.9, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (pondEdge(x, z) > 0.95) { place(pads, pi++, 0, -50, 0, 0.001, 0.001, 0.001); continue; }
      const s = 0.2 + r() * 0.16;
      place(pads, pi, x, WATER_Y + 0.012 + j * 0.001, z, s, 1, s);
      pads.setColorAt(pi++, tint.setHSL(0.27 + r() * 0.05, 0.5, 0.3 + r() * 0.1));
    }
    const hue = [0.92, 0.14, 0.0][Math.floor(r() * 3)];
    for (let k = 0; k < 9; k++) {            // one bloom per cluster: a ring of petals
      const a = (k / 9) * 6.28, lean = k < 6 ? 0.9 : 0.4, rad = k < 6 ? 0.06 : 0.025;
      tmp.p.set(cx + Math.cos(a) * rad, WATER_Y + 0.07, cz + Math.sin(a) * rad);
      tmp.q.setFromEuler(tmp.e.set(Math.cos(a) * -lean, 0, Math.sin(a) * lean, 'YXZ')); tmp.s.set(1, 1, 1);
      petals.setMatrixAt(fi, tmp.m.compose(tmp.p, tmp.q, tmp.s));
      petals.setColorAt(fi++, tint.setHSL(hue, hue === 0 ? 0.0 : 0.6, 0.88));
    }
    lilies.push([cx, cz]);
  }
  pads.receiveShadow = true; scene.add(pads, petals);

  // --- bridge -----------------------------------------------------------------
  const bridge = new THREE.Group();
  const [ax, az] = BRIDGE.a, [bx, bz] = BRIDGE.b;
  const len = Math.hypot(bx - ax, bz - az) + 1.0;
  bridge.position.set((ax + bx) / 2, BRIDGE.deck, (az + bz) / 2);
  bridge.rotation.y = -Math.atan2(bz - az, bx - ax);
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x9b6a3c, roughness: 0.85 });
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x6d4524, roughness: 0.9 });
  const planks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.05, BRIDGE.half * 2), plankMat, Math.floor(len / 0.23));
  for (let i = 0; i < planks.count; i++) {
    tmp.p.set(-len / 2 + 0.12 + i * 0.23, (r() - 0.5) * 0.008, 0); tmp.q.setFromEuler(tmp.e.set(0, (r() - 0.5) * 0.03, 0)); tmp.s.set(1, 1, 1);
    planks.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s));
    planks.setColorAt(i, tint.setHSL(0.07, 0.42, 0.36 + r() * 0.1));
  }
  planks.castShadow = planks.receiveShadow = true; bridge.add(planks);
  for (const z of [-BRIDGE.half + 0.15, BRIDGE.half - 0.15]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(len, 0.16, 0.14), beamMat); beam.position.set(0, -0.11, z); beam.castShadow = true; bridge.add(beam);
  }
  for (const x of [-len / 2 + 0.5, 0, len / 2 - 0.5]) for (const z of [-BRIDGE.half + 0.15, BRIDGE.half - 0.15]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8), beamMat); post.position.set(x, -0.8, z); bridge.add(post);
  }
  scene.add(bridge);

  // --- rings that spread where the water is touched ----------------------------
  const ringGeo = new THREE.RingGeometry(0.9, 1, 48); ringGeo.rotateX(-Math.PI / 2);
  const rings = Array.from({ length: 12 }, () => {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.renderOrder = 4; scene.add(m); return { mesh: m, t0: -99 };
  });
  let next = 0;

  return {
    water,
    isWater: (x, z) => pondEdge(x, z) < 1,
    ripple(x, z, t) {
      for (let k = 0; k < 3; k++) { const ring = rings[next++ % rings.length]; ring.t0 = t + k * 0.28; ring.mesh.position.set(x, WATER_Y + 0.008, z); }
    },
    update(t) {
      for (const ring of rings) {
        const age = t - ring.t0, live = age >= 0 && age < 3.2;
        ring.mesh.visible = live;
        if (!live) continue;
        const s = 0.1 + age * 0.75; ring.mesh.scale.set(s, 1, s);
        ring.mesh.material.opacity = 0.34 * (1 - age / 3.2) ** 1.6;
      }
    },
  };
}
