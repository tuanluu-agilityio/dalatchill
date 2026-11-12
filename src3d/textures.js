// Small painted textures, made on canvases at start-up so the page needs no image files.
import * as THREE from 'three';

export function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function canvasTexture(w, h, paint, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

function speckle(ctx, w, h, r, n, colours, size = [1, 3], alpha = [0.05, 0.25]) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha[0] + r() * (alpha[1] - alpha[0]);
    ctx.fillStyle = colours[Math.floor(r() * colours.length)];
    const s = size[0] + r() * (size[1] - size[0]);
    ctx.fillRect(r() * w, r() * h, s, s);
  }
  ctx.globalAlpha = 1;
}

// Light mottling multiplied over vertex colours so the ground is not flat.
export function groundTexture() {
  const r = seeded(11);
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#d9d9d9'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, r, 9000, ['#ffffff', '#8f8f8f', '#b8b8b8', '#f2f2f2', '#707070'], [1, 4], [0.08, 0.3]);
  }, { repeat: [48, 48] });
}

export function woodTexture() {
  const r = seeded(21);
  return canvasTexture(512, 512, (ctx, w, h) => {
    const planks = 8, pw = w / planks;
    for (let i = 0; i < planks; i++) {
      const l = 44 + r() * 9;
      ctx.fillStyle = `hsl(${24 + r() * 6}, ${46 + r() * 10}%, ${l}%)`; ctx.fillRect(i * pw, 0, pw, h);
      for (let g = 0; g < 26; g++) {          // grain
        ctx.strokeStyle = `rgba(70,40,15,${0.05 + r() * 0.12})`; ctx.lineWidth = 0.6 + r();
        const x = i * pw + r() * pw; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + r() * 6 - 3, h / 3, x + r() * 6 - 3, h * 2 / 3, x + r() * 4 - 2, h); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(40,22,8,0.55)'; ctx.fillRect(i * pw, 0, 2.5, h);
      ctx.fillStyle = 'rgba(255,220,170,0.12)'; ctx.fillRect(i * pw + 3, 0, 2, h);
    }
  });
}

export function stoneTexture() {
  const r = seeded(31);
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#55524c'; ctx.fillRect(0, 0, w, h);      // mortar
    for (let i = 0; i < 150; i++) {
      const x = r() * w, y = r() * h, rx = 20 + r() * 26, ry = 14 + r() * 18, l = 52 + r() * 22;
      for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {   // wrap so it tiles
        ctx.fillStyle = `hsl(${32 + r() * 14}, ${7 + r() * 9}%, ${l}%)`;
        ctx.beginPath(); ctx.ellipse(x + ox, y + oy, rx, ry, r() * 3, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(30,28,24,0.5)'; ctx.lineWidth = 2; ctx.stroke();
      }
    }
    speckle(ctx, w, h, r, 3000, ['#ffffff', '#222222'], [1, 2], [0.03, 0.12]);
  });
}

export function roofTexture() {
  const r = seeded(41);
  return canvasTexture(512, 512, (ctx, w, h) => {
    const rows = 10, cols = 12, rh = h / rows, cw = w / cols;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      ctx.fillStyle = `hsl(${12 + r() * 8}, ${48 + r() * 14}%, ${38 + r() * 12}%)`;
      const ox = (y % 2) * cw / 2;
      ctx.beginPath(); ctx.roundRect(x * cw + ox - cw, y * rh, cw - 1.5, rh + 5, [0, 0, cw / 2, cw / 2]); ctx.fill();
      ctx.beginPath(); ctx.roundRect(x * cw + ox, y * rh, cw - 1.5, rh + 5, [0, 0, cw / 2, cw / 2]); ctx.fill();
    }
    for (let y = 0; y < rows; y++) { ctx.fillStyle = 'rgba(40,15,8,0.35)'; ctx.fillRect(0, y * rh, w, 3); }
  });
}

// A fern or palm frond: a rib with leaflets, on a transparent ground. Tip at the top.
export function frondTexture() {
  return canvasTexture(128, 512, (ctx, w, h) => {
    ctx.strokeStyle = '#2f5a1c'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(w / 2, h); ctx.lineTo(w / 2, 6); ctx.stroke();
    for (let y = h - 10; y > 10; y -= 11) {
      const t = 1 - y / h, len = (w / 2 - 4) * Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95)) ** 0.7;
      for (const s of [-1, 1]) {
        ctx.fillStyle = `hsl(${96 + t * 14}, 52%, ${27 + 14 * Math.random()}%)`;
        ctx.beginPath(); ctx.moveTo(w / 2, y);
        ctx.quadraticCurveTo(w / 2 + s * len * 0.6, y - 13, w / 2 + s * len, y - 5);
        ctx.quadraticCurveTo(w / 2 + s * len * 0.5, y + 3, w / 2, y + 5); ctx.fill();
      }
    }
  }, { repeat: [1, 1] });
}

// Tileable water normal map: a sum of sine ripples whose wave numbers are whole, so the
// edges match up.
export function waterNormals(seed) {
  const r = seeded(seed), size = 256;
  const waves = Array.from({ length: 14 }, () => {
    const kx = Math.round((r() * 2 - 1) * 6), ky = Math.round((r() * 2 - 1) * 6);
    return { kx, ky, phase: r() * 6.283, amp: 1 / (1 + Math.hypot(kx, ky)) };
  });
  return canvasTexture(size, size, (ctx) => {
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let dx = 0, dy = 0;
      for (const wv of waves) {
        const c = Math.cos(6.283 * (wv.kx * x + wv.ky * y) / size + wv.phase) * wv.amp;
        dx += c * wv.kx; dy += c * wv.ky;
      }
      const nx = -dx * 0.11, ny = -dy * 0.11, inv = 1 / Math.hypot(nx, ny, 1), i = (y * size + x) * 4;
      img.data[i] = (nx * inv * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      img.data[i + 2] = (inv * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, { srgb: false });
}
