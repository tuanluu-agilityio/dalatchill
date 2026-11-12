// The quiet layer of controls over the scene. Everything fades away when the visitor is
// still, and comes back on the next movement.
import { CONFIG, VIEWS } from './config.js';
import { imageToScreen } from './camera.js';

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

export function createUI(root, { onGoTo, onTour, onMute }) {
  root.append(el('h1', 'brand', 'Dalat Chill'));

  const sound = el('button', 'pill sound');
  sound.type = 'button';
  sound.addEventListener('click', () => onMute());
  root.append(sound);

  const tour = el('button', 'pill tour', 'Dạo quanh khu vườn');
  tour.type = 'button';
  tour.addEventListener('click', () => onTour());
  root.append(tour);

  const back = el('button', 'pill back', 'Toàn cảnh');
  back.type = 'button';
  back.addEventListener('click', () => onGoTo(0));
  root.append(back);

  const caption = el('p', 'caption');
  root.append(caption);

  const spots = VIEWS.map((view, i) => {
    if (i === 0) return null;
    const b = el('button', 'spot');
    b.type = 'button';
    b.setAttribute('aria-label', `Đến ${view.label}`);
    b.append(el('span', 'spot-label', view.label));
    b.addEventListener('click', () => onGoTo(i));
    root.append(b);
    return b;
  });

  // fade out after a spell of stillness
  let idleTimer = 0;
  function wake() {
    root.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => root.classList.add('idle'), CONFIG.uiIdleMs);
  }
  for (const type of ['pointermove', 'pointerdown', 'keydown', 'touchstart']) window.addEventListener(type, wake, { passive: true });
  wake();

  let shownIndex = -1;
  return {
    // called every frame: keeps the hotspots glued to the scene
    layout(view, viewAspect, state) {
      spots.forEach((b, i) => {
        if (!b) return;
        const [sx, sy] = imageToScreen(VIEWS[i].cx, VIEWS[i].cy, view, viewAspect, CONFIG.imageAspect);
        const visible = sx > 0.03 && sx < 0.97 && sy > 0.06 && sy < 0.94 && !(state.index === i);
        b.style.transform = `translate(${(sx * 100).toFixed(2)}vw, ${(sy * 100).toFixed(2)}vh)`;
        b.classList.toggle('hidden', !visible);
      });
      root.classList.toggle('at-stop', state.index !== 0);
      root.classList.toggle('touring', state.touring);
      tour.textContent = state.touring ? 'Dừng dạo' : 'Dạo quanh khu vườn';
      if (shownIndex !== state.index) {
        shownIndex = state.index;
        caption.textContent = state.index === 0 ? '' : VIEWS[state.index].label;
        caption.classList.remove('show'); void caption.offsetWidth; caption.classList.add('show');
      }
    },
    setSound({ started, muted, available }) {
      sound.hidden = !available;
      sound.textContent = !started ? '♪ Chạm để bật âm thanh' : muted ? '♪ Âm thanh: tắt' : '♪ Âm thanh: bật';
      sound.setAttribute('aria-pressed', String(started && !muted));
    },
    wake,
  };
}
