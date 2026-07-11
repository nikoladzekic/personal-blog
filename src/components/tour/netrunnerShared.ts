/**
 * Shared pixel-art assets and helpers for the NETRUNNER arcade: used by the
 * in-world cabinet screen (ArcadeScreen), and the playable game overlay
 * (NetrunnerGame). High scores persist in localStorage so the cabinet's
 * attract mode reflects the player's best run.
 */

export const PIXEL = "'Press Start 2P', monospace";
export const MONO = "'Share Tech Mono', monospace";

/* 16x14 skull sprite (0 transparent, 1 bone, 2 shadow, 3 eye glow) */
// prettier-ignore
export const SKULL: number[][] = [
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,2,3,3,2,1,1,1,1,2,3,3,2,1,1],
  [1,1,2,3,3,2,1,1,1,1,2,3,3,2,1,1],
  [1,1,1,2,2,1,1,2,2,1,1,2,2,1,1,1],
  [0,1,1,1,1,1,2,2,2,2,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,2,1,2,1,1,2,1,2,1,1,0,0],
  [0,0,0,1,2,1,2,1,1,2,1,2,1,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,0,1,0,1,1,1,1,0,1,0,0,0,0],
];

export const SKULL_PALETTE: Record<number, string> = {
  1: '#cdd2e8',
  2: '#5a608a',
  3: '#39ff14',
};

/* 12x8 runner sprite, two run frames + one slide frame
 * (0 transparent, 1 suit, 2 visor glow, 3 trim) */
// prettier-ignore
export const RUNNER_FRAMES: number[][][] = [
  [ // frame A — legs apart
    [0,0,0,0,1,1,1,0,0,0,0,0],
    [0,0,0,1,2,2,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,1,1,1,1,1,1,3,0,0,0],
    [0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,1,1,0,0,1,1,0,0,0,0],
    [0,1,1,0,0,0,0,1,1,0,0,0],
  ],
  [ // frame B — legs crossed
    [0,0,0,0,1,1,1,0,0,0,0,0],
    [0,0,0,1,2,2,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,1,1,1,1,1,1,3,0,0,0],
    [0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,0,0,0,0,0,0],
    [0,0,0,0,1,1,0,0,0,0,0,0],
  ],
  [ // frame C — sliding/duck
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,1,1,1,0,0],
    [0,0,0,0,0,0,1,2,2,1,0,0],
    [0,1,1,1,1,1,1,1,1,1,0,0],
    [1,1,1,1,1,1,1,1,1,0,0,0],
    [0,1,1,0,0,0,1,1,0,0,0,0],
  ],
];

export const RUNNER_PALETTE: Record<number, string> = {
  1: '#62e8ff',
  2: '#39ff14',
  3: '#ff5ad2',
};

/* 10x6 ICE drone sprite (duck under it) */
// prettier-ignore
export const DRONE: number[][] = [
  [0,0,1,1,0,0,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,0],
  [1,1,2,1,1,1,1,2,1,1],
  [1,1,1,1,3,3,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,0],
  [0,0,0,1,0,0,1,0,0,0],
];

export const DRONE_PALETTE: Record<number, string> = {
  1: '#b03ae8',
  2: '#ff5ad2',
  3: '#ffe14a',
};

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: number[][],
  x: number,
  y: number,
  px: number,
  palette: Record<number, string>
) {
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const v = sprite[row][col];
      if (!v) continue;
      ctx.fillStyle = palette[v];
      ctx.fillRect(x + col * px, y + row * px, px, px);
    }
  }
}

/* Deterministic starfield for a given canvas size */
export function makeStars(count: number, w: number, h: number) {
  return Array.from({ length: count }, (_, i) => {
    const r1 = Math.sin(i * 127.1) * 43758.5453;
    const r2 = Math.sin(i * 311.7) * 12543.853;
    const r3 = Math.sin(i * 74.7) * 9631.41;
    return {
      x: (r1 - Math.floor(r1)) * w,
      y: (r2 - Math.floor(r2)) * h,
      phase: (r3 - Math.floor(r3)) * Math.PI * 2,
      speed: 1.5 + (r3 - Math.floor(r3)) * 3,
    };
  });
}

/* Static CRT overlay: scanlines, aperture columns, vignette, dark curved corners */
export function makeCrtOverlay(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  for (let x = 0; x < w; x += 3) ctx.fillRect(x, 0, 1, h);

  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, w * 0.62);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  const r = Math.round(Math.min(w, h) * 0.07);
  ctx.fillStyle = 'rgba(0,0,0,0.92)';
  for (const [cx, cy] of [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.rect(cx - r, cy - r, r * 2, r * 2);
    ctx.fill('evenodd');
  }
  return c;
}

/* ------------------------------- high scores ------------------------------- */

const HISCORE_KEY = 'netrunner-hiscore';

const BUILTIN_SCORES: [string, number][] = [
  ['ACE', 4213],
  ['R4T', 2048],
  ['GH0', 1337],
  ['SYS', 640],
  ['NUL', 256],
];

export function getBestScore(): number {
  try {
    return Number(localStorage.getItem(HISCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function submitScore(score: number): boolean {
  const best = getBestScore();
  if (score > best) {
    try {
      localStorage.setItem(HISCORE_KEY, String(Math.floor(score)));
    } catch {
      /* private mode — score just isn't persisted */
    }
    return true;
  }
  return false;
}

/** Built-in table merged with the player's persisted best, sorted descending. */
export function getScoreTable(): [string, string, number][] {
  const rows: [string, number][] = [...BUILTIN_SCORES];
  const best = getBestScore();
  if (best > 0) rows.push(['YOU', best]);
  rows.sort((a, b) => b[1] - a[1]);
  return rows.slice(0, 5).map(([name, score], i) => [String(i + 1), name, score]);
}
