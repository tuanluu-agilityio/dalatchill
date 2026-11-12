import test from 'node:test';
import assert from 'node:assert/strict';
import { VIEWS } from '../src/config.js';
import { mixFor, AudioEngine, LAYERS } from '../src/audio.js';

// A stand-in Web Audio context: every node accepts any call and exposes AudioParam-like fields.
function fakeParam() {
  const p = { value: 0 };
  for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues']) p[m] = () => p;
  return p;
}
function fakeNode() {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (['connect', 'disconnect', 'start', 'stop'].includes(k)) return () => {};
      if (typeof k === 'symbol') return undefined;
      return (t[k] = fakeParam());
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
class FakeContext {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.destination = fakeNode(); this.state = 'running'; this.resumed = 0; this.suspended = 0; }
  createBuffer(ch, n) { const d = new Float32Array(n); return { getChannelData: () => d, duration: n / 44100 }; }
  decodeAudioData() { return Promise.reject(new Error('bad data')); }
  resume() { this.resumed++; return Promise.resolve(); }
  suspend() { this.suspended++; return Promise.resolve(); }
}
for (const m of ['createGain', 'createBufferSource', 'createBiquadFilter', 'createOscillator', 'createStereoPanner', 'createDelay', 'createDynamicsCompressor']) {
  FakeContext.prototype[m] = () => fakeNode();
}
const memoryStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const deps = (over = {}) => ({ AudioContextClass: FakeContext, fetchFn: () => Promise.reject(new Error('offline')), storage: memoryStore(), ...over });

test('the bed mix at the overview', () => {
  assert.deepEqual(mixFor('overview', false), { master: 1, birds: 0.5, wind: 0.4, water: 0.3, frogs: 0, chimes: 0 });
});

test('each stop lifts its own layer to 0.85', () => {
  assert.equal(mixFor('porch', false).chimes, 0.85);
  assert.equal(mixFor('pond', false).water, 0.85);
  assert.equal(mixFor('bridge', false).frogs, 0.85);
  assert.equal(mixFor('hydrangea', false).birds, 0.85);
  assert.equal(mixFor('path', false).wind, 0.85);
});

test('muting silences the master only', () => {
  const m = mixFor('bridge', true);
  assert.equal(m.master, 0);
  assert.equal(m.frogs, 0.85);
});

test('every view yields a complete mix within range', () => {
  for (const v of VIEWS) {
    const m = mixFor(v.id, false);
    assert.deepEqual(Object.keys(m).sort(), ['master', ...LAYERS].sort());
    for (const x of Object.values(m)) assert.ok(x >= 0 && x <= 1);
  }
});

test('an unknown view falls back to the bed', () => {
  assert.deepEqual(mixFor('nowhere', false), mixFor('overview', false));
});

test('the engine survives every audio file failing to load', async () => {
  const engine = new AudioEngine({ birds: 'a.ogg', wind: 'b.ogg' }, deps());
  await engine.start();
  assert.deepEqual(engine.failed.sort(), ['birds', 'wind']);
  engine.setView('porch'); engine.splash(); engine.setMuted(true); engine.suspend(); engine.resume();
  engine.dispose();
});

test('the engine survives a file that downloads but cannot be decoded', async () => {
  const fetchFn = () => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
  const engine = new AudioEngine({ water: 'w.ogg' }, deps({ fetchFn }));
  await engine.start();
  assert.deepEqual(engine.failed, ['water']);
  engine.dispose();
});

test('calls before start do nothing and do not throw', () => {
  const engine = new AudioEngine({}, deps());
  engine.setView('pond'); engine.splash(); engine.suspend(); engine.resume();
});

test('with no audio support the engine stays silent instead of throwing', async () => {
  const engine = new AudioEngine({}, deps({ AudioContextClass: undefined }));
  await engine.start();
  assert.equal(engine.available, false);
  engine.setView('pond'); engine.splash();
});

test('the mute choice is remembered', async () => {
  const storage = memoryStore();
  const a = new AudioEngine({}, deps({ storage }));
  assert.equal(a.muted, false);
  a.setMuted(true);
  assert.equal(storage.getItem('dalatchill.muted'), '1');
  const b = new AudioEngine({}, deps({ storage }));
  assert.equal(b.muted, true);
});

test('start is idempotent', async () => {
  let made = 0;
  class Counting extends FakeContext { constructor() { super(); made++; } }
  const engine = new AudioEngine({}, deps({ AudioContextClass: Counting }));
  await engine.start(); await engine.start();
  assert.equal(made, 1);
  engine.dispose();
});

test('a splash on a context that is not running creates no sound nodes', async () => {
  let oscillators = 0;
  class Suspended extends FakeContext {
    constructor() { super(); this.state = 'suspended'; }
    createOscillator() { oscillators++; return fakeNode(); }
  }
  const engine = new AudioEngine({}, deps({ AudioContextClass: Suspended }));
  await engine.start();
  const before = oscillators;
  for (let i = 0; i < 20; i++) engine.splash();
  assert.equal(oscillators, before);
  engine.dispose();
});
