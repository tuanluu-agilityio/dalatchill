// Paints the koi skin atlas on a canvas: SKIN_COUNT rows, each a top-down koi with the
// tail at the left edge and the nose at the right. The canvas is used as a texture.
import { SKIN_COUNT } from './koi-sim.js';

export const SKIN_W = 512, SKIN_H = 192;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const WHITE = '#f4eee2', RED = '#d6401c', ORANGE = '#ec761b', GOLD = '#f0b02e', BLACK = '#262321';
const SKINS = [
  { base: WHITE, patches: [[RED, 5]], fin: '#fbf6ee' },                      // kohaku
  { base: ORANGE, patches: [['#f7a23a', 3]], fin: '#f6b469' },               // orange ogon
  { base: WHITE, patches: [[RED, 4], [BLACK, 5, 0.35]], fin: '#f6f1e8' },     // sanke
  { base: GOLD, patches: [['#f8d262', 3]], fin: '#f6d27a' },                 // yamabuki
  { base: ORANGE, patches: [[WHITE, 4], ['#c9451d', 2]], fin: '#f8e9d6' },    // orange and white
];

// Half-width of the body (in body lengths) at s in [0,1]; 0 = tail tip, 1 = nose.
function halfWidth(s) {
  if (s < 0.2) return 0;
  const t = (s - 0.2) / 0.8;
  return 0.02 * (1 - t) + 0.092 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.85);
}

function bodyPath(ctx, cy) {
  ctx.beginPath();
  const N = 60;
  for (let i = 0; i <= N; i++) { const s = 0.2 + 0.8 * i / N; ctx.lineTo(s * SKIN_W, cy - halfWidth(s) * SKIN_W); }
  for (let i = N; i >= 0; i--) { const s = 0.2 + 0.8 * i / N; ctx.lineTo(s * SKIN_W, cy + halfWidth(s) * SKIN_W); }
  ctx.closePath();
}

function paintSkin(ctx, skin, row) {
  const r = rng(1234 + row * 977);
  const cy = row * SKIN_H + SKIN_H / 2;
  const L = SKIN_W;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, row * SKIN_H, SKIN_W, SKIN_H); ctx.clip();

  // tail fin: a soft translucent fan
  const tail = ctx.createLinearGradient(0.02 * L, 0, 0.26 * L, 0);
  tail.addColorStop(0, skin.fin + '70'); tail.addColorStop(1, skin.fin + 'e8');
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(0.26 * L, cy - 0.018 * L);
  ctx.quadraticCurveTo(0.12 * L, cy - 0.05 * L, 0.02 * L, cy - 0.105 * L);
  ctx.quadraticCurveTo(0.09 * L, cy, 0.02 * L, cy + 0.105 * L);
  ctx.quadraticCurveTo(0.12 * L, cy + 0.05 * L, 0.26 * L, cy + 0.018 * L);
  ctx.closePath(); ctx.fill();

  // pectoral and pelvic fins
  for (const side of [-1, 1]) {
    for (const [s, len, wid, a] of [[0.74, 0.14, 0.055, 'd8'], [0.46, 0.07, 0.03, 'a0']]) {
      ctx.save();
      ctx.translate(s * L, cy + side * halfWidth(s) * L * 0.8);
      ctx.rotate(side * 2.35);
      const g = ctx.createLinearGradient(0, 0, len * L, 0);
      g.addColorStop(0, skin.fin + a); g.addColorStop(1, skin.fin + '28');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(len * L * 0.5, 0, len * L * 0.55, wid * L * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // body
  ctx.save();
  bodyPath(ctx, cy); ctx.clip();
  ctx.fillStyle = skin.base; ctx.fillRect(0, row * SKIN_H, SKIN_W, SKIN_H);
  ctx.filter = 'blur(2.5px)';
  for (const [colour, count, scale = 1] of skin.patches) {
    ctx.fillStyle = colour;
    for (let i = 0; i < count; i++) {
      const s = 0.26 + r() * 0.68;
      const hw = halfWidth(s) * L;
      const x = s * L, y = cy + (r() * 2 - 1) * hw * 0.7;
      const rx = (0.03 + r() * 0.07) * L * scale, ry = (0.4 + r() * 0.9) * hw * scale;
      ctx.beginPath();
      for (let k = 0; k <= 14; k++) {       // wobbly blob
        const a = k / 14 * Math.PI * 2, w = 0.75 + 0.35 * r();
        ctx.lineTo(x + Math.cos(a) * rx * w, y + Math.sin(a) * ry * w);
      }
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.filter = 'none';
  // roundness: darker flanks, a soft highlight down the back
  const shade = ctx.createLinearGradient(0, cy - 0.115 * L, 0, cy + 0.115 * L);
  shade.addColorStop(0, 'rgba(40,30,20,0.55)'); shade.addColorStop(0.3, 'rgba(40,30,20,0.05)');
  shade.addColorStop(0.5, 'rgba(255,255,255,0.16)');
  shade.addColorStop(0.7, 'rgba(40,30,20,0.05)'); shade.addColorStop(1, 'rgba(40,30,20,0.55)');
  ctx.fillStyle = shade; ctx.fillRect(0, row * SKIN_H, SKIN_W, SKIN_H);
  // faint scale rows
  ctx.strokeStyle = 'rgba(60,40,20,0.08)'; ctx.lineWidth = 1;
  for (let x = 0.3 * L; x < 0.82 * L; x += 7) { ctx.beginPath(); ctx.moveTo(x, cy - 60); ctx.quadraticCurveTo(x + 5, cy, x, cy + 60); ctx.stroke(); }
  ctx.restore();

  // dorsal fin
  ctx.strokeStyle = 'rgba(70,45,25,0.45)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0.44 * L, cy); ctx.lineTo(0.7 * L, cy); ctx.stroke();
  // eyes
  ctx.fillStyle = 'rgba(20,18,16,0.85)';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(0.925 * L, cy + side * 0.043 * L, 3.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

export function paintKoiSkins() {
  const canvas = document.createElement('canvas');
  canvas.width = SKIN_W; canvas.height = SKIN_H * SKIN_COUNT;
  const ctx = canvas.getContext('2d');
  SKINS.slice(0, SKIN_COUNT).forEach((skin, row) => paintSkin(ctx, skin, row));
  return canvas;
}
