import test from 'node:test';
import assert from 'node:assert/strict';
import { pointInPond, distanceToShore, nearestInside, perspectiveScale, randomPointInPond, POND_BOUNDS } from '../src/pond.js';

function rng(seed = 1) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

test('pond centre is inside, house and path are outside', () => {
  assert.equal(pointInPond(0.52, 0.8), true);
  assert.equal(pointInPond(0.6, 0.45), false);
  assert.equal(pointInPond(0.05, 0.9), false);
});

test('distanceToShore is positive inside and negative outside', () => {
  assert.ok(distanceToShore(0.52, 0.8) > 0.03);
  assert.ok(distanceToShore(0.6, 0.45) < 0);
});

test('nearestInside pulls an outside point into the pond', () => {
  for (const [u, v] of [[0.6, 0.45], [0.05, 0.9], [0.95, 0.8], [0.5, 0.99]]) {
    const [nu, nv] = nearestInside(u, v);
    assert.equal(pointInPond(nu, nv), true, `${u},${v} -> ${nu},${nv}`);
  }
});

test('nearestInside leaves an inside point alone', () => {
  assert.deepEqual(nearestInside(0.52, 0.8), [0.52, 0.8]);
});

test('perspectiveScale is 1 at the near edge and shrinks monotonically with distance', () => {
  assert.ok(Math.abs(perspectiveScale(POND_BOUNDS.v1) - 1) < 1e-9);
  assert.ok(Math.abs(perspectiveScale(POND_BOUNDS.v0) - 0.45) < 1e-9);
  let prev = Infinity;
  for (let v = POND_BOUNDS.v1; v >= POND_BOUNDS.v0; v -= 0.01) {
    const s = perspectiveScale(v); assert.ok(s <= prev); prev = s;
  }
});

test('randomPointInPond always lands inside', () => {
  const r = rng(7);
  for (let i = 0; i < 1000; i++) { const [u, v] = randomPointInPond(r); assert.equal(pointInPond(u, v), true); }
});
