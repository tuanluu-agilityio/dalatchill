// Click ripples on the pond. Pure bookkeeping; the shader draws them.
import { pointInPond } from './pond.js';
import { CONFIG } from './config.js';

export const RIPPLE_LIFE = 4; // seconds

export class RippleField {
  constructor(max = CONFIG.maxRipples) { this.max = max; this.items = []; }

  add(u, v, tSec) {
    if (!pointInPond(u, v)) return false;
    this.items.push({ u, v, t0: tSec });
    if (this.items.length > this.max) this.items.shift();
    return true;
  }

  active(tSec) {
    this.items = this.items.filter((r) => tSec - r.t0 < RIPPLE_LIFE);
    return this.items.map((r) => ({ u: r.u, v: r.v, age: tSec - r.t0 }));
  }
}
