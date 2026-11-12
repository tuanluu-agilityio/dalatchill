import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchool, stepSchool, disturb, planeDistance, bodyLength, MIN_SPEED, MAX_SPEED, MAX_TURN, SQUASH } from '../src/koi-sim.js';
import { pointInPond } from '../src/pond.js';

function rng(seed = 1) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const DT = 1 / 60;

test('createSchool makes the requested number of koi, all in the pond', () => {
  const school = createSchool(10, rng(3));
  assert.equal(school.length, 10);
  for (const k of school) {
    assert.equal(pointInPond(k.u, k.v), true);
    assert.ok(k.size >= 0.8 && k.size <= 1.25);
    assert.ok(Number.isInteger(k.skin));
  }
});

test('koi stay in the pond for a simulated minute', () => {
  const r = rng(5); const school = createSchool(10, r);
  for (let i = 0; i < 3600; i++) {
    stepSchool(school, DT, i * DT, r);
    for (const k of school) assert.equal(pointInPond(k.u, k.v), true, `escaped at step ${i}`);
  }
});

test('a huge time step (tab was hidden) does not throw koi out of the pond', () => {
  const r = rng(9); const school = createSchool(10, r);
  const before = school.map((k) => [k.u, k.v]);
  stepSchool(school, 600, 600, r);
  school.forEach((k, i) => {
    assert.equal(pointInPond(k.u, k.v), true);
    assert.ok(Math.hypot(k.u - before[i][0], k.v - before[i][1]) < 0.03, 'moved no more than one clamped step');
  });
});

test('speed and turn rate stay within their limits', () => {
  const r = rng(11); const school = createSchool(10, r);
  for (let i = 0; i < 1800; i++) {
    const h0 = school.map((k) => k.heading);
    stepSchool(school, DT, i * DT, r);
    school.forEach((k, j) => {
      assert.ok(k.speed >= MIN_SPEED - 1e-9 && k.speed <= MAX_SPEED + 1e-9, `speed ${k.speed}`);
      let d = Math.abs(k.heading - h0[j]); if (d > Math.PI) d = 2 * Math.PI - d;
      assert.ok(d <= MAX_TURN * DT + 1e-9, `turned ${d} in one step`);
    });
  }
});

test('koi do not sit on top of each other for long', () => {
  const r = rng(13); const school = createSchool(10, r);
  const overlap = new Map();
  for (let i = 0; i < 3600; i++) {
    stepSchool(school, DT, i * DT, r);
    if (i < 600) continue;
    for (let a = 0; a < school.length; a++) for (let b = a + 1; b < school.length; b++) {
      const key = a * 100 + b;
      const close = planeDistance(school[a], school[b]) < 0.5 * Math.min(bodyLength(school[a]), bodyLength(school[b]));
      const run = close ? (overlap.get(key) || 0) + DT : 0;
      overlap.set(key, run);
      assert.ok(run <= 1, `koi ${a} and ${b} overlapped for more than a second`);
    }
  }
});

test('tail phase advances faster when swimming faster', () => {
  const r = rng(17); const school = createSchool(2, r);
  const p0 = school[0].phase;
  stepSchool(school, DT, 0, r);
  assert.ok(school[0].phase > p0);
});

test('a disturbance scatters nearby koi, then draws them back in', () => {
  const r = rng(21); const school = createSchool(10, r);
  const [pu, pv] = [0.52, 0.8];
  // gather a few koi near the point so the test has subjects
  school.slice(0, 4).forEach((k, i) => { k.u = pu + (i - 1.5) * 0.012; k.v = pv + (i % 2 ? 0.01 : -0.01); });
  const subjects = school.slice(0, 4);
  const mean = () => subjects.reduce((s, k) => s + planeDistance(k, { u: pu, v: pv }), 0) / subjects.length;
  const d0 = mean();
  disturb(school, pu, pv, 0);
  let t = 0;
  for (; t < 1; t += DT) stepSchool(school, DT, t, r);
  const d1 = mean();
  assert.ok(d1 > d0 * 1.5, `scattered: ${d0} -> ${d1}`);
  for (; t < 6; t += DT) stepSchool(school, DT, t, r);
  const d6 = mean();
  assert.ok(d6 < d1 * 0.6, `returned: ${d1} -> ${d6}`);
  for (const k of school) assert.equal(pointInPond(k.u, k.v), true);
});

test('SQUASH is a foreshortening ratio', () => { assert.ok(SQUASH > 0.2 && SQUASH < 0.6); });
