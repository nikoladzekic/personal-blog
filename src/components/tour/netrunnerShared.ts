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

/* 12x10 runner sprite — 4-frame run cycle + jump + slide
 * (0 transparent, 1 limbs, 2 visor glow, 3 scarf, 4 jacket/helmet, 5 boots/gloves)
 * Frame index: 0 contact A, 1 pass A (neutral pose), 2 contact B, 3 pass B,
 * 4 jump, 5 slide. Run cycle = frames 0-3. */
// prettier-ignore
export const RUNNER_FRAMES: number[][][] = [
  [ // 0 — run contact A: legs split wide, scarf trailing
    [0,0,0,0,0,4,4,4,0,0,0,0],
    [0,0,0,0,4,4,2,2,0,0,0,0],
    [0,0,0,0,4,4,4,4,0,0,0,0],
    [3,3,0,0,0,4,4,0,0,0,0,0],
    [0,3,3,4,4,4,4,4,1,1,0,0],
    [0,0,3,4,4,4,4,4,0,1,5,0],
    [0,0,1,1,4,4,4,0,0,0,0,0],
    [0,5,1,0,1,1,1,1,0,0,0,0],
    [0,0,0,1,1,0,0,1,1,0,0,0],
    [0,0,5,5,0,0,0,0,5,5,0,0],
  ],
  [ // 1 — run pass A / neutral ready pose
    [0,0,0,0,0,4,4,4,0,0,0,0],
    [0,0,0,0,4,4,2,2,0,0,0,0],
    [0,0,0,0,4,4,4,4,0,0,0,0],
    [0,3,3,0,0,4,4,0,0,0,0,0],
    [0,0,3,3,4,4,4,4,1,0,0,0],
    [0,0,0,4,4,4,4,4,1,5,0,0],
    [0,0,0,1,4,4,4,0,0,0,0,0],
    [0,0,0,0,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,1,0,0,0,0,0,0],
    [0,0,0,5,5,0,0,0,0,0,0,0],
  ],
  [ // 2 — run contact B: scarf dips, legs crossed under
    [0,0,0,0,0,4,4,4,0,0,0,0],
    [0,0,0,0,4,4,2,2,0,0,0,0],
    [0,0,0,0,4,4,4,4,0,0,0,0],
    [0,3,3,0,0,4,4,0,0,0,0,0],
    [3,3,0,4,4,4,4,4,1,1,0,0],
    [0,0,0,4,4,4,4,4,0,1,5,0],
    [0,0,1,1,4,4,4,0,0,0,0,0],
    [0,5,1,0,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,0,0,0,0],
    [0,0,0,5,5,0,5,5,0,0,0,0],
  ],
  [ // 3 — run pass B: scarf whips high
    [0,0,0,0,0,4,4,4,0,0,0,0],
    [0,3,0,0,4,4,2,2,0,0,0,0],
    [0,3,3,0,4,4,4,4,0,0,0,0],
    [0,0,3,0,0,4,4,0,0,0,0,0],
    [0,0,3,3,4,4,4,4,1,0,0,0],
    [0,0,0,4,4,4,4,4,1,5,0,0],
    [0,0,0,1,4,4,4,0,0,0,0,0],
    [0,0,0,0,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,0,1,0,0,0,0,0],
    [0,0,5,5,0,5,5,0,0,0,0,0],
  ],
  [ // 4 — jump: knees tucked, arm reaching up-forward, scarf streaming
    [0,0,0,0,0,4,4,4,0,0,0,0],
    [0,0,0,0,4,4,2,2,0,1,5,0],
    [0,0,0,0,4,4,4,4,1,1,0,0],
    [0,0,0,0,0,4,4,1,0,0,0,0],
    [0,3,3,4,4,4,4,4,0,0,0,0],
    [3,3,0,4,4,4,4,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,0,0,0,0],
    [0,0,0,1,1,0,1,1,0,0,0,0],
    [0,0,5,5,0,0,5,5,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
  ],
  [ // 5 — slide: low profile, scarf flat behind
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,4,4,4,0,0],
    [3,3,0,0,0,0,4,4,2,2,0,0],
    [0,3,3,4,4,4,4,4,4,4,0,0],
    [0,4,4,4,4,4,4,4,1,1,5,0],
    [1,1,1,1,1,1,1,1,0,0,0,0],
    [0,5,5,0,0,5,5,0,0,0,0,0],
  ],
];

export const RUNNER_PALETTE: Record<number, string> = {
  1: '#2e7fa8',
  2: '#39ff14',
  3: '#ff5ad2',
  4: '#62e8ff',
  5: '#ffe14a',
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

const SCORES_KEY = 'netrunner-scores';
const LEGACY_KEY = 'netrunner-hiscore';

interface ScoreEntry {
  name: string;
  score: number;
}

const BUILTIN_SCORES: [string, number][] = [
  ['ACE', 4213],
  ['R4T', 2048],
  ['GH0', 1337],
  ['SYS', 640],
  ['NUL', 256],
];

/** Player-set entries only (builtins are added at read time). Newest schema is
 * a JSON array of {name, score}; a bare number under LEGACY_KEY is migrated. */
function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((e) => typeof e?.score === 'number');
    }
    const legacy = Number(localStorage.getItem(LEGACY_KEY));
    if (legacy > 0) return [{ name: 'YOU', score: legacy }];
  } catch {
    /* private mode / corrupt data — start empty */
  }
  return [];
}

function saveScores(entries: ScoreEntry[]) {
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(entries.slice(0, 10)));
  } catch {
    /* private mode — score just isn't persisted */
  }
}

/** The player's best run so far (0 if none). Drives the in-game HI counter. */
export function getBestScore(): number {
  return loadScores().reduce((max, e) => Math.max(max, e.score), 0);
}

/** Would this score land in the visible top-5 (against builtins + past runs)? */
export function qualifiesForTable(score: number): boolean {
  if (score <= 0) return false;
  const merged = [
    ...BUILTIN_SCORES.map(([, s]) => s),
    ...loadScores().map((e) => e.score),
  ].sort((a, b) => b - a);
  return merged.length < 5 || Math.floor(score) > merged[4];
}

/** Persist a named run. Name is coerced to 3 uppercase chars. */
export function submitScore(name: string, score: number) {
  const entries = loadScores();
  entries.push({
    name: (name.slice(0, 3).toUpperCase() || 'YOU').padEnd(3, ' ').trimEnd(),
    score: Math.floor(score),
  });
  entries.sort((a, b) => b.score - a.score);
  saveScores(entries);
}

/**
 * Built-in table merged with the player's persisted runs, sorted descending.
 * The trailing boolean flags player-set rows so the cabinet can highlight them.
 */
export function getScoreTable(): [string, string, number, boolean][] {
  const rows = [
    ...BUILTIN_SCORES.map(([name, score]) => ({ name, score, you: false })),
    ...loadScores().map((e) => ({ name: e.name, score: e.score, you: true })),
  ];
  rows.sort((a, b) => b.score - a.score);
  return rows.slice(0, 5).map((r, i) => [String(i + 1), r.name, r.score, r.you]);
}
