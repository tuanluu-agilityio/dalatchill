import { CONFIG, VIEWS } from './config.js';
import { CameraRig, applyPan, screenToImage, visibleRect } from './camera.js';
import { createScene, loadTexture } from './scene.js';
import { createSchool, stepSchool, disturb } from './koi-sim.js';
import { createKoiRenderer } from './koi-render.js';
import { createAmbient } from './ambient.js';
import { RippleField } from './ripples.js';
import { AudioEngine } from './audio.js';
import { createUI } from './ui.js';

const canvas = document.getElementById('scene');
const loader = document.getElementById('loader');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DRAG_THRESHOLD = 8;   // px before a press counts as a drag, not a tap

function showFallback() {
  canvas.hidden = true;
  document.getElementById('ui').hidden = true;
  document.getElementById('fallback').hidden = false;
  loader.classList.add('done');
}

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}

async function boot() {
  if (!hasWebGL()) return showFallback();
  const [sceneTex, depth, masks] = await Promise.all([CONFIG.image, CONFIG.depth, CONFIG.masks].map(loadTexture));
  const scene = createScene(canvas, { scene: sceneTex, depth, masks });
  scene.resize();
  window.addEventListener('resize', () => scene.resize());

  const school = createSchool(CONFIG.koiCount, Math.random);
  const koi = createKoiRenderer(scene.renderer, school.length);
  scene.setKoi(koi.texture, koi.rect);
  const ambient = createAmbient(scene.renderer);
  const ripples = new RippleField();
  const audio = new AudioEngine(CONFIG.audioFiles);

  // With reduced motion the camera does not glide: the scene dips to dark and reappears.
  const rig = new CameraRig(VIEWS, { moveMs: reducedMotion ? 0 : CONFIG.moveMs, dwellMs: CONFIG.tourDwellMs });
  const start = Number(new URLSearchParams(location.search).get('view'));
  if (start > 0 && start < VIEWS.length) { rig.goTo(start); rig.update(CONFIG.moveMs); }

  let now = 0;            // scene time in seconds; stands still while the tab is hidden
  let pan = 0;            // sideways drag offset, for screens narrower than the picture
  let audioStarted = false;
  let lastIndex = rig.index;

  let dipping = false;
  function travel(action) {
    if (dipping) return;
    rig.rebase(scene.view); pan = 0;      // a dragged view becomes the starting point
    if (!reducedMotion) return action();
    dipping = true;
    canvas.classList.add('dip');
    setTimeout(() => { action(); canvas.classList.remove('dip'); dipping = false; }, 450);
  }
  const goTo = (i) => { if (i !== rig.index || rig.progress < 1 || pan !== 0) travel(() => rig.goTo(i)); };

  const ui = createUI(document.getElementById('ui'), {
    onGoTo: goTo,
    onTour: () => (rig.touring ? rig.stopTour() : travel(() => rig.startTour())),
    onMute: () => {
      if (swallowToggle) { swallowToggle = false; return; }   // that press only started the sound
      audio.setMuted(!audio.muted); refreshSound();
    },
  });
  const refreshSound = () => ui.setSound({ started: audioStarted, muted: audio.muted, available: audio.available });
  refreshSound();

  // Browsers only allow sound after a gesture, so the first press or key starts it.
  // The press or key that starts the sound must not also toggle mute.
  let swallowToggle = false;
  function firstGesture() {
    swallowToggle = !audioStarted;
    if (audioStarted) return;
    audioStarted = true;
    audio.start().then(refreshSound);
    audio.setView(VIEWS[rig.index].id);
    refreshSound();
  }
  window.addEventListener('pointerdown', firstGesture, { capture: true });
  window.addEventListener('keydown', firstGesture, { capture: true });
  // Touch only counts as a gesture when the finger lifts, so nudge the context again then.
  for (const type of ['pointerup', 'click']) window.addEventListener(type, () => audio.resume(), { capture: true });

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight') travel(() => rig.next());
    else if (ev.key === 'ArrowLeft') travel(() => rig.prev());
    else if (ev.key === 'Escape') goTo(0);
    else if (ev.key === 'm' || ev.key === 'M') {
      if (swallowToggle) { swallowToggle = false; return; }
      audio.setMuted(!audio.muted); refreshSound();
    }
  });

  // --- pointer: parallax, drag to pan, tap for ripples --------------------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let press = null;
  canvas.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'mouse' && !reducedMotion) {
      pointer.tx = (ev.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (ev.clientY / window.innerHeight) * 2 - 1;
    }
    if (!press) return;
    const dx = ev.clientX - press.x;
    if (!press.dragging && Math.abs(dx) > DRAG_THRESHOLD) press.dragging = true;
    if (press.dragging) {
      const r = visibleRect(scene.view, scene.viewAspect, CONFIG.imageAspect);
      pan = press.pan - (dx / window.innerWidth) * (r.u1 - r.u0);
    }
  });
  canvas.addEventListener('pointerdown', (ev) => {
    press = { x: ev.clientX, y: ev.clientY, pan, dragging: false };
    canvas.setPointerCapture?.(ev.pointerId);
  });
  canvas.addEventListener('pointerup', (ev) => {
    const wasDrag = press && press.dragging;
    press = null;
    if (wasDrag) return;
    if (rig.touring) rig.stopTour();
    const b = canvas.getBoundingClientRect();
    const [u, v] = screenToImage((ev.clientX - b.left) / b.width, (ev.clientY - b.top) / b.height,
      scene.view, scene.viewAspect, CONFIG.imageAspect);
    if (ripples.add(u, v, now)) { disturb(school, u, v, now); audio.splash(); }
  });
  canvas.addEventListener('pointercancel', () => { press = null; });

  // --- frame loop ------------------------------------------------------------
  let last = performance.now(), running = true, fade = 0, rafId = 0;
  function frame(ms) {
    if (!running) return;
    const dt = Math.min(0.1, Math.max(0, (ms - last) / 1000));
    last = ms; now += dt;

    const target = rig.update(dt * 1000);
    const panned = applyPan(target, pan, scene.viewAspect, CONFIG.imageAspect);
    pan = panned.pan;                               // keep the drag inside the picture
    const view = scene.setView(panned.view);
    if (rig.index !== lastIndex) {
      lastIndex = rig.index; audio.setView(VIEWS[rig.index].id);
      if (reducedMotion) fade = 0.35;               // the tour cuts between stops: fade the new one in
    }

    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.5);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.5);
    scene.setPointer(pointer.x, pointer.y);

    stepSchool(school, dt, now, Math.random);
    koi.update(school); koi.render();
    ambient.update(now);

    fade = Math.min(1, fade + dt / 2);
    scene.setFade(fade * fade * (3 - 2 * fade));
    scene.setTime(now);
    scene.setRipples(ripples.active(now));
    scene.render();
    ambient.render(visibleRect(view, scene.viewAspect, CONFIG.imageAspect), view.zoom, canvas.clientHeight);

    ui.layout(view, scene.viewAspect, { index: rig.index, touring: rig.touring });
    rafId = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    cancelAnimationFrame(rafId);                    // never run two loops at once
    if (running) { last = performance.now(); audio.resume(); rafId = requestAnimationFrame(frame); }
    else audio.suspend();
  });

  rafId = requestAnimationFrame(frame);
  loader.classList.add('done');
}

boot().catch((err) => { console.error(err); showFallback(); });
