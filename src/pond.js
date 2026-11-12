// Pond geometry in image coordinates. Distances are measured in units of image width
// (v is divided by the image aspect) so they are isotropic on screen.
import { POND_POLYGON, OBSTACLES } from './pond-data.js';
import { CONFIG } from './config.js';

export { POND_POLYGON, OBSTACLES };

const A = CONFIG.imageAspect;
const P = POND_POLYGON;

export const POND_BOUNDS = P.reduce((b, [u, v]) => ({
  u0: Math.min(b.u0, u), v0: Math.min(b.v0, v), u1: Math.max(b.u1, u), v1: Math.max(b.v1, v),
}), { u0: 1, v0: 1, u1: 0, v1: 0 });

export function pointInPond(u, v) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [ui, vi] = P[i], [uj, vj] = P[j];
    if ((vi > v) !== (vj > v) && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) inside = !inside;
  }
  return inside;
}

// Closest point on the shoreline: { u, v, d } with d in width units.
function closestOnShore(u, v) {
  let best = { u: 0, v: 0, d: Infinity };
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const ax = P[j][0], ay = P[j][1] / A, bx = P[i][0], by = P[i][1] / A;
    const px = u, py = v / A;
    const ex = bx - ax, ey = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey) / (ex * ex + ey * ey || 1)));
    const cx = ax + ex * t, cy = ay + ey * t;
    const d = Math.hypot(px - cx, py - cy);
    if (d < best.d) best = { u: cx, v: cy * A, d };
  }
  return best;
}

export function distanceToShore(u, v) {
  const d = closestOnShore(u, v).d;
  return pointInPond(u, v) ? d : -d;
}

// Unit vector (width units) pointing from the nearest shore point toward (u, v).
export function shoreNormal(u, v) {
  const c = closestOnShore(u, v);
  let nx = u - c.u, ny = (v - c.v) / A;
  const len = Math.hypot(nx, ny) || 1;
  nx /= len; ny /= len;
  return pointInPond(u, v) ? [nx, ny] : [-nx, -ny];
}

const CENTRE = [(POND_BOUNDS.u0 + POND_BOUNDS.u1) / 2, (POND_BOUNDS.v0 + POND_BOUNDS.v1) / 2];

export function nearestInside(u, v) {
  if (pointInPond(u, v)) return [u, v];
  const c = closestOnShore(u, v);
  // step from the shore point toward the pond centre until we are inside
  for (let k = 0.02; k <= 1; k += 0.02) {
    const nu = c.u + (CENTRE[0] - c.u) * k, nv = c.v + (CENTRE[1] - c.v) * k;
    if (pointInPond(nu, nv)) return [nu, nv];
  }
  return [...CENTRE];
}

export function perspectiveScale(v) {
  const t = (v - POND_BOUNDS.v0) / (POND_BOUNDS.v1 - POND_BOUNDS.v0);
  return 0.45 + 0.55 * Math.max(0, Math.min(1, t));
}

export function randomPointInPond(rng) {
  for (let i = 0; i < 1000; i++) {
    const u = POND_BOUNDS.u0 + rng() * (POND_BOUNDS.u1 - POND_BOUNDS.u0);
    const v = POND_BOUNDS.v0 + rng() * (POND_BOUNDS.v1 - POND_BOUNDS.v0);
    if (pointInPond(u, v)) return [u, v];
  }
  return [...CENTRE];
}
