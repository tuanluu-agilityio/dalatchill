import test from 'node:test';
import assert from 'node:assert/strict';
import { POND, BRIDGE, HOUSE, START, BOUNDS, WATER_Y, pondEdge, terrainHeight, groundY, isWalkable, resolveMove, zoneAt } from '../src3d/world.js';
import { createSchool3D, stepSchool3D, scare } from '../src3d/koi-sim3d.js';

function rng(seed = 1) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

test('the pond is a basin below the water line and dry land is above it', () => {
  assert.ok(pondEdge(POND.x, POND.z) < 0.1);
  assert.ok(terrainHeight(POND.x, POND.z) < WATER_Y - 0.5);
  assert.ok(terrainHeight(START.x, START.z) > WATER_Y);
  assert.ok(terrainHeight(HOUSE.x, HOUSE.z + HOUSE.d) > WATER_Y);
});

test('you can stand at the start, on the bridge, and on the porch, but not in the water or inside the walls', () => {
  assert.equal(isWalkable(START.x, START.z), true);
  assert.equal(isWalkable(...mid(BRIDGE.a, BRIDGE.b)), true);
  assert.equal(isWalkable(POND.x, POND.z), false);
  assert.equal(isWalkable(HOUSE.x, HOUSE.z), false);
  assert.equal(isWalkable(BOUNDS + 5, 0), false);
});

test('the bridge deck is above the water', () => {
  const [x, z] = mid(BRIDGE.a, BRIDGE.b);
  assert.ok(groundY(x, z) > WATER_Y + 0.2);
});

test('walking into the pond stops at the shore', () => {
  let p = { x: POND.x, z: POND.z + POND.rz + 3 };
  for (let i = 0; i < 400; i++) p = resolveMove(p, { x: p.x, z: p.z - 0.05 });
  assert.equal(isWalkable(p.x, p.z), true);
  assert.ok(p.z > POND.z, 'did not cross the water');
});

test('walking along a wall slides instead of sticking', () => {
  const frontZ = HOUSE.z + HOUSE.d / 2 + 0.9;
  let p = { x: HOUSE.x - 2, z: frontZ + 0.5 };
  for (let i = 0; i < 100; i++) p = resolveMove(p, { x: p.x + 0.04, z: p.z - 0.04 });
  assert.ok(p.x > HOUSE.x - 2 + 1, 'kept moving sideways');
  assert.equal(isWalkable(p.x, p.z), true);
});

test('a move from a bad position still ends somewhere walkable', () => {
  const p = resolveMove({ x: POND.x, z: POND.z }, { x: POND.x + 0.1, z: POND.z });
  assert.equal(isWalkable(p.x, p.z), true);
});

test('zones name the part of the garden you are in', () => {
  assert.equal(zoneAt(...mid(BRIDGE.a, BRIDGE.b)), 'bridge');
  assert.equal(zoneAt(POND.x, POND.z + POND.rz + 1), 'pond');
  assert.equal(zoneAt(HOUSE.x - 2, HOUSE.z + HOUSE.d / 2 + 1.5), 'porch');
  assert.equal(zoneAt(START.x, START.z + 12), 'overview');
});

test('koi stay in the water for a simulated minute, even after a scare and a huge time step', () => {
  const r = rng(4); const school = createSchool3D(12, r);
  assert.equal(school.length, 12);
  for (let i = 0; i < 3600; i++) {
    if (i === 600) scare(school, POND.x, POND.z, i / 60);
    stepSchool3D(school, i === 1200 ? 900 : 1 / 60, i / 60, r);
    for (const k of school) {
      assert.ok(pondEdge(k.x, k.z) < 0.9, `koi left the water at step ${i}`);
      assert.ok(k.y < WATER_Y - 0.05 && k.y > terrainHeight(k.x, k.z), 'between surface and bottom');
    }
  }
});

test('a scare makes nearby koi bolt away', () => {
  const r = rng(8); const school = createSchool3D(6, r);
  school.forEach((k, i) => { k.x = POND.x + (i - 2.5) * 0.3; k.z = POND.z; });
  const d = () => school.reduce((s, k) => s + Math.hypot(k.x - POND.x, k.z - POND.z), 0) / school.length;
  const d0 = d();
  scare(school, POND.x, POND.z, 0);
  for (let i = 0; i < 60; i++) stepSchool3D(school, 1 / 60, i / 60, r);
  assert.ok(d() > d0 * 1.5);
});
