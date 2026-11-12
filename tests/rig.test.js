import test from 'node:test';
import assert from 'node:assert/strict';
import { VIEWS } from '../src/config.js';
import { CameraRig } from '../src/camera.js';

const OPTS = { moveMs: 3500, dwellMs: 20000 };
const same = (a, b, e = 1e-6) => {
  for (const k of ['cx', 'cy', 'zoom']) assert.ok(Math.abs(a[k] - b[k]) <= e, `${k}: ${a[k]} vs ${b[k]}`);
};
const run = (rig, ms, step = 50) => { let v; for (let t = 0; t < ms; t += step) v = rig.update(step); return v; };

test('starts at the overview', () => {
  const rig = new CameraRig(VIEWS, OPTS);
  assert.equal(rig.index, 0);
  same(rig.update(0), VIEWS[0]);
});

test('goTo arrives exactly at the target after moveMs', () => {
  const rig = new CameraRig(VIEWS, OPTS);
  rig.goTo(1);
  same(run(rig, 3500), VIEWS[1]);
  assert.equal(rig.progress, 1);
});

test('the move eases: slow at both ends, fastest in the middle', () => {
  const rig = new CameraRig(VIEWS, OPTS);
  rig.goTo(4);
  const xs = []; for (let i = 0; i < 70; i++) xs.push(rig.update(50).cx);
  const speed = xs.slice(1).map((x, i) => Math.abs(x - xs[i]));
  assert.ok(speed[0] < speed[34] && speed[68] < speed[34]);
});

test('redirecting mid-flight continues from the current position', () => {
  const rig = new CameraRig(VIEWS, OPTS);
  rig.goTo(1);
  const mid = { ...run(rig, 1750) };
  rig.goTo(3);
  same(rig.update(0), mid);
  same(run(rig, 3500), VIEWS[3]);
  assert.equal(rig.index, 3);
});

test('the tour visits stops 1 to 5 in order, dwelling at each, then loops', () => {
  const rig = new CameraRig(VIEWS, OPTS);
  rig.startTour();
  assert.equal(rig.touring, true);
  const seen = [];
  for (let t = 0; t < 6 * (3500 + 20000) + 1000; t += 100) {
    rig.update(100);
    if (seen[seen.length - 1] !== rig.index) seen.push(rig.index);
  }
  assert.deepEqual(seen, [1, 2, 3, 4, 5, 1, 2]);
});

test('the tour dwells for dwellMs after arriving', () => {
  const rig = new CameraRig(VIEWS, OPTS);
  rig.startTour();
  run(rig, 3500 + 19900, 100);
  assert.equal(rig.index, 1);
  run(rig, 300, 100);
  assert.equal(rig.index, 2);
});

test('stopTour stays where it is', () => {
  const rig = new CameraRig(VIEWS, OPTS);
  rig.startTour();
  run(rig, 3500 + 5000, 100);
  rig.stopTour();
  run(rig, 60000, 100);
  assert.equal(rig.touring, false);
  assert.equal(rig.index, 1);
});

test('choosing a stop by hand ends the tour', () => {
  const rig = new CameraRig(VIEWS, OPTS);
  rig.startTour();
  rig.goTo(4);
  assert.equal(rig.touring, false);
});

test('next and prev wrap around', () => {
  const rig = new CameraRig(VIEWS, OPTS);
  rig.prev(); assert.equal(rig.index, 5);
  rig.next(); assert.equal(rig.index, 0);
});

test('an out-of-range stop is ignored', () => {
  const rig = new CameraRig(VIEWS, OPTS);
  rig.goTo(99); rig.goTo(-1);
  assert.equal(rig.index, 0);
});

test('going to the stop we are already resting at does not move the camera', () => {
  const rig = new CameraRig(VIEWS, OPTS);
  rig.goTo(2); run(rig, 3500);
  rig.goTo(2);
  same(rig.update(1750), VIEWS[2]);
});

test('rebase lets a dragged view become the starting point of the next move', () => {
  const rig = new CameraRig(VIEWS, OPTS);
  rig.rebase({ cx: 0.3, cy: 0.5, zoom: 1 });
  rig.goTo(1);
  same(rig.update(0), { cx: 0.3, cy: 0.5, zoom: 1 });
  same(run(rig, 3500), VIEWS[1]);
});
