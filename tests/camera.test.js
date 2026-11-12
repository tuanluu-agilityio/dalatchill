import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, VIEWS } from '../src/config.js';
import { visibleRect, clampView, screenToImage, imageToScreen } from '../src/camera.js';

const IA = CONFIG.imageAspect;
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} !~ ${b}`);

test('overview at matching aspect shows the whole image', () => {
  const r = visibleRect(VIEWS[0], IA, IA);
  near(r.u0, 0); near(r.v0, 0); near(r.u1, 1); near(r.v1, 1);
});

test('cover fit: exactly one dimension spans the image at zoom 1', () => {
  for (const va of [1.0, 3.5]) {
    const r = visibleRect(VIEWS[0], va, IA);
    const w = r.u1 - r.u0, h = r.v1 - r.v0;
    assert.ok(w <= 1 + 1e-12 && h <= 1 + 1e-12);
    const full = [w, h].filter((x) => Math.abs(x - 1) < 1e-12).length;
    assert.equal(full, 1);
  }
});

test('clampView never exposes anything outside the image', () => {
  for (const va of [0.5, 1, 1.83, 3.5]) {
    for (const view of VIEWS) {
      const r = visibleRect(clampView(view, va, IA), va, IA);
      assert.ok(r.u0 >= -1e-12 && r.v0 >= -1e-12 && r.u1 <= 1 + 1e-12 && r.v1 <= 1 + 1e-12,
        `${view.id} @ ${va}: ${JSON.stringify(r)}`);
    }
  }
});

test('clampView raises zoom below 1 back to 1', () => {
  assert.equal(clampView({ cx: 0.5, cy: 0.5, zoom: 0.4 }, IA, IA).zoom, 1);
});

test('screenToImage and imageToScreen are inverses', () => {
  const view = clampView(VIEWS[1], 1.6, IA);
  for (const [sx, sy] of [[0, 0], [0.3, 0.8], [1, 1]]) {
    const [u, v] = screenToImage(sx, sy, view, 1.6, IA);
    const [bx, by] = imageToScreen(u, v, view, 1.6, IA);
    near(bx, sx); near(by, sy);
  }
});

test('VIEWS has the six stops in order', () => {
  assert.deepEqual(VIEWS.map((v) => v.id), ['overview', 'pond', 'bridge', 'porch', 'hydrangea', 'path']);
});

import { applyPan } from '../src/camera.js';

test('edge clamping is not mistaken for a drag', () => {
  // the hydrangea stop sits against the left edge and gets clamped at 16:9
  const a = applyPan(VIEWS[4], 0, 16 / 9, IA);
  assert.equal(a.pan, 0);
  assert.ok(a.view.cx > VIEWS[4].cx, 'view was clamped inward');
  // so the next stop is framed exactly where it should be
  const b = applyPan(VIEWS[3], a.pan, 16 / 9, IA);
  near(b.view.cx, clampView(VIEWS[3], 16 / 9, IA).cx);
});

test('a drag is kept, but only as far as the picture allows', () => {
  const narrow = 0.5;
  const a = applyPan(VIEWS[0], 0.1, narrow, IA);
  near(a.pan, 0.1); near(a.view.cx, 0.6);
  const b = applyPan(VIEWS[0], 5, narrow, IA);
  const r = visibleRect(b.view, narrow, IA);
  assert.ok(r.u1 <= 1 + 1e-12);
  assert.ok(b.pan < 0.5);
});
