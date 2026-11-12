// The timber cabin: wooden walls, a stone wing, terracotta roof, a railed porch, warm windows.
import * as THREE from 'three';
import { HOUSE } from './world.js';
import { woodTexture, stoneTexture, roofTexture } from './textures.js';

const WALL_H = 3.0, RIDGE = 2.3, WING_W = 3.8, WING_OUT = 1.3;

export function createHouse(scene) {
  const g = new THREE.Group();
  g.position.set(HOUSE.x, 0, HOUSE.z);
  const { w, d, porch, deck } = HOUSE;
  const front = d / 2, left = -w / 2, right = w / 2, wingX = right - WING_W / 2;

  const tex = (make, rx, ry) => { const t = make(); t.repeat.set(rx, ry); return t; };
  const wood = new THREE.MeshStandardMaterial({ map: tex(woodTexture, 3, 1), roughness: 0.82 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x7a4a22, roughness: 0.8 });
  const stone = new THREE.MeshStandardMaterial({ map: tex(stoneTexture, 1.6, 1.3), roughness: 0.95 });
  const roofMat = new THREE.MeshStandardMaterial({ map: tex(roofTexture, 4, 2), roughness: 0.85 });
  const glow = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffb25a, emissiveIntensity: 1.5, roughness: 0.4 });

  const box = (wx, hy, dz, x, y, z, mat, shadow = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(wx, hy, dz), mat);
    m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; g.add(m); return m;
  };

  // foundation, walls, stone wing
  box(w + 0.3, deck, d + 0.3, 0, deck / 2, 0, stone);
  box(w - WING_W, WALL_H, d, left + (w - WING_W) / 2, deck + WALL_H / 2, 0, wood);
  box(WING_W, WALL_H, d + WING_OUT, wingX, deck + WALL_H / 2, WING_OUT / 2, stone);

  // roofs: two tilted slabs each, plus the triangular gable ends
  const slab = (len, run, rise, x, y, z, alongX) => {
    const slope = Math.hypot(run, rise);
    const m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : slope, 0.14, alongX ? slope : len), roofMat);
    const a = Math.atan2(rise, run);
    if (alongX) { m.position.set(x, y + rise / 2, z + run / 2); m.rotation.x = -a; }   // climbs toward +z
    else { m.position.set(x + run / 2, y + rise / 2, z); m.rotation.z = a; }            // climbs toward +x
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  };
  const eave = deck + WALL_H, over = 0.6;
  const ridgeZ = -0.4, backRun = d / 2 + ridgeZ + over, frontRun = front + porch - ridgeZ + 0.35;
  const mainLen = w - WING_W + over;
  const mainX = left + (w - WING_W) / 2 - over / 2;
  slab(mainLen, backRun, RIDGE, mainX, eave - 0.1, ridgeZ - backRun, true);
  // the front slope runs on over the porch, so it ends lower
  const frontDrop = RIDGE + 0.35;
  slab(mainLen, frontRun, -frontDrop, mainX, eave - 0.1 + RIDGE, ridgeZ, true);
  const wingRun = WING_W / 2 + 0.45, wingLen = d + WING_OUT + over * 2;
  slab(wingLen, wingRun, 1.9, wingX - wingRun, eave - 0.1, WING_OUT / 2, false);
  slab(wingLen, wingRun, -1.9, wingX, eave - 0.1 + 1.9, WING_OUT / 2, false);

  const gable = (pts, mat, place) => {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    m.material.side = THREE.DoubleSide; place(m); m.castShadow = true; g.add(m);
  };
  // main roof ends (in the z-y plane), on the left wall
  const yFront = RIDGE - frontDrop * (front - ridgeZ) / frontRun;
  for (const x of [left, left + w - WING_W]) {
    gable([[-d / 2, 0], [ridgeZ, RIDGE - 0.1], [front, yFront], [front, 0]], wood,
      (m) => { m.rotation.y = -Math.PI / 2; m.position.set(x, eave, 0); });
  }
  // stone wing gables, front and back
  for (const z of [front + WING_OUT, -d / 2]) {
    gable([[-WING_W / 2, 0], [0, 1.9 * (WING_W / 2) / wingRun], [WING_W / 2, 0]], stone, (m) => m.position.set(wingX, eave, z + (z > 0 ? 0.001 : -0.001)));
  }

  // chimney
  box(0.8, 2.3, 0.8, left + 3.2, eave + RIDGE + 0.2, ridgeZ - 0.9, stone);
  box(0.95, 0.14, 0.95, left + 3.2, eave + RIDGE + 1.4, ridgeZ - 0.9, trim);

  // porch: deck, posts, railing
  const porchW = w - WING_W, porchX = left + porchW / 2;
  box(porchW, deck, porch, porchX, deck / 2, front + porch / 2, wood);
  const posts = [left + 0.15, left + porchW * 0.36, left + porchW * 0.68, left + porchW - 0.15];
  for (const x of posts) box(0.18, WALL_H - 0.25, 0.18, x, deck + (WALL_H - 0.25) / 2, front + porch - 0.15, trim);
  box(porchW, 0.2, 0.2, porchX, deck + WALL_H - 0.3, front + porch - 0.15, trim);
  const rail = (x0, x1) => {
    box(x1 - x0, 0.08, 0.08, (x0 + x1) / 2, deck + 0.9, front + porch - 0.15, trim, false);
    box(x1 - x0, 0.06, 0.06, (x0 + x1) / 2, deck + 0.15, front + porch - 0.15, trim, false);
    for (let x = x0 + 0.14; x < x1; x += 0.16) box(0.04, 0.75, 0.04, x, deck + 0.52, front + porch - 0.15, trim, false);
  };
  rail(posts[0], posts[1]); rail(posts[1], posts[2]);       // the last bay is the way in
  box(0.08, 0.08, porch, left + 0.15, deck + 0.9, front + porch / 2, trim, false);
  for (let z = front + 0.2; z < front + porch; z += 0.16) box(0.04, 0.75, 0.04, left + 0.15, deck + 0.52, z, trim, false);
  // steps down from the open bay
  for (let i = 0; i < 3; i++) box(posts[3] - posts[2] - 0.2, deck * (1 - i / 3), 0.4, (posts[2] + posts[3]) / 2, deck * (1 - i / 3) / 2, front + porch + 0.2 + i * 0.4, stone);

  // glowing doors and windows with frames
  const opening = (x, y, wx, hy, z, rotY = 0) => {
    const o = new THREE.Group();
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(wx, hy), glow); o.add(pane);
    const bar = (bw, bh, bx, by) => { const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.07), trim); b.position.set(bx, by, 0.02); o.add(b); };
    bar(wx + 0.16, 0.09, 0, hy / 2); bar(wx + 0.16, 0.09, 0, -hy / 2); bar(0.09, hy, -wx / 2, 0); bar(0.09, hy, wx / 2, 0);
    bar(0.05, hy, 0, 0); bar(wx, 0.05, 0, hy * 0.18);
    o.position.set(x, y, z); o.rotation.y = rotY; g.add(o);
  };
  for (const t of [0.14, 0.4, 0.66]) opening(left + porchW * t + 0.5, deck + 1.25, 1.25, 2.1, front + 0.012);
  opening(wingX - 2.75, deck + 1.55, 1.5, 1.5, front + 0.012);
  opening(wingX, deck + 1.6, 1.2, 1.3, front + WING_OUT + 0.012);
  opening(right + 0.012, deck + 1.6, 1.2, 1.3, 0.5, Math.PI / 2);
  opening(left - 0.012, deck + 1.6, 1.4, 1.3, -0.3, -Math.PI / 2);

  // wall lamps
  for (const x of [left + porchW * 0.27, left + porchW * 0.53, wingX - 1.75]) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glow); bulb.position.set(x, deck + 2.25, front + 0.14); g.add(bulb);
    const light = new THREE.PointLight(0xffb45e, 7, 9, 2); light.position.set(x, deck + 2.2, front + 0.5); g.add(light);
  }

  // stone terrace in front of the wing, with potted plants
  box(WING_W + 1.4, 0.28, 3.2, wingX + 0.3, 0.14, front + WING_OUT + 1.6, stone);
  const pot = new THREE.MeshStandardMaterial({ color: 0xb86a3c, roughness: 0.8 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x4f8a35, roughness: 0.9 });
  const bloom = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.8 });
  [[wingX - 1.6, front + WING_OUT + 0.6, 0.28], [wingX + 1.7, front + WING_OUT + 0.7, 0.24], [left + porchW - 0.5, front + porch + 0.5, 0.26]].forEach(([x, z, r]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.72, r * 1.5, 12), pot); p.position.set(x, 0.28 + r * 0.75, z); p.castShadow = true; g.add(p);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 1.5, 1), leaf); b.position.set(x, 0.28 + r * 2.4, z); b.castShadow = true; g.add(b);
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.28, 0), bloom), a = i * 2.4;
      f.position.set(x + Math.cos(a) * r * 1.1, 0.28 + r * 2.7 + Math.sin(i) * r * 0.5, z + Math.sin(a) * r * 1.1); g.add(f);
    }
  });

  scene.add(g);
  return { group: g, chimneyTop: new THREE.Vector3(HOUSE.x + left + 3.2, eave + RIDGE + 1.5, HOUSE.z + ridgeZ - 0.9) };
}
