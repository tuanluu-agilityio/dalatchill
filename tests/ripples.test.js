import test from 'node:test';
import assert from 'node:assert/strict';
import { RippleField, RIPPLE_LIFE } from '../src/ripples.js';

test('a ripple outside the pond is rejected', () => {
  const f = new RippleField();
  assert.equal(f.add(0.6, 0.45, 0), false);
  assert.equal(f.active(0).length, 0);
});

test('a ripple inside the pond is accepted and ages with time', () => {
  const f = new RippleField();
  assert.equal(f.add(0.52, 0.8, 10), true);
  const [r] = f.active(11.5);
  assert.equal(r.u, 0.52); assert.equal(r.v, 0.8);
  assert.ok(Math.abs(r.age - 1.5) < 1e-9);
});

test('ripples expire after their lifetime', () => {
  const f = new RippleField();
  f.add(0.52, 0.8, 0);
  assert.equal(RIPPLE_LIFE, 4);
  assert.equal(f.active(3.9).length, 1);
  assert.equal(f.active(4.1).length, 0);
});

test('rapid clicking never exceeds the cap and keeps the newest', () => {
  const f = new RippleField(8);
  for (let i = 0; i < 50; i++) f.add(0.52, 0.8, i * 0.01);
  const a = f.active(0.5);
  assert.equal(a.length, 8);
  assert.ok(a.every((r) => r.age <= 0.5 - 0.42 + 1e-9), 'oldest ripples were replaced');
});
