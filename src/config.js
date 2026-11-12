// Single place for tunables. All image coordinates are (u, v) in [0,1], origin top-left, v down.
export const CONFIG = {
  image: 'assets/scene.png',
  depth: 'assets/depth.png',
  masks: 'assets/masks.png',
  koiSkins: 'assets/koi/skins.png',
  imageAspect: 1408 / 768,
  maxDpr: 2,
  uiIdleMs: 4000,
  tourDwellMs: 20000,
  moveMs: 3500,
  koiCount: 10,
  maxRipples: 8,
  parallax: 0.012,
  // Optional looping recordings, e.g. { birds: 'assets/audio/birds.ogg' }. Layers: birds, wind,
  // water, frogs, chimes. Any layer not listed here is synthesised in the browser.
  audioFiles: {},
};

export const VIEWS = [
  { id: 'overview', label: 'Toàn cảnh', cx: 0.5, cy: 0.5, zoom: 1, audio: null },
  { id: 'pond', label: 'Hồ cá koi', cx: 0.52, cy: 0.8, zoom: 1.9, audio: 'water' },
  { id: 'bridge', label: 'Cầu gỗ', cx: 0.8, cy: 0.7, zoom: 2.0, audio: 'frogs' },
  { id: 'porch', label: 'Hiên nhà', cx: 0.6, cy: 0.47, zoom: 2.0, audio: 'chimes' },
  { id: 'hydrangea', label: 'Cẩm tú cầu', cx: 0.1, cy: 0.56, zoom: 2.0, audio: 'birds' },
  { id: 'path', label: 'Lối sỏi', cx: 0.14, cy: 0.84, zoom: 1.9, audio: 'wind' },
];
