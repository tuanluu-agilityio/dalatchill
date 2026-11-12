// The visitor: walks at eye height, looks around by dragging, and can be led on a stroll.
import * as THREE from 'three';
import { START, POND, HOUSE, BRIDGE, HYDRANGEA, groundY, resolveMove, isWalkable } from './world.js';

const EYE = 1.62, WALK = 2.3, STROLL = 1.05, LOOK = 0.0034, DRAG_PX = 7;

// The stroll: a loop past each corner of the garden, and what to look at on the way.
const TOUR = [
  [START.x, START.z], [-7, 11], [-9, 5.5], [-9.5, 0.5], [-6, -4], [-1, -4.6], [BRIDGE.a[0] - 0.4, BRIDGE.a[1] - 1.1],
  [...BRIDGE.a], [...BRIDGE.b], [8.6, 5.6], [8.4, 9.5], [4.5, 12.5], [0, 14.5],
];
const SIGHTS = [[POND.x + 1, POND.z], [HYDRANGEA.x, HYDRANGEA.z], [HYDRANGEA.x, HYDRANGEA.z], [POND.x, POND.z], [HOUSE.x - 2, HOUSE.z + 3],
  [POND.x, POND.z + 1], [POND.x - 2, POND.z + 1], [POND.x - 2, POND.z + 1], [POND.x - 3, POND.z + 2], [POND.x, POND.z], [HOUSE.x - 2, HOUSE.z], [HOUSE.x - 1, HOUSE.z], [HOUSE.x, HOUSE.z]];

