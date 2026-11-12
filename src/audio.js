// Soundscape. mixFor() is the pure mixing rule; AudioEngine turns it into sound.
//
// Each layer plays a looping recording when one is listed in the manifest and loads, and
// otherwise a synthesised stand-in built from Web Audio nodes. Nothing here may throw: a
// page without sound is fine, a page that breaks because of sound is not.
import { VIEWS } from './config.js';

export const LAYERS = ['birds', 'wind', 'water', 'frogs', 'chimes'];
const BED = { birds: 0.5, wind: 0.4, water: 0.3, frogs: 0, chimes: 0 };
const FEATURED = 0.85;
const MUTE_KEY = 'dalatchill.muted';
const START_FADE = 3;       // seconds
const MOVE_FADE = 0.85;     // time constant; about 2.5 s to settle

export function mixFor(viewId, muted) {
  const view = VIEWS.find((v) => v.id === viewId);
  const mix = { master: muted ? 0 : 1, ...BED };
  if (view && view.audio) mix[view.audio] = FEATURED;
  return mix;
}

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export class AudioEngine {
  constructor(manifest = {}, deps = {}) {
    this.manifest = manifest;
    this.AudioContextClass = 'AudioContextClass' in deps ? deps.AudioContextClass
      : (globalThis.AudioContext || globalThis.webkitAudioContext);
    this.fetchFn = deps.fetchFn || ((...a) => globalThis.fetch(...a));
    this.storage = deps.storage || safeStorage();
    this.muted = this.storage.getItem(MUTE_KEY) === '1';
    this.available = !!this.AudioContextClass;
    this.failed = [];
    this.viewId = 'overview';
    this.ctx = null; this.gains = {}; this.schedule = {}; this.timer = null; this.starting = null;
  }

  start() {
    if (!this.starting) this.starting = this.#start().catch(() => { this.available = false; });
    return this.starting;
  }

  async #start() {
    if (!this.available) return;
    const ctx = this.ctx = new this.AudioContextClass();
    this.master = ctx.createGain(); this.master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    this.master.connect(limiter); limiter.connect(ctx.destination);
    this.noise = makeNoise(ctx);

    const mix = mixFor(this.viewId, this.muted);
    for (const name of LAYERS) {
      const g = this.gains[name] = ctx.createGain();
      g.gain.value = mix[name]; g.connect(this.master);
    }
    // synthesised layers start at once; recordings replace them as they arrive
    this.synths = {
      wind: synthWind(ctx, this.noise, this.gains.wind),
      water: synthWater(ctx, this.noise, this.gains.water),
    };
    this.schedule = { birds: 0.5, frogs: 1, chimes: 1.5, water: 2 };
    this.timer = setInterval(() => this.#tick(), 200);
    this.timer.unref?.();

    this.resume();
    this.master.gain.setValueAtTime(0, ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(mix.master, ctx.currentTime + START_FADE);

    await Promise.all(Object.entries(this.manifest).map(([name, url]) => this.#loadLoop(name, url)));
  }

  async #loadLoop(name, url) {
    try {
      const res = await this.fetchFn(url);
      if (!res || !res.ok) throw new Error(`HTTP ${res && res.status}`);
      const buffer = await this.ctx.decodeAudioData(await res.arrayBuffer());
      const src = this.ctx.createBufferSource();
      src.buffer = buffer; src.loop = true; src.connect(this.gains[name]); src.start();
      this.synths[name]?.stop(); delete this.schedule[name];   // the recording takes over
    } catch { this.failed.push(name); }
  }

  // Sparse events (a bird phrase, a chime, a frog) are scheduled a little ahead of time.
  #tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state === 'suspended') return;
    const now = ctx.currentTime;
    const due = (name) => name in this.schedule && now >= this.schedule[name] && this.gains[name].gain.value > 0.02;
    if (due('birds')) { birdPhrase(ctx, this.gains.birds, now + 0.05); this.schedule.birds = now + rand(1.2, 5.5); }
    if (due('frogs')) { (Math.random() < 0.55 ? frogCall : cricketChirp)(ctx, this.gains.frogs, now + 0.05); this.schedule.frogs = now + rand(0.7, 3.2); }
    if (due('chimes')) { chimeCluster(ctx, this.gains.chimes, now + 0.05); this.schedule.chimes = now + rand(2.5, 8); }
    if (due('water')) { plip(ctx, this.gains.water, now + 0.05, 0.05); this.schedule.water = now + rand(0.15, 1.1); }
  }

  setView(viewId) {
    this.viewId = viewId;
    if (!this.ctx) return;
    const mix = mixFor(viewId, this.muted), t = this.ctx.currentTime;
    for (const name of LAYERS) this.gains[name].gain.setTargetAtTime(mix[name], t, MOVE_FADE);
  }

  setMuted(muted) {
    this.muted = !!muted;
    this.storage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.25);
  }

  splash() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.01;
    plip(this.ctx, this.master, t, 0.22);
    plip(this.ctx, this.master, t + 0.07, 0.12);
    noiseBurst(this.ctx, this.noise, this.master, t, 0.1);
  }

  suspend() { this.ctx?.suspend?.()?.catch?.(() => {}); }
  resume() { this.ctx?.resume?.()?.catch?.(() => {}); }
  dispose() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}

