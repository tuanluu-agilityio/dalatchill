// Koi behaviour in the 3D pond. Pure logic: positions in metres, no rendering, no clock.
import { POND, WATER_Y, pondEdge, terrainHeight } from './world.js';

const TAU = Math.PI * 2;
const MAX_DT = 0.1;
const MAX_TURN = 2.6;       // rad/s
const SOFT_EDGE = 0.52;     // start turning back here (in pondEdge units)
const HARD_EDGE = 0.78;     // never swim past this
export const SKINS = 5;

const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

function swimHeight(k) {
  const top = WATER_Y - 0.1, bottom = terrainHeight(k.x, k.z) + 0.12;
  return bottom >= top ? top : top + (bottom - top) * k.depth;
}

export function createSchool3D(count, rng) {
  const school = [];
  for (let i = 0; i < count; i++) {
    let x, z;
    do { x = POND.x + (rng() * 2 - 1) * POND.rx; z = POND.z + (rng() * 2 - 1) * POND.rz; } while (pondEdge(x, z) > 0.6);
    const k = {
      x, z, y: 0, heading: rng() * TAU - Math.PI, speed: 0.3, turn: 0, phase: rng() * TAU,
      length: 0.55 + rng() * 0.35, skin: i % SKINS, depth: 0.2 + rng() * 0.6,
      wander: 0, wanderTarget: 0, wanderTimer: rng() * 3, targetSpeed: 0.3, speedTimer: rng() * 4,
      depthTarget: 0.5, fleeUntil: -1, fleeFrom: null,
    };
    k.y = swimHeight(k);
    school.push(k);
  }
  return school;
}

export function scare(school, x, z, t) {
  for (const k of school) {
    const d = Math.hypot(k.x - x, k.z - z);
    if (d < 2.6) { k.fleeUntil = t + 1 + (2.6 - d) * 0.25; k.fleeFrom = { x, z }; k.speed = Math.max(k.speed, 1.5); }
  }
}

function stepOne(k, school, dt, t, rng) {
  k.wanderTimer -= dt;
  if (k.wanderTimer <= 0) { k.wanderTarget = (rng() * 2 - 1) * 0.6; k.wanderTimer = 1.5 + rng() * 4; k.depthTarget = 0.15 + rng() * 0.7; }
  k.wander += (k.wanderTarget - k.wander) * (1 - Math.exp(-dt * 1.2));
  let omega = k.wander;

  k.speedTimer -= dt;
  if (k.speedTimer <= 0) {
    const burst = rng() < 0.15;
    k.targetSpeed = burst ? 0.9 + rng() * 0.4 : 0.18 + rng() * 0.35;
    k.speedTimer = burst ? 0.5 + rng() * 0.6 : 2 + rng() * 5;
  }
  let target = k.targetSpeed, accel = 1.4;

  if (t < k.fleeUntil) {
    const away = Math.atan2(k.z - k.fleeFrom.z, k.x - k.fleeFrom.x);
    omega = clamp(wrap(away - k.heading) * 6, -MAX_TURN, MAX_TURN);
    target = 2.1; accel = 7;
  }

  for (const o of school) {             // keep a body length apart
    if (o === k) continue;
    const d = Math.hypot(k.x - o.x, k.z - o.z), r = 0.9 * Math.max(k.length, o.length);
    if (d < r) omega += clamp((wrap(Math.atan2(k.z - o.z, k.x - o.x) - k.heading) || 0.3) * 3, -MAX_TURN, MAX_TURN) * (1 - d / r);
  }

  const e = pondEdge(k.x, k.z);          // turn back well before the shallows
  if (e > SOFT_EDGE) {
    const w = clamp((e - SOFT_EDGE) / (HARD_EDGE - SOFT_EDGE), 0, 1);
    const home = Math.atan2(POND.z - k.z, POND.x - k.x);
    omega = omega * (1 - w) + clamp(wrap(home - k.heading) * 4, -MAX_TURN, MAX_TURN) * w;
    if (w > 0.6) target = Math.min(target, 0.5);
  }

  omega = clamp(omega, -MAX_TURN, MAX_TURN);
  k.heading = wrap(k.heading + omega * dt);
  k.turn += (omega - k.turn) * (1 - Math.exp(-dt * 5));
  k.speed = clamp(k.speed + (target - k.speed) * (1 - Math.exp(-dt * accel)), 0.08, 2.4);
  k.phase += dt * TAU * (0.5 + k.speed * 1.5);
  k.depth += (k.depthTarget - k.depth) * (1 - Math.exp(-dt * 0.4));

  const nx = k.x + Math.cos(k.heading) * k.speed * dt, nz = k.z + Math.sin(k.heading) * k.speed * dt;
  if (pondEdge(nx, nz) < HARD_EDGE) { k.x = nx; k.z = nz; }
  k.y = swimHeight(k);
}

export function stepSchool3D(school, dtSec, tSec, rng) {
  const dt = clamp(dtSec, 0, MAX_DT);
  for (const k of school) stepOne(k, school, dt, tSec, rng);
}
