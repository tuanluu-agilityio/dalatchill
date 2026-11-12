// Everything that grows: pines, ferns, shrubs, hydrangeas, flowers, grass. Scanned from real plants.
import * as THREE from 'three';
import { terrainHeight, pondEdge, distToPath, isWalkable, HOUSE, HYDRANGEA, START, BRIDGE } from './world.js';
import { seeded } from './textures.js';
import { scatter, matrixOf, addWind, DETAIL_LAYER } from './models.js';

const M = new THREE.Matrix4(), P = new THREE.Vector3();
const NEAR_PINES = window.matchMedia('(pointer: coarse)').matches ? 6 : 14;                             // pines drawn as full models; the rest are pictures of the same trees
const PINES = 130, GRASS = 11000, CLUMPS = 800;

// A sphere pushed in and out a little: a hydrangea head.
function lumpy(detail, r, amount = 0.3) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, 1 - amount / 2 + r() * amount);
    const k = seen.get(key); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  const n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { P.set(p.getX(i), p.getY(i), p.getZ(i)).normalize(); n.setXYZ(i, P.x, P.y, P.z); }
  return g;
}

export function createFlora(scene, models) {
  const r = seeded(2024);
  const wind = { value: 0 };
  const trunks = [];                              // { x, z, r } for the walker to bump into
  const shade = (lo = 0.78, hi = 1) => { const k = lo + r() * (hi - lo); return new THREE.Color(k, k * (0.96 + r() * 0.08), k * 0.94); };
  const windy = (k) => (m) => { if (!m.userData.windy) { m.userData.windy = true; addWind(m, wind, k); } return m; };
  // the open view from the starting point across the pond to the house
  const inView = (x, z) => z > 4 && z < 27 && Math.abs(x + 1.5) < 9.5;
  const clearOf = (x, z, pad = 0) => pondEdge(x, z) > 1.22 + pad && !(Math.abs(x - HOUSE.x) < HOUSE.w / 2 + 2.2 + pad && Math.abs(z - HOUSE.z - 1.2) < HOUSE.d / 2 + 4 + pad)
    && distToPath(x, z) > 1.3 + pad && Math.hypot(x - START.x, z - START.z) > 2.5;
  const ring = (near, far) => { const a = r() * 6.28, d = near + r() * (far - near); return [Math.cos(a) * d, 2 + Math.sin(a) * d]; };
  // share the spots out among a pack's variants and draw them
  const spread = (variants, spots, opts) => variants.forEach((v, k) => scatter(scene, v, spots.filter((_, i) => i % variants.length === k), opts));

  // ---- pines ----------------------------------------------------------------
  const heroes = [[-12, 13], [-15.5, 6], [16.5, 7.5], [15, -3], [-8, -17], [1, -19], [19, -15], [-17, -8], [12, 17], [-6, 24]];
  const spots = heroes.slice();
  for (let i = 0; spots.length < PINES && i < 4000; i++) {
    const a = r() * 6.28, d = 17 + r() * r() * 62, x = Math.cos(a) * d, z = 2 + Math.sin(a) * d;
    if (clearOf(x, z, 1.5) && !inView(x, z)) spots.push([x, z]);
  }
  const pines = spots.map(([x, z], i) => {
    const v = i % 3, tall = 13 + r() * 9, s = tall / models.pine[v].size.y;
    trunks.push({ x, z, r: 0.16 * s });
    return { x, y: terrainHeight(x, z) - 0.15, z, s, ry: r() * 6.28, v, d: 0 };
  });
  const pineSets = models.pine.map((variant, v) => {
    const far = models.pineFar['abc'[v]], count = pines.filter((p) => p.v === v).length;
    const full = variant.parts.map((part) => {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, NEAR_PINES);
      mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh); return mesh;
    });
    const cards = far.maps.map((map, k) => {
      const w = far.height * map.image.width / map.image.height;
      const geo = new THREE.PlaneGeometry(w, far.height).translate(0, far.height / 2, 0); if (k) geo.rotateY(Math.PI / 2);
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, color: 0xe6ecdc }), count);
      mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh);
      // every pine throws its shadow from its picture, near or far, so the shadows never change as you walk
      const ghost = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, colorWrite: false, depthWrite: false }), count);
      let n = 0; for (const p of pines) if (p.v === v) ghost.setMatrixAt(n++, matrixOf(M, p));
      ghost.castShadow = true; ghost.frustumCulled = false; scene.add(ghost);
      return mesh;
    });
    return { full, cards };
  });
  let pinesAt = null;
  function sortPines(px, pz) {
    for (const p of pines) p.d = Math.hypot(p.x - px, p.z - pz);
    const order = pines.slice().sort((a, b) => a.d - b.d);
    for (const set of pineSets) { for (const m of [...set.full, ...set.cards]) m.count = 0; }
    order.forEach((p, i) => {
      const set = pineSets[p.v], group = i < NEAR_PINES ? set.full : set.cards;
      matrixOf(M, p);
      for (const m of group) m.setMatrixAt(m.count++, M);
    });
    for (const set of pineSets) for (const m of [...set.full, ...set.cards]) m.instanceMatrix.needsUpdate = true;
    pinesAt = { x: px, z: pz };
  }
  sortPines(START.x, START.z);

  // ---- ferns and tree ferns -------------------------------------------------
  const ferns = [];
  for (let i = 0; i < 120; i++) {
    let x, z; do { [x, z] = ring(7, 37); } while (!clearOf(x, z) || (inView(x, z) && r() < 0.8));
    ferns.push({ x, y: terrainHeight(x, z) - 0.03, z, s: 1.1 + r() * 1.1, ry: r() * 6.28, tint: shade() });
  }
  spread(models.fern, ferns, { cast: true, material: windy(0.1) });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3f3226, roughness: 1 });
  const crowns = [], stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.16, 1, 8).translate(0, 0.5, 0), trunkMat, 10);
  for (let i = 0; i < 10; i++) {
    let x, z; do { [x, z] = ring(9, 30); } while (!clearOf(x, z, 0.8) || inView(x, z));
    const h = 1.6 + r() * 1.6, y = terrainHeight(x, z) - 0.05;
    stems.setMatrixAt(i, matrixOf(M, { x, y, z, s: 1, sy: h }));
    for (let k = 0; k < 2; k++) crowns.push({ x, y: y + h - 0.25 + k * 0.12, z, s: 3 + r() * 1.2, ry: r() * 6.28 });
    trunks.push({ x, z, r: 0.3 });
  }
  stems.castShadow = true; scene.add(stems);
  spread([models.fern[1], models.fern[2]], crowns, { cast: true, material: windy(0.1) });

  // ---- shrubs ---------------------------------------------------------------
  const shrubs = [], beds = [];                     // beds: where flowers go
  for (let i = 0; i < 150; i++) {
    const byPorch = i < 30;
    let x, z, ok;
    do {
      if (byPorch) {
        x = HOUSE.x + (r() - 0.5) * (HOUSE.w + 5); z = HOUSE.z + HOUSE.d / 2 + HOUSE.porch + 0.9 + r() * 2.2;
        if (x > HOUSE.x + 1.2) z += 1.7;                                   // step around the stone terrace
        ok = Math.abs(x - (HOUSE.x + 0.55)) > 1.6;                         // leave the way to the steps clear
      } else {
        if (i < 75) { const a = r() * 6.28, d = 1.3 + r() * 0.5; x = Math.cos(a) * 7 * d; z = 3 + Math.sin(a) * 4.5 * d; }   // around the pond
        else [x, z] = ring(9, 33);
        ok = clearOf(x, z) && !(inView(x, z) && r() < 0.85) && Math.hypot(x - BRIDGE.a[0], z - BRIDGE.a[1]) > 1.6 && Math.hypot(x - BRIDGE.b[0], z - BRIDGE.b[1]) > 1.6;
      }
    } while (!ok);
    const s = i < 75 ? 0.3 + r() * 0.3 : 0.45 + r() * 0.55;
    shrubs.push({ x, y: terrainHeight(x, z) - 0.04, z, s, ry: r() * 6.28, tint: shade() });
    beds.push({ x, z, s });
  }
  spread(models.shrub, shrubs, { cast: true });

  // ---- understory: small leafy plants, weeds, calatheas in the shade ----------
  const low = [], weeds = [], shady = [];
  for (let i = 0; i < 170; i++) { const [x, z] = ring(6, 31); if (clearOf(x, z) && !(inView(x, z) && r() < 0.6)) low.push({ x, y: terrainHeight(x, z) - 0.02, z, s: 1 + r() * 0.9, ry: r() * 6.28 }); }
  for (let i = 0; i < 220; i++) { const [x, z] = ring(5, 28); if (clearOf(x, z, -0.2)) weeds.push({ x, y: terrainHeight(x, z) - 0.01, z, s: 1 + r() * 0.8, ry: r() * 6.28 }); }
  for (let i = 0; i < 30; i++) {
    const x = HOUSE.x + (r() - 0.5) * (HOUSE.w + 6), z = HOUSE.z + (r() < 0.5 ? HOUSE.d / 2 + HOUSE.porch + 0.6 + r() * 1.6 : -HOUSE.d / 2 - 0.8 - r() * 2);
    if (Math.abs(x - (HOUSE.x + 0.55)) > 1.4 && isWalkable(x, z)) shady.push({ x, y: terrainHeight(x, z) - 0.02, z, s: 1 + r() * 0.6, ry: r() * 6.28 });
  }
  spread(models.understory, low, { cast: true, material: windy(0.15) });
  spread(models.weed, weeds, { layer: DETAIL_LAYER });
  spread(models.calathea, shady, { cast: true });

  // ---- boulders and old stumps under the trees --------------------------------
  const boulders = [], stumps = [];
  for (let i = 0; i < 9; i++) {
    let x, z; do { [x, z] = ring(11, 30); } while (!clearOf(x, z, 1) || inView(x, z));
    const s = 0.4 + r() * 0.5;
    boulders.push({ x, y: terrainHeight(x, z) - 0.12 * s, z, s, ry: r() * 6.28 }); trunks.push({ x, z, r: 0.85 * s });
  }
  for (let i = 0; i < 4; i++) {
    let x, z; do { [x, z] = ring(13, 28); } while (!clearOf(x, z, 1) || inView(x, z));
    stumps.push({ x, y: terrainHeight(x, z) - 0.04, z, s: 0.8 + r() * 0.4, ry: r() * 6.28 }); trunks.push({ x, z, r: 0.55 });
  }
  spread(models.boulder, boulders, { cast: true });
  spread(models.stump, stumps, { cast: true });

  // ---- hydrangeas: real bushes carrying pale blue and violet heads --------------
  const florets = document.createElement('canvas'); florets.width = florets.height = 256;
  { const ctx = florets.getContext('2d'); ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 520; i++) {                // many small four-petalled florets
      const x = r() * 256, y = r() * 256, a = r() * 1.57, k = 5 + r() * 3;
      for (let q = 0; q < 4; q++) { ctx.fillStyle = `rgba(255,255,255,${0.75 + r() * 0.25})`; ctx.beginPath(); ctx.ellipse(x + Math.cos(a + q * 1.57) * k * 0.55, y + Math.sin(a + q * 1.57) * k * 0.55, k * 0.55, k * 0.42, a + q * 1.57, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = 'rgba(90,90,70,0.8)'; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, 6.3); ctx.fill();
    } }
  const floretMap = new THREE.CanvasTexture(florets); floretMap.colorSpace = THREE.SRGBColorSpace; floretMap.wrapS = floretMap.wrapT = THREE.RepeatWrapping; floretMap.repeat.set(3, 2);
  const heads = new THREE.InstancedMesh(lumpy(2, r, 0.2), new THREE.MeshStandardMaterial({ roughness: 0.85, map: floretMap, bumpMap: floretMap, bumpScale: 1.5 }), 420);
  const bushes = []; let hi = 0; const C = new THREE.Color();
  const hydr = [[0, 0], [1.9, 1.2], [-1.6, 1.6], [0.6, -2.1], [-2.4, -0.8], [2.6, -1.4], [-0.6, 3.2]].map(([dx, dz]) => [HYDRANGEA.x + dx, HYDRANGEA.z + dz])
    .concat([[15.5, -4], [17, -1.5], [14.5, 1.5], [-13.5, 9], [-15, 11.5], [16.5, 12], [18, 14.5]]);
  hydr.forEach(([x, z], i) => {
    const s = 0.8 + r() * 0.35, y = terrainHeight(x, z);
    bushes.push({ x, y: y - 0.05, z, s: s * 1.25, ry: r() * 6.28 });
    const pink = i >= 7 && i % 2 === 1;
    for (let k = 0; k < 30 && hi < 420; k++) {
      const a = r() * 6.28, up = 0.25 + r() * 0.75, rad = s * 0.8 * Math.sqrt(1 - (up * 0.85) ** 2);
      heads.setMatrixAt(hi, matrixOf(M, { x: x + Math.cos(a) * rad, y: y + s * (0.25 + up * 1.05), z: z + Math.sin(a) * rad, s: 0.1 + r() * 0.07, ry: r() * 6.28 }));
      heads.setColorAt(hi++, pink ? C.setHSL(0.92 + r() * 0.05, 0.5, 0.66 + r() * 0.12) : C.setHSL(0.6 + r() * 0.14, 0.42 + r() * 0.2, 0.62 + r() * 0.14));
    }
  });
  heads.count = hi; heads.castShadow = true; scene.add(heads);
  spread([models.shrub[1], models.shrub[3]], bushes, { cast: true });

  // ---- flowers: drifts beside the shrubs and through the foreground -------------
  const kinds = [models.celandine, models.ursinia, models.periwinkle], flowers = kinds.map(() => []);
  const drift = (x, z, reach, n) => {
    const kind = Math.floor(r() * kinds.length);
    for (let k = 0; k < n; k++) {
      const a = r() * 6.28, d = 0.2 + r() * reach, fx = x + Math.cos(a) * d, fz = z + Math.sin(a) * d;
      if (pondEdge(fx, fz) < 1.08 || !isWalkable(fx, fz)) continue;
      flowers[kind].push({ x: fx, y: terrainHeight(fx, fz) - 0.01, z: fz, s: 1.3 + r() * 1.1, ry: r() * 6.28 });
    }
  };
  for (const b of beds) if (r() < 0.6) drift(b.x, b.z, b.s * 1.6 + 0.3, 5);
  for (let i = 0; i < 80; i++) { const [x, z] = ring(8, 26); if (clearOf(x, z)) drift(x, z, 1.4, 7); }
  kinds.forEach((kind, k) => spread(kind, flowers[k], { layer: DETAIL_LAYER, material: windy(0.5) }));

  // ---- grass ------------------------------------------------------------------
  const blades = [], clumps = [];
  for (let i = 0; i < (GRASS + CLUMPS) * 4 && blades.length + clumps.length < GRASS + CLUMPS; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * 30, x = Math.cos(a) * d, z = 2 + Math.sin(a) * d;
    const e = pondEdge(x, z), lawn = Math.hypot(x, z - 2) < 13;
    if (e < 1.08 || distToPath(x, z) < 1.0 || !isWalkable(x, z)) continue;
    if (lawn && e > 1.3 && r() < 0.5) continue;                  // the lawn is mown; the edges are not
    const tall = (e < 1.35 ? 1.4 : 1) * (lawn ? 0.7 : 1) * (0.7 + r() * 0.8);
    const spot = { x, y: terrainHeight(x, z) - 0.02, z, s: 1.3 + r() * 0.9, ry: r() * 6.28, tint: shade(0.8, 1.05) };
    spot.sy = spot.s * tall;
    if (clumps.length < CLUMPS && r() < 0.09) clumps.push(spot); else if (blades.length < GRASS) blades.push(spot);
  }
  spread(models.grass.filter((v) => v.name.includes('tall')), blades, { layer: DETAIL_LAYER, material: windy(0.35) });
  spread([models.grass_tuft[1]], clumps, { layer: DETAIL_LAYER, material: windy(0.3) });

  return {
    trunks,
    update(t, pos) {
      wind.value = t;
      if (pos && Math.hypot(pos.x - pinesAt.x, pos.z - pinesAt.z) > 1.5) sortPines(pos.x, pos.z);
    },
  };
}