function safeStorage() {
  try { const s = globalThis.localStorage; s.getItem(MUTE_KEY); return s; }
  catch { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }; }
}

// ---------------------------------------------------------------- synthesis

function makeNoise(ctx) {
  const n = Math.floor(ctx.sampleRate * 3);
  const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) { const white = Math.random() * 2 - 1; last = (last + 0.04 * white) / 1.04; d[i] = white * 0.5 + last * 6; }
  return buffer;
}

function noiseSource(ctx, buffer) {
  const src = ctx.createBufferSource();
  src.buffer = buffer; src.loop = true;
  src.playbackRate.value = rand(0.85, 1.15);
  return src;
}

function lfo(ctx, rate, depth, target) {
  const osc = ctx.createOscillator(), amt = ctx.createGain();
  osc.frequency.value = rate; amt.gain.value = depth;
  osc.connect(amt); amt.connect(target); osc.start();
  return osc;
}

// Wind in pine needles: a soft band of noise whose colour and loudness drift slowly.
function synthWind(ctx, noise, out) {
  const src = noiseSource(ctx, noise);
  const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 1400;
  const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 620; band.Q.value = 0.55;
  const level = ctx.createGain(); level.gain.value = 0.5;
  src.connect(low); low.connect(band); band.connect(level); level.connect(out);
  const a = lfo(ctx, 0.07, 240, band.frequency), b = lfo(ctx, 0.031, 0.26, level.gain), c = lfo(ctx, 0.113, 0.12, level.gain);
  src.start();
  return { stop() { for (const n of [src, a, b, c]) n.stop(); } };
}

// A small trickle: bright filtered noise that shimmers, with droplets added by the scheduler.
function synthWater(ctx, noise, out) {
  const src = noiseSource(ctx, noise);
  const high = ctx.createBiquadFilter(); high.type = 'highpass'; high.frequency.value = 900;
  const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 2600; band.Q.value = 0.9;
  const level = ctx.createGain(); level.gain.value = 0.28;
  src.connect(high); high.connect(band); band.connect(level); level.connect(out);
  const a = lfo(ctx, 0.9, 500, band.frequency), b = lfo(ctx, 0.37, 0.07, level.gain);
  src.start();
  return { stop() { for (const n of [src, a, b]) n.stop(); } };
}

function envelope(ctx, out, t, attack, hold, release, peak) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  g.connect(out);
  return g;
}

function panned(ctx, out) {
  if (!ctx.createStereoPanner) return out;
  const p = ctx.createStereoPanner(); p.pan.value = rand(-0.8, 0.8); p.connect(out);
  return p;
}

// A water droplet: a short sine that swoops upward.
function plip(ctx, out, t, peak) {
  const f = rand(500, 1300);
  const osc = ctx.createOscillator(); osc.type = 'sine';
  osc.frequency.setValueAtTime(f, t);
  osc.frequency.exponentialRampToValueAtTime(f * rand(1.6, 2.4), t + 0.07);
  osc.connect(envelope(ctx, panned(ctx, out), t, 0.004, 0.01, 0.07, peak * rand(0.5, 1)));
  osc.start(t); osc.stop(t + 0.12);
}

