// Dalat Chill: a garden you can walk through.
import * as THREE from 'three';
import { zoneAt } from './world.js';
import { createAtmosphere } from './atmosphere.js';
import { createTerrain } from './terrain.js';
import { createHouse } from './house.js';
import { createPond } from './pond.js';
import { createFlora } from './flora.js';
import { loadModels, DETAIL_LAYER } from './models.js';
import { createSchool3D, stepSchool3D, scare } from './koi-sim3d.js';
import { createKoi3D } from './koi3d.js';
import { createPlayer } from './player.js';
import { AudioEngine } from '../src/audio.js';

const canvas = document.getElementById('scene');
const loader = document.getElementById('loader');
const ui = document.getElementById('ui');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SHADOW_SETTLE_S = 3;
const MAX_DPR = 1.5, UI_IDLE_MS = 4000, KOI = 12;

function fail(err) {
  if (err) console.error(err);
  canvas.hidden = true; ui.hidden = true;
  document.getElementById('fallback').hidden = false;
  loader.classList.add('done');
}

function button(cls, text, onClick) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = `pill ${cls}`; b.textContent = text;
  b.addEventListener('click', onClick);
  ui.append(b);
  return b;
}

function boot(models) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (err) { return fail(err); }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;         // the garden stands still: shadows are drawn while it loads, then kept

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 6000);
  camera.layers.enable(DETAIL_LAYER);
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 74 : 58;            // a wider lens on tall screens
    camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize', resize);

  const atmosphere = createAtmosphere(scene, renderer);
  createTerrain(scene, models);
  createHouse(scene);
  const pond = createPond(scene, models);
  const flora = createFlora(scene, models);
  const school = createSchool3D(KOI, Math.random);
  const koi = createKoi3D(scene, school);
  const audio = new AudioEngine({});

  let now = 0, audioStarted = false, swallowToggle = false, zone = 'overview';

  const player = createPlayer(camera, canvas, {
    trunks: flora.trunks, reducedMotion,
    onTapWater(x, z) {
      if (!pond.isWater(x, z)) return false;
      pond.ripple(x, z, now); scare(school, x, z, now); audio.splash();
      return true;
    },
    onUserInput() { hint.classList.add('gone'); },
  });

  // --- the quiet layer of controls ---
  const brand = document.createElement('h1'); brand.className = 'brand'; brand.textContent = 'Dalat Chill'; ui.append(brand);
  const hint = document.createElement('p'); hint.className = 'hint';
  hint.textContent = 'Kéo để nhìn quanh · W A S D hoặc bấm xuống đất để đi · bấm vào hồ để gọi cá';
  ui.append(hint);
  const sound = button('sound', '', () => {
    if (swallowToggle) { swallowToggle = false; return; }
    audio.setMuted(!audio.muted); refreshSound();
  });
  const tour = button('tour', '', () => { if (player.touring) player.stopTour(); else { player.startTour(); hint.classList.add('gone'); } });
  const home = button('back', 'Về chỗ ban đầu', () => player.goHome());
  ui.classList.add('at-stop');
  function refreshSound() {
    sound.hidden = !audio.available;
    sound.textContent = !audioStarted ? '♪ Chạm để bật âm thanh' : audio.muted ? '♪ Âm thanh: tắt' : '♪ Âm thanh: bật';
  }
  refreshSound();

  let idle = 0;
  const wake = () => { ui.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(() => ui.classList.add('idle'), UI_IDLE_MS); };
  for (const type of ['pointermove', 'pointerdown', 'keydown', 'touchstart']) window.addEventListener(type, wake, { passive: true });
  wake();

  // Browsers only allow sound after a gesture; that gesture must not also toggle mute.
  function firstGesture() {
    swallowToggle = !audioStarted;
    if (audioStarted) return;
    audioStarted = true;
    audio.start().then(refreshSound);
    audio.setView(zone); refreshSound();
  }
  window.addEventListener('pointerdown', firstGesture, { capture: true });
  window.addEventListener('keydown', firstGesture, { capture: true });
  for (const type of ['pointerup', 'click']) window.addEventListener(type, () => audio.resume(), { capture: true });
  window.addEventListener('keydown', (ev) => {
    if (ev.repeat || ev.ctrlKey || ev.altKey || ev.metaKey) return;
    if (ev.code === 'KeyM') { if (swallowToggle) { swallowToggle = false; return; } audio.setMuted(!audio.muted); refreshSound(); }
    else if (ev.code === 'KeyT') { if (player.touring) player.stopTour(); else player.startTour(); }
  });

  // --- frame loop ---
  let last = performance.now(), rafId = 0, running = true, touringShown = null;
  function frame(ms) {
    if (!running) return;
    const dt = Math.min(0.1, Math.max(0, (ms - last) / 1000));
    last = ms; now += dt;

    player.update(dt);
    stepSchool3D(school, dt, now, Math.random);
    koi.update();
    pond.update(now); flora.update(now, player.pos); atmosphere.update(now);

    const z = zoneAt(player.pos.x, player.pos.z);
    if (z !== zone) { zone = z; audio.setView(zone); }
    if (touringShown !== player.touring) { touringShown = player.touring; tour.textContent = touringShown ? 'Dừng dạo' : 'Dạo quanh khu vườn'; }

    if (now < SHADOW_SETTLE_S) renderer.shadowMap.needsUpdate = true;      // until every texture has arrived
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    cancelAnimationFrame(rafId);
    if (running) { last = performance.now(); audio.resume(); rafId = requestAnimationFrame(frame); } else audio.suspend();
  });

  // draw once so shaders are compiled before the curtain lifts
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  rafId = requestAnimationFrame(frame);
  loader.classList.add('done');
  window.__garden = { player, school, renderer, scene, camera };
}

loadModels().then(boot).catch(fail);