export function createPlayer(camera, dom, { trunks = [], reducedMotion = false, onTapWater, onTapGround, onUserInput }) {
  const pos = { x: START.x, z: START.z };
  let yaw = Math.atan2(START.lookX - START.x, -(START.lookZ - START.z)) * -1, pitch = -0.04;
  let y = groundY(pos.x, pos.z) + EYE, bob = 0;
  let target = null;                     // a spot to walk to after a tap
  let touring = false, tourT = 0;
  const keys = new Set();
  const path = new THREE.CatmullRomCurve3(TOUR.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.5);
  const sights = new THREE.CatmullRomCurve3(SIGHTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.5);
  const tourLength = path.getLength();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();

  const stopTour = () => { if (touring) { touring = false; } };
  const userActed = () => { stopTour(); onUserInput?.(); };

  // --- keyboard ---
  const MOVE = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], KeyD: [1, 0] };
  const TURN = { ArrowLeft: 1, ArrowRight: -1, KeyQ: 1, KeyE: -1 };
  window.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
    if (ev.code in MOVE || ev.code in TURN) { keys.add(ev.code); target = null; userActed(); ev.preventDefault(); }
  });
  window.addEventListener('keyup', (ev) => keys.delete(ev.code));
  window.addEventListener('blur', () => keys.clear());

  // --- pointer: drag to look, tap to walk or touch the water ---
  let press = null;
  dom.addEventListener('pointerdown', (ev) => { if (press) return; press = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, lx: ev.clientX, ly: ev.clientY, moved: false }; dom.setPointerCapture?.(ev.pointerId); });
  dom.addEventListener('pointermove', (ev) => {
    if (!press || ev.pointerId !== press.id) return;
    if (!press.moved && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > DRAG_PX) { press.moved = true; userActed(); }
    if (press.moved) {
      yaw += (ev.clientX - press.lx) * LOOK; pitch = Math.max(-1.1, Math.min(0.9, pitch + (ev.clientY - press.ly) * LOOK));
    }
    press.lx = ev.clientX; press.ly = ev.clientY;
  });
  dom.addEventListener('pointercancel', (ev) => { if (press && ev.pointerId === press.id) press = null; });
  dom.addEventListener('pointerup', (ev) => {
    if (!press || ev.pointerId !== press.id) return;
    const tap = !press.moved; press = null;
    if (!tap) return;
    const b = dom.getBoundingClientRect();
    ndc.set(((ev.clientX - b.left) / b.width) * 2 - 1, -((ev.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const d = ray.ray.direction, o = ray.ray.origin;
    if (d.y > -0.02) return;                                   // tapped the sky or the horizon
    // march down the ray until it meets the ground or the water
    for (let t = 0.5; t < 60; t += 0.25) {
      hit.copy(o).addScaledVector(d, t);
      if (onTapWater && hit.y <= -0.25 && onTapWater(hit.x, hit.z)) { userActed(); return; }
      if (hit.y <= groundY(hit.x, hit.z)) {
        userActed();
        const spot = isWalkable(hit.x, hit.z) ? { x: hit.x, z: hit.z } : resolveMove({ x: hit.x, z: hit.z }, { x: hit.x, z: hit.z });
        target = spot; onTapGround?.(spot.x, spot.z);
        return;
      }
    }
  });

  function pushFromTrunks(p) {
    for (const t of trunks) {
      const dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz), min = t.r + 0.3;
      if (d < min && d > 1e-4) { p.x = t.x + dx / d * min; p.z = t.z + dz / d * min; }
    }
    return p;
  }

  function update(dt) {
    let moving = 0;
    if (touring) {
      tourT = (tourT + (STROLL * dt) / tourLength) % 1;
      const p = path.getPointAt(tourT), s = sights.getPointAt(tourT), ahead = path.getPointAt((tourT + 0.03) % 1);
      pos.x = p.x; pos.z = p.z;
      // look mostly at the sight, a little along the way
      const lx = s.x * 0.7 + ahead.x * 0.3 - p.x, lz = s.z * 0.7 + ahead.z * 0.3 - p.z;
      const want = Math.atan2(-lx, -lz);
      let diff = want - yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      yaw += diff * Math.min(1, dt * 0.9); pitch += (-0.07 - pitch) * Math.min(1, dt * 0.8);
      moving = 0.45;
    } else {
      let mx = 0, mz = 0, turn = 0;
      for (const code of keys) { if (code in MOVE) { mx += MOVE[code][0]; mz += MOVE[code][1]; } if (code in TURN) turn += TURN[code]; }
      yaw += turn * dt * 1.5;
      let vx = 0, vz = 0;
      if (mx || mz) {
        const n = Math.hypot(mx, mz), f = mz / n, r = mx / n;
        vx = -Math.sin(yaw) * f + Math.cos(yaw) * r; vz = -Math.cos(yaw) * f - Math.sin(yaw) * r;
      } else if (target) {
        const dx = target.x - pos.x, dz = target.z - pos.z, d = Math.hypot(dx, dz);
        if (d < 0.25) target = null; else { const ease = Math.min(1, d / 1.2); vx = dx / d * ease; vz = dz / d * ease; }
      }
      if (vx || vz) {
        const before = { ...pos };
        const next = pushFromTrunks(resolveMove(pos, { x: pos.x + vx * WALK * dt, z: pos.z + vz * WALK * dt }));
        if (isWalkable(next.x, next.z)) { pos.x = next.x; pos.z = next.z; }
        const went = Math.hypot(pos.x - before.x, pos.z - before.z);
        moving = Math.min(1, went / (WALK * dt + 1e-6));
        if (target && went < WALK * dt * 0.15) target = null;      // blocked: give up on that spot
      }
    }
    bob += dt * 7.5 * moving;
    const goal = groundY(pos.x, pos.z) + EYE + (reducedMotion ? 0 : Math.sin(bob) * 0.028 * moving);
    y += (goal - y) * Math.min(1, dt * 9);
    camera.position.set(pos.x, y, pos.z);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }

  return {
    pos, update,
    get touring() { return touring; },
    startTour() {
      // join the loop at the nearest point
      let best = 0, bd = Infinity;
      for (let i = 0; i < 200; i++) { const p = path.getPointAt(i / 200), d = Math.hypot(p.x - pos.x, p.z - pos.z); if (d < bd) { bd = d; best = i / 200; } }
      tourT = best; touring = true; target = null;
    },
    stopTour,
    lookAt(x, z, tilt = pitch) { yaw = Math.atan2(-(x - pos.x), -(z - pos.z)); pitch = tilt; },
    goHome() { pos.x = START.x; pos.z = START.z; target = null; stopTour(); this.lookAt(START.lookX, START.lookZ, -0.04); },
  };
}