function noiseBurst(ctx, noise, out, t, peak) {
  const src = ctx.createBufferSource(); src.buffer = noise;
  const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.Q.value = 0.8;
  band.frequency.setValueAtTime(2400, t); band.frequency.exponentialRampToValueAtTime(700, t + 0.3);
  src.connect(band); band.connect(envelope(ctx, out, t, 0.01, 0.02, 0.3, peak));
  src.start(t, rand(0, 2)); src.stop(t + 0.4);
}

// Birdsong: a few short whistled notes, each gliding in pitch, from somewhere in the trees.
const PHRASES = [
  { notes: 3, base: [3200, 4200], glide: [0.82, 1.25], len: [0.07, 0.13], gap: [0.05, 0.1] },   // bright tit-like
  { notes: 5, base: [4500, 5600], glide: [0.9, 1.1], len: [0.04, 0.06], gap: [0.03, 0.05] },    // quick trill
  { notes: 2, base: [2000, 2600], glide: [1.15, 1.4], len: [0.16, 0.26], gap: [0.12, 0.2] },    // slow two-note whistle
  { notes: 4, base: [2800, 3600], glide: [0.7, 0.9], len: [0.09, 0.14], gap: [0.06, 0.12] },    // falling phrase
];
function birdPhrase(ctx, out, t0) {
  const p = pick(PHRASES), dest = panned(ctx, out), far = rand(0.25, 1);
  let t = t0, f = rand(...p.base);
  for (let i = 0; i < p.notes; i++) {
    const len = rand(...p.len);
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * rand(...p.glide), t + len);
    osc.connect(envelope(ctx, dest, t, 0.012, len * 0.4, len * 0.6, 0.11 * far));
    osc.start(t); osc.stop(t + len + 0.05);
    t += len + rand(...p.gap); f *= rand(0.92, 1.1);
  }
}

// A tree frog: a low rasp made of quick pulses.
function frogCall(ctx, out, t0) {
  const dest = panned(ctx, out), f = rand(380, 620), pulses = Math.floor(rand(5, 11)), far = rand(0.3, 1);
  for (let i = 0; i < pulses; i++) {
    const t = t0 + i * 0.034;
    const osc = ctx.createOscillator(); osc.type = 'triangle';
    osc.frequency.setValueAtTime(f * 1.25, t); osc.frequency.exponentialRampToValueAtTime(f, t + 0.02);
    osc.connect(envelope(ctx, dest, t, 0.003, 0.006, 0.018, 0.12 * far));
    osc.start(t); osc.stop(t + 0.04);
  }
}

function cricketChirp(ctx, out, t0) {
  const dest = panned(ctx, out), f = rand(4200, 5200), far = rand(0.2, 0.7);
  for (let c = 0; c < 3; c++) for (let i = 0; i < 4; i++) {
    const t = t0 + c * 0.16 + i * 0.022;
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f;
    osc.connect(envelope(ctx, dest, t, 0.003, 0.006, 0.012, 0.035 * far));
    osc.start(t); osc.stop(t + 0.03);
  }
}

// Wind chimes: metal tubes tuned to a pentatonic scale, struck in small clusters.
const CHIME_NOTES = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093];
function chimeCluster(ctx, out, t0) {
  const dest = panned(ctx, out), strikes = Math.floor(rand(1, 5));
  let t = t0;
  for (let i = 0; i < strikes; i++) {
    const f = pick(CHIME_NOTES), loud = rand(0.03, 0.09);
    for (const [ratio, level, ring] of [[1, 1, 3.2], [2.76, 0.45, 1.6], [5.4, 0.2, 0.7]]) {
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f * ratio;
      osc.connect(envelope(ctx, dest, t, 0.004, 0.01, ring, loud * level));
      osc.start(t); osc.stop(t + ring + 0.1);
    }
    t += rand(0.12, 0.6);
  }
}
