// The garden's layout and rules, in metres. Pure maths: no rendering.
// x runs left to right, z runs from the forest behind the house (negative) toward the
// visitor (positive), y is up.

export const WATER_Y = -0.25;
export const BOUNDS = 34;                         // how far from the centre you may wander
export const CENTRE = { x: 0, z: 2 };
export const POND = { x: 0, z: 3, rx: 7, rz: 4.5 };
export const HOUSE = { x: 7.5, z: -11, w: 11, d: 6.5, porch: 2.4, deck: 0.38 };
export const BRIDGE = { a: [3.3, -1.5], b: [7.6, 3.4], half: 0.85, deck: 0.22 };
export const START = { x: -3.5, z: 17, lookX: 3, lookZ: -5 };
export const HYDRANGEA = { x: -13, z: -1 };
// the gravel path: a winding line from the front-left toward the forest
export const PATH = [[-9, 20], [-10.5, 13], [-9.5, 7], [-11.5, 1], [-10, -5], [-6, -10], [-4, -16], [-7, -24]];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// 0 at the middle of the pond, 1 on its shoreline, growing outward. The outline wobbles
// so the pond is not a plain ellipse.
export function pondEdge(x, z) {
  const dx = (x - POND.x) / POND.rx, dz = (z - POND.z) / POND.rz;
  const a = Math.atan2(dz, dx);
  const wobble = 1 + 0.11 * Math.sin(3 * a + 0.5) + 0.06 * Math.sin(5 * a + 2);
  return Math.hypot(dx, dz) / wobble;
}

function distToSegment(x, z, a, b) {
  const ex = b[0] - a[0], ez = b[1] - a[1];
  const t = Math.min(1, Math.max(0, ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez)));
  return Math.hypot(x - (a[0] + ex * t), z - (a[1] + ez * t));
}

export function distToPath(x, z) {
  let d = Infinity;
  for (let i = 1; i < PATH.length; i++) d = Math.min(d, distToSegment(x, z, PATH[i - 1], PATH[i]));
  return d;
}

export const onBridge = (x, z) => distToSegment(x, z, BRIDGE.a, BRIDGE.b) < BRIDGE.half;

// Bare ground: flat around the house and pond, rolling up into hills toward the forest.
export function terrainHeight(x, z) {
  const r = Math.hypot(x - CENTRE.x, z - CENTRE.z);
  const far = smooth(20, 62, r);
  let h = far * (3 + 2.6 * Math.sin(x * 0.05 + 1) * Math.cos(z * 0.045) + Math.max(0, -z - 8) * 0.13 + Math.max(0, -x - 8) * 0.09);
  const e = pondEdge(x, z);
  const lumpy = smooth(1.15, 1.8, e);
  h += 0.07 * Math.sin(x * 0.9 + 0.3) * Math.cos(z * 0.8) * lumpy;
  h -= 1.25 * (1 - smooth(0.5, 1.12, e));
  return h;
}

const houseFront = () => HOUSE.z + HOUSE.d / 2;
const inPorch = (x, z) => Math.abs(x - HOUSE.x) < HOUSE.w / 2 && z >= houseFront() && z <= houseFront() + HOUSE.porch;

// Height of whatever you would be standing on.
export function groundY(x, z) {
  if (onBridge(x, z)) return BRIDGE.deck;
  if (inPorch(x, z)) return HOUSE.deck;
  // a shallow ramp of steps down from the porch
  const step = z - (houseFront() + HOUSE.porch);
  if (Math.abs(x - HOUSE.x) < HOUSE.w / 2 && step > 0 && step < 1.2) return Math.max(terrainHeight(x, z), HOUSE.deck * (1 - step / 1.2));
  return terrainHeight(x, z);
}

export function isWalkable(x, z) {
  if (Math.hypot(x - CENTRE.x, z - CENTRE.z) > BOUNDS) return false;
  const m = 0.4;
  if (Math.abs(x - HOUSE.x) < HOUSE.w / 2 + m && Math.abs(z - HOUSE.z) < HOUSE.d / 2 + m) return false;
  if (pondEdge(x, z) < 1.03 && !onBridge(x, z)) return false;
  return true;
}

// Where a step from `from` toward `to` actually ends: blocked moves slide along the obstacle.
export function resolveMove(from, to) {
  if (isWalkable(to.x, to.z)) return { x: to.x, z: to.z };
  if (isWalkable(to.x, from.z)) return { x: to.x, z: from.z };
  if (isWalkable(from.x, to.z)) return { x: from.x, z: to.z };
  if (isWalkable(from.x, from.z)) return { x: from.x, z: from.z };
  for (let r = 0.25; r <= 14; r += 0.25) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, x = from.x + Math.cos(a) * r, z = from.z + Math.sin(a) * r;
      if (isWalkable(x, z)) return { x, z };
    }
  }
  return { x: START.x, z: START.z };
}

// Which part of the garden a spot belongs to; drives the soundscape.
export function zoneAt(x, z) {
  if (distToSegment(x, z, BRIDGE.a, BRIDGE.b) < 1.4) return 'bridge';
  if (pondEdge(x, z) < 1.6) return 'pond';
  if (Math.hypot(x - HOUSE.x, z - (houseFront() + 1)) < 6.5) return 'porch';
  if (Math.hypot(x - HYDRANGEA.x, z - HYDRANGEA.z) < 6) return 'hydrangea';
  if (distToPath(x, z) < 2.5) return 'path';
  return 'overview';
}
