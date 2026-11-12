// Koi behaviour. Pure logic: no rendering, no clock, no Math.random.
//
// Fish live in image coordinates (u, v) but steer on the "pond plane": the water surface
// with the camera's foreshortening undone. Plane x is in image-width units, plane y is the
// vertical image distance divided by SQUASH.
import { CONFIG } from './config.js';
import { pointInPond, distanceToShore, shoreNormal, nearestInside, perspectiveScale, randomPointInPond } from './pond.js';

export const SQUASH = 0.36;        // vertical foreshortening of the water surface
export const MIN_SPEED = 0.006;    // plane units per second
export const MAX_SPEED = 0.1;
export const MAX_TURN = 3.0;       // rad per second
export const SKIN_COUNT = 5;
const BODY_LEN = 0.075;            // plane units at the near edge of the pond, size 1
const SHORE_MARGIN = 0.04;         // image-width units
const MAX_DT = 0.1;
const A = CONFIG.imageAspect;
const TAU = Math.PI * 2;

const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export const bodyLength = (k) => BODY_LEN * k.size * perspectiveScale(k.v);
export const planeDistance = (a, b) => Math.hypot(a.u - b.u, (a.v - b.v) / A / SQUASH);
const angleTo = (from, to) => Math.atan2((to.v - from.v) / A / SQUASH, to.u - from.u);

export function createSchool(count, rng) {
  const school = [];
  for (let i = 0; i < count; i++) {
    let p = randomPointInPond(rng);
    for (let tries = 0; tries < 40 && distanceToShore(p[0], p[1]) < 0.025; tries++) p = randomPointInPond(rng);
    school.push({
      u: p[0], v: p[1],
      heading: rng() * TAU - Math.PI,
      speed: 0.012 + rng() * 0.012,
      turn: 0,
      phase: rng() * TAU,
      size: 0.8 + rng() * 0.45,
      skin: i % SKIN_COUNT,
      mood: 'cruise',
      // private steering state
      wander: 0, wanderTarget: 0, wanderTimer: rng() * 3,
      targetSpeed: 0.018, speedTimer: rng() * 4,
      moodUntil: 0, curiousUntil: 0, focus: null,
    });
  }
  return school;
}

export function disturb(school, u, v, tSec) {
  const p = { u, v };
  for (const k of school) {
    const d = planeDistance(k, p);
    if (d < 0.1) {
      k.mood = 'flee'; k.moodUntil = tSec + 0.9 + d * 3; k.curiousUntil = tSec + 7.5; k.focus = p;
      k.speed = Math.max(k.speed, 0.07);
    } else if (d < 0.25 && k.mood === 'cruise') {
      k.mood = 'curious'; k.moodUntil = tSec + 7.5; k.curiousUntil = tSec + 7.5; k.focus = p;
    }
  }
}

function stepOne(k, school, dt, t, rng) {
  // --- mood transitions ---
  if (k.mood === 'flee' && t >= k.moodUntil) { k.mood = 'curious'; k.moodUntil = k.curiousUntil; }
  if (k.mood === 'curious' && t >= k.moodUntil) { k.mood = 'cruise'; k.focus = null; }

  // --- wander: a slowly changing turn rate ---
  k.wanderTimer -= dt;
  if (k.wanderTimer <= 0) { k.wanderTarget = (rng() * 2 - 1) * 0.7; k.wanderTimer = 1.5 + rng() * 3.5; }
  k.wander += (k.wanderTarget - k.wander) * (1 - Math.exp(-dt * 1.2));
  let omega = k.wander;

  // --- speed: lazy cruising with the odd short burst ---
  k.speedTimer -= dt;
  if (k.speedTimer <= 0) {
    const burst = rng() < 0.18;
    k.targetSpeed = burst ? 0.04 + rng() * 0.02 : 0.01 + rng() * 0.018;
    k.speedTimer = burst ? 0.5 + rng() * 0.6 : 2 + rng() * 5;
  }
  let target = k.targetSpeed, accel = 1.4;

  if (k.mood === 'flee') {
    omega = clamp(wrap(angleTo(k.focus, k) - k.heading) * 6, -MAX_TURN, MAX_TURN);
    target = 0.09; accel = 6;
  } else if (k.mood === 'curious') {
    const d = planeDistance(k, k.focus);
    if (d > 0.02) omega = clamp(wrap(angleTo(k, k.focus) - k.heading) * 2.5, -MAX_TURN, MAX_TURN) * 0.85 + k.wander * 0.15;
    target = d > 0.05 ? 0.032 : 0.012;
  }

  // --- keep apart from neighbours ---
  const sepWeight = k.mood === 'curious' ? 0.25 : 1;
  for (const o of school) {
    if (o === k) continue;
    const d = planeDistance(k, o), r = 0.95 * Math.max(bodyLength(k), bodyLength(o));
    if (d < r) {
      const w = (1 - d / r) * sepWeight;
      const away = wrap(angleTo(o, k) - k.heading);
      omega += clamp((away || 0.3) * 3, -MAX_TURN, MAX_TURN) * w;
      target = Math.max(target, 0.02 + 0.02 * w);
    }
  }

  // --- turn away from the shore well before reaching it ---
  const ds = distanceToShore(k.u, k.v);
  if (ds < SHORE_MARGIN) {
    const [nx, ny] = shoreNormal(k.u, k.v);
    const inward = Math.atan2(ny / SQUASH, nx);
    const w = clamp(1 - ds / SHORE_MARGIN, 0, 1);
    const steer = clamp(wrap(inward - k.heading) * 4, -MAX_TURN, MAX_TURN);
    omega = omega * (1 - w) + steer * w;
    if (w > 0.6) target = Math.min(target, 0.02);
  }

  omega = clamp(omega, -MAX_TURN, MAX_TURN);
  k.heading = wrap(k.heading + omega * dt);
  k.turn += (omega - k.turn) * (1 - Math.exp(-dt * 5));
  k.speed = clamp(k.speed + (target - k.speed) * (1 - Math.exp(-dt * accel)), MIN_SPEED, MAX_SPEED);
  k.phase += dt * TAU * (0.55 + k.speed * 32);

  // --- move, never leaving the water ---
  const ps = perspectiveScale(k.v);
  const nu = k.u + Math.cos(k.heading) * k.speed * ps * dt;
  const nv = k.v + Math.sin(k.heading) * k.speed * ps * SQUASH * A * dt;
  if (pointInPond(nu, nv)) { k.u = nu; k.v = nv; }
  else if (!pointInPond(k.u, k.v)) { [k.u, k.v] = nearestInside(k.u, k.v); }
}

export function stepSchool(school, dtSec, tSec, rng) {
  const dt = clamp(dtSec, 0, MAX_DT);
  for (const k of school) stepOne(k, school, dt, tSec, rng);
}
