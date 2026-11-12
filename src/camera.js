// Pure view math. A view is { cx, cy, zoom } in image coordinates; the viewport shows the
// image "cover" style (cropped, never letterboxed) at zoom 1.

function span(zoom, viewAspect, imgAspect) {
  const wide = viewAspect > imgAspect;
  const w = (wide ? 1 : viewAspect / imgAspect) / zoom;
  const h = (wide ? imgAspect / viewAspect : 1) / zoom;
  return [w, h];
}

export function visibleRect(view, viewAspect, imgAspect) {
  const [w, h] = span(view.zoom, viewAspect, imgAspect);
  return { u0: view.cx - w / 2, v0: view.cy - h / 2, u1: view.cx + w / 2, v1: view.cy + h / 2 };
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function clampView(view, viewAspect, imgAspect) {
  const zoom = Math.max(1, view.zoom);
  const [w, h] = span(zoom, viewAspect, imgAspect);
  return {
    ...view,
    zoom,
    cx: clamp(view.cx, w / 2, 1 - w / 2),
    cy: clamp(view.cy, h / 2, 1 - h / 2),
  };
}

export function screenToImage(sx, sy, view, viewAspect, imgAspect) {
  const r = visibleRect(view, viewAspect, imgAspect);
  return [r.u0 + sx * (r.u1 - r.u0), r.v0 + sy * (r.v1 - r.v0)];
}

export function imageToScreen(u, v, view, viewAspect, imgAspect) {
  const r = visibleRect(view, viewAspect, imgAspect);
  return [(u - r.u0) / (r.u1 - r.u0), (v - r.v0) / (r.v1 - r.v0)];
}

// Adds a sideways drag to a view. Returns the view to show and the part of the drag that
// fits inside the picture. Edge clamping of the target itself is not counted as drag.
export function applyPan(target, pan, viewAspect, imgAspect) {
  const base = clampView(target, viewAspect, imgAspect);
  const view = clampView({ ...base, cx: base.cx + pan }, viewAspect, imgAspect);
  return { view, pan: view.cx - base.cx };
}

const easeInOut = (t) => t * t * t * (t * (t * 6 - 15) + 10);   // smootherstep

// Moves between views with a soft start and stop, and can tour stops 1..n-1 on its own.
export class CameraRig {
  constructor(views, { moveMs, dwellMs }) {
    this.views = views; this.moveMs = moveMs; this.dwellMs = dwellMs;
    this.index = 0; this.touring = false;
    this.from = { ...views[0] }; this.current = { ...views[0] };
    this.elapsed = moveMs; this.dwell = 0;
  }

  get progress() { return this.moveMs <= 0 ? 1 : Math.min(1, this.elapsed / this.moveMs); }

  goTo(i) {
    if (!this.#valid(i)) return;
    this.touring = false;
    if (i === this.index && this.progress >= 1) return;   // already resting there
    this.#travel(i);
  }
  // Adopt a view (for example one the visitor dragged to) as the place the next move starts from.
  rebase(view) { this.current = { cx: view.cx, cy: view.cy, zoom: view.zoom }; }
  next() { this.goTo((this.index + 1) % this.views.length); }
  prev() { this.goTo((this.index + this.views.length - 1) % this.views.length); }
  startTour() { this.touring = true; this.#travel(this.#tourNext()); }
  stopTour() { this.touring = false; }

  update(dtMs) {
    let dt = Math.max(0, dtMs);
    if (this.elapsed < this.moveMs) {
      const used = Math.min(dt, this.moveMs - this.elapsed);
      this.elapsed += used; dt -= used;
    }
    const to = this.views[this.index], p = easeInOut(this.progress);
    // travel in log-zoom so the pull-in feels even, and ease back a touch between two close-ups
    const lift = Math.min(this.from.zoom, to.zoom) > 1.3 ? Math.sin(Math.PI * p) * 0.28 : 0;
    this.current = {
      cx: this.from.cx + (to.cx - this.from.cx) * p,
      cy: this.from.cy + (to.cy - this.from.cy) * p,
      zoom: Math.exp(Math.log(this.from.zoom) + (Math.log(to.zoom) - Math.log(this.from.zoom)) * p) * (1 - lift),
    };
    if (this.touring && this.progress >= 1) {
      this.dwell += dt;
      if (this.dwell >= this.dwellMs) this.#travel(this.#tourNext());
    }
    return this.current;
  }

  #valid(i) { return Number.isInteger(i) && i >= 0 && i < this.views.length; }
  #tourNext() { return this.index >= this.views.length - 1 ? 1 : this.index + 1; }
  #travel(i) {
    this.from = { ...this.current }; this.index = i;
    this.elapsed = 0; this.dwell = 0;
  }
}
