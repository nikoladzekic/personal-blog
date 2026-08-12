import { useEffect, useRef } from 'react';
import {
  PIXEL,
  SKULL,
  SKULL_PALETTE,
  RUNNER_FRAMES,
  RUNNER_PALETTE,
  DRONE,
  DRONE_PALETTE,
  drawSprite,
  makeStars,
  makeCrtOverlay,
  getBestScore,
  submitScore,
  qualifiesForTable,
} from './netrunnerShared';
import { playBlip, resumeAudio, createGameMusic } from './sounds';

/**
 * Fullscreen NETRUNNER mini game — an endless runner in the google-dino mold,
 * pushed well past the clone: variable-height jumps with coyote-time + input
 * buffering, hand-authored obstacle "chunks", near-miss combo multipliers,
 * data-shard pickups, palette-shifting zones, particles/screen-shake/hit-stop,
 * a chromatic-aberration glitch pass, an arcade initials-entry screen, a
 * speed-reactive chiptune loop, and touch controls. Rendered to a fixed low-res
 * canvas upscaled with pixelated image-rendering, framed by an arcade bezel.
 */

const W = 640;
const H = 360;

const GROUND_Y = 300;
const PX = 5; // sprite pixel size
const RUNNER_X = 90;
const GRAVITY = 2600;
const JUMP_V = -880;
const JUMP_CUT = 0.45; // velocity kept when the jump key is released early
const BASE_SPEED = 260;
const MAX_SPEED = 620;

const COYOTE = 0.09; // grace window to still jump just after leaving the ground
const BUFFER = 0.11; // jump pressed this long before landing still fires
const NEAR_MISS = 14; // px clearance that counts as a stylish dodge
const COMBO_WINDOW = 3.2; // seconds before an unfed combo lapses
const ZONE_STEP = 500; // score per palette/zone shift
const SHARD = 12; // pickup size in px

type Phase = 'ready' | 'playing' | 'dead' | 'enter-initials';

interface Obstacle {
  kind: 'firewall' | 'drone';
  x: number;
  w: number;
  h: number;
  /** top edge; for descending drones this is the settle height (see y0/y1) */
  y: number;
  y0?: number; // descend: start (high) top edge
  y1?: number; // descend: settle (slide-height) top edge
  descend?: boolean;
  bobPhase: number;
  minGap: number; // closest vertical clearance seen while overlapping (near-miss)
  scored: boolean; // near-miss already resolved once the obstacle is behind us
}

interface Shard {
  x: number;
  y: number;
  collected: boolean;
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  grav: number;
  size: number;
  color: string;
}

interface Popup {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
}

/** A hand-authored sequence of hazards/pickups spawned as one unit. */
interface ChunkEl {
  kind: 'fw-short' | 'fw-tall' | 'drone' | 'drone-descend' | 'shard';
  dx: number; // px offset from chunk start
  dy?: number; // shard only: offset from GROUND_Y (negative = higher)
}
interface Chunk {
  width: number; // px footprint, feeds the trailing gap calc
  minSpeed?: number; // gated so hard patterns arrive as you speed up
  els: ChunkEl[];
}

const CHUNKS: Chunk[] = [
  { width: 26, els: [{ kind: 'fw-short', dx: 0 }] },
  { width: 26, els: [{ kind: 'fw-tall', dx: 0 }] },
  { width: 40, els: [{ kind: 'drone', dx: 0 }] },
  // double low walls — rhythm jump
  { width: 96, els: [{ kind: 'fw-short', dx: 0 }, { kind: 'fw-short', dx: 70 }] },
  // shard tucked over a wall — jump precisely to grab it
  { width: 26, els: [{ kind: 'fw-short', dx: 0 }, { kind: 'shard', dx: 4, dy: -72 }] },
  // shard low under a drone — grab it while sliding
  { width: 40, els: [{ kind: 'drone', dx: 0 }, { kind: 'shard', dx: 14, dy: -16 }] },
  // three shards in a jump arc
  {
    width: 100,
    els: [
      { kind: 'shard', dx: 0, dy: -30 },
      { kind: 'shard', dx: 50, dy: -66 },
      { kind: 'shard', dx: 100, dy: -30 },
    ],
  },
  // jump the wall, then slide the drone
  {
    width: 176,
    minSpeed: 340,
    els: [{ kind: 'fw-tall', dx: 0 }, { kind: 'drone', dx: 150 }],
  },
  // drone descending onto a wall — telegraphed pincer
  {
    width: 170,
    minSpeed: 400,
    els: [{ kind: 'drone-descend', dx: 0 }, { kind: 'fw-short', dx: 132 }],
  },
  // wall, shard reward high, then a drone
  {
    width: 210,
    minSpeed: 460,
    els: [
      { kind: 'fw-short', dx: 0 },
      { kind: 'shard', dx: 90, dy: -96 },
      { kind: 'drone', dx: 176 },
    ],
  },
];

/** Palette + label per zone; the game cycles through these every ZONE_STEP. */
const ZONES = [
  { name: 'THE GRID', bg: '#04062a', sky: '#0a103f', ground: '#3a44cc', tick: '#2a3488', star: '180,200,255' },
  { name: 'ICE BREACH', bg: '#02121a', sky: '#063a44', ground: '#2ad0ff', tick: '#1a7a88', star: '160,240,255' },
  { name: 'MELTDOWN', bg: '#1a0206', sky: '#3a0a10', ground: '#ff5a44', tick: '#8a2a22', star: '255,180,170' },
  { name: 'NULL SECTOR', bg: '#0a0212', sky: '#2a0a3a', ground: '#b03ae8', tick: '#5a1a7a', star: '220,180,255' },
];

interface GameState {
  phase: Phase;
  t: number;
  speed: number;
  score: number;
  best: number;
  newBest: boolean;
  // player
  playerY: number; // offset above ground, <= 0 while airborne
  velY: number;
  ducking: boolean;
  jumpHeld: boolean;
  coyote: number;
  jumpBuffer: number;
  // world
  obstacles: Obstacle[];
  shards: Shard[];
  particles: Particle[];
  popups: Popup[];
  nextSpawn: number;
  // scoring / combo
  combo: number;
  comboTimer: number;
  multiplier: number;
  // progression + fx
  zone: number;
  banner: number;
  bannerText: string;
  shake: number;
  glitch: number;
  flash: number;
  hitstop: number;
  lastHundred: number;
  trailTimer: number;
  diedAt: number;
  // initials entry
  initials: string[];
  initIdx: number;
}

function freshState(): GameState {
  return {
    phase: 'ready',
    t: 0,
    speed: BASE_SPEED,
    score: 0,
    best: getBestScore(),
    newBest: false,
    playerY: 0,
    velY: 0,
    ducking: false,
    jumpHeld: false,
    coyote: COYOTE,
    jumpBuffer: 0,
    obstacles: [],
    shards: [],
    particles: [],
    popups: [],
    nextSpawn: 1.2,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    zone: 0,
    banner: 0,
    bannerText: '',
    shake: 0,
    glitch: 0,
    flash: 0,
    hitstop: 0,
    lastHundred: 0,
    trailTimer: 0,
    diedAt: 0,
    initials: ['A', 'A', 'A'],
    initIdx: 0,
  };
}

const STARS = makeStars(60, W, H);

/* distant skyline silhouette, deterministic */
const SKYLINE = Array.from({ length: 22 }, (_, i) => {
  const r = Math.sin(i * 91.7) * 23421.63;
  const f = r - Math.floor(r);
  return { w: 22 + f * 30, h: 30 + ((f * 977) % 70) };
});

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function mkFirewall(x: number, h: number): Obstacle {
  return { kind: 'firewall', x, w: 26, h, y: GROUND_Y - h, bobPhase: 0, minGap: Infinity, scored: false };
}
function mkDrone(x: number, descend: boolean): Obstacle {
  return {
    kind: 'drone',
    x,
    w: 40,
    h: 24,
    y: GROUND_Y - 62, // slide-height hover
    y0: descend ? GROUND_Y - 150 : undefined,
    y1: descend ? GROUND_Y - 62 : undefined,
    descend,
    bobPhase: Math.random() * 6,
    minGap: Infinity,
    scored: false,
  };
}

/** Current top edge of an obstacle including bob / descent animation. */
function obstacleY(ob: Obstacle, t: number): number {
  if (ob.kind === 'firewall') return ob.y;
  let base = ob.y;
  if (ob.descend) {
    const p = clamp((W - ob.x) / (W - (RUNNER_X + 40)), 0, 1);
    base = lerp(ob.y0!, ob.y1!, p);
  }
  return base + Math.sin(t * 5 + ob.bobPhase) * 5;
}

function spawnChunk(g: GameState) {
  const pool = CHUNKS.filter((c) => (c.minSpeed ?? 0) <= g.speed);
  const chunk = pool[Math.floor(Math.random() * pool.length)];
  for (const el of chunk.els) {
    const x = W + 40 + el.dx;
    switch (el.kind) {
      case 'fw-short':
        g.obstacles.push(mkFirewall(x, 42));
        break;
      case 'fw-tall':
        g.obstacles.push(mkFirewall(x, 66));
        break;
      case 'drone':
        g.obstacles.push(mkDrone(x, false));
        break;
      case 'drone-descend':
        g.obstacles.push(mkDrone(x, true));
        break;
      case 'shard':
        g.shards.push({ x, y: GROUND_Y + (el.dy ?? -90), collected: false, phase: Math.random() * 6 });
        break;
    }
  }
  const gapPx = lerp(340, 150, (g.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)) + Math.random() * 120;
  g.nextSpawn = (chunk.width + gapPx) / g.speed;
}

/* Runner sprite is 12x10 cells drawn at its own scale so its on-screen height
 * (10 * RUNNER_PX = 40px) matches the original 8-row-at-PX sprite — gameplay
 * tuning and hitboxes are unchanged. */
const RUNNER_PX = 4;

function playerBox(g: GameState) {
  // hitbox intentionally trimmed vs the sprite for forgiveness
  const duck = g.ducking && g.playerY >= 0;
  const w = duck ? 41 : 25;
  const h = duck ? 19 : 32;
  const x = RUNNER_X + 8;
  const y = GROUND_Y - h + g.playerY;
  return { x, y, w, h };
}

/* ------------------------------- fx spawners ------------------------------- */

function burst(g: GameState, x: number, y: number, color: string, n: number, spread: number, grav = 900) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = spread * (0.3 + Math.random() * 0.7);
    g.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - spread * 0.3,
      life: 0.4 + Math.random() * 0.5,
      max: 0.9,
      grav,
      size: 2 + Math.floor(Math.random() * 2),
      color,
    });
  }
}

function popup(g: GameState, x: number, y: number, text: string, color: string) {
  g.popups.push({ x, y, vy: -46, life: 0.9, text, color });
}

function recomputeMultiplier(g: GameState) {
  g.multiplier = 1 + Math.min(g.combo, 8) * 0.5; // 1x .. 5x
}

/* --------------------------------- update ---------------------------------- */

function update(g: GameState, dt: number) {
  g.speed = Math.min(MAX_SPEED, BASE_SPEED + g.score * 0.9);
  g.score += g.speed * dt * 0.04 * g.multiplier;

  // zone shift
  const zoneNow = Math.floor(g.score / ZONE_STEP);
  if (zoneNow > g.zone) {
    g.zone = zoneNow;
    const z = ZONES[g.zone % ZONES.length];
    g.banner = 2.2;
    g.bannerText = `ZONE ${g.zone + 1}: ${z.name}`;
    g.shake = Math.max(g.shake, 6);
    g.glitch = 0.8;
    g.flash = 0.9;
    playBlip(180, 0.5, 'sawtooth', 0.06, 720);
  }

  // milestone glitch flicker every 100 pts
  const hundred = Math.floor(g.score / 100);
  if (hundred > g.lastHundred) {
    g.lastHundred = hundred;
    g.glitch = Math.max(g.glitch, 0.35);
    playBlip(880, 0.07, 'square', 0.04, 1320);
  }

  // jump physics: variable height via coyote-time + input buffering
  const grounded = g.playerY >= 0;
  g.coyote = grounded ? COYOTE : g.coyote - dt;
  g.jumpBuffer -= dt;
  if (g.jumpBuffer > 0 && g.coyote > 0) {
    g.velY = JUMP_V;
    g.playerY = -0.01;
    g.coyote = 0;
    g.jumpBuffer = 0;
    playBlip(520, 0.12, 'square', 0.045, 780);
  }
  if (g.playerY < 0 || g.velY < 0) {
    g.velY += GRAVITY * (g.ducking ? 2.2 : 1) * dt; // fast-fall while ducking mid-air
    g.playerY += g.velY * dt;
    if (g.playerY >= 0) {
      g.playerY = 0;
      g.velY = 0;
      burst(g, RUNNER_X + 18, GROUND_Y, 'rgba(122,134,255,0.7)', 5, 120, 300); // landing dust
    }
  }

  // slide speed-trail
  if (g.ducking && grounded) {
    g.trailTimer -= dt;
    if (g.trailTimer <= 0) {
      g.trailTimer = 0.04;
      g.particles.push({
        x: RUNNER_X + 6,
        y: GROUND_Y - 8,
        vx: -g.speed * 0.4,
        vy: 0,
        life: 0.28,
        max: 0.28,
        grav: 0,
        size: 2,
        color: 'rgba(98,232,255,0.6)',
      });
    }
  }

  // spawn chunks
  g.nextSpawn -= dt;
  if (g.nextSpawn <= 0) spawnChunk(g);

  // move + cull hazards
  for (const ob of g.obstacles) ob.x -= g.speed * dt;
  g.obstacles = g.obstacles.filter((ob) => ob.x + ob.w > -20);
  for (const s of g.shards) s.x -= g.speed * dt;
  g.shards = g.shards.filter((s) => !s.collected && s.x > -20);

  const p = playerBox(g);

  // obstacle collision + near-miss scoring
  for (const ob of g.obstacles) {
    const oy = obstacleY(ob, g.t);
    if (p.x < ob.x + ob.w - 6 && p.x + p.w > ob.x + 6 && p.y < oy + ob.h - 5 && p.y + p.h > oy + 5) {
      die(g);
      return;
    }
    const overlapX = p.x < ob.x + ob.w && p.x + p.w > ob.x;
    if (overlapX) {
      const gapAbove = oy - (p.y + p.h); // cleared over the top
      const gapBelow = p.y - (oy + ob.h); // slid underneath
      const gap = Math.max(gapAbove, gapBelow);
      if (gap >= 0) ob.minGap = Math.min(ob.minGap, gap);
    }
    if (!ob.scored && ob.x + ob.w < p.x) {
      ob.scored = true;
      if (ob.minGap < NEAR_MISS) {
        g.combo++;
        g.comboTimer = COMBO_WINDOW;
        recomputeMultiplier(g);
        g.score += 12 * g.multiplier;
        g.glitch = Math.max(g.glitch, 0.22);
        popup(g, RUNNER_X + 40, GROUND_Y - 80, `CLOSE  x${g.multiplier.toFixed(1)}`, '#ff5ad2');
        playBlip(1040, 0.06, 'square', 0.035, 1560);
      }
    }
  }

  // shard pickups
  for (const s of g.shards) {
    if (p.x < s.x + SHARD && p.x + p.w > s.x && p.y < s.y + SHARD && p.y + p.h > s.y) {
      s.collected = true;
      const bonus = Math.round(40 * g.multiplier);
      g.score += bonus;
      burst(g, s.x + SHARD / 2, s.y + SHARD / 2, '#ffe14a', 10, 220, 500);
      popup(g, s.x, s.y - 6, `+${bonus}`, '#ffe14a');
      playBlip(1320, 0.08, 'square', 0.04, 1980);
    }
  }

  // combo lapse
  if (g.combo > 0) {
    g.comboTimer -= dt;
    if (g.comboTimer <= 0) {
      g.combo = 0;
      g.multiplier = 1;
    }
  }
}

function die(g: GameState) {
  g.newBest = g.score > g.best;
  g.diedAt = g.t;
  g.hitstop = 0.12;
  g.shake = 12;
  g.glitch = 1;
  g.flash = 0.5;
  burst(g, RUNNER_X + 18, GROUND_Y - 20, '#ff3030', 26, 340, 700);
  burst(g, RUNNER_X + 18, GROUND_Y - 20, '#ffb01e', 12, 260, 700);
  playBlip(220, 0.4, 'sawtooth', 0.07, 40);
  if (g.newBest && qualifiesForTable(g.score)) {
    g.phase = 'enter-initials';
    g.initials = ['A', 'A', 'A'];
    g.initIdx = 0;
  } else {
    g.phase = 'dead';
  }
}

/** Decay of visual fx + kinematic drift; runs every frame regardless of phase. */
function stepEffects(g: GameState, dt: number) {
  for (const pt of g.particles) {
    pt.vy += pt.grav * dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  g.particles = g.particles.filter((pt) => pt.life > 0);
  for (const pp of g.popups) {
    pp.y += pp.vy * dt;
    pp.life -= dt;
  }
  g.popups = g.popups.filter((pp) => pp.life > 0);
  g.shake = Math.max(0, g.shake * (1 - dt * 8) - dt * 2);
  g.glitch = Math.max(0, g.glitch - dt * 1.7);
  g.flash = Math.max(0, g.flash - dt * 2);
  g.banner = Math.max(0, g.banner - dt);
}

/* ---------------------------------- draw ----------------------------------- */

function drawShard(ctx: CanvasRenderingContext2D, s: Shard, t: number) {
  const cx = s.x + SHARD / 2;
  const cy = s.y + SHARD / 2 + Math.sin(t * 3 + s.phase) * 3;
  const spin = 0.35 + 0.65 * Math.abs(Math.cos(t * 4 + s.phase)); // fake 3d spin
  const hw = (SHARD / 2) * spin;
  const hh = SHARD / 2;
  ctx.fillStyle = 'rgba(255,225,74,0.25)';
  ctx.fillRect(cx - hw - 2, cy - hh - 2, (hw + 2) * 2, (hh + 2) * 2);
  ctx.fillStyle = '#ffe14a';
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff6c0';
  ctx.fillRect(cx - 1, cy - hh + 1, 2, 3);
}

function draw(ctx: CanvasRenderingContext2D, g: GameState) {
  const t = g.t;
  const z = ZONES[g.zone % ZONES.length];
  ctx.fillStyle = z.bg;
  ctx.fillRect(0, 0, W, H);

  // stars
  for (const s of STARS) {
    const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
    ctx.fillStyle = `rgba(${z.star},${(0.5 * tw).toFixed(2)})`;
    ctx.fillRect((s.x - t * 8 + W * 10) % W, s.y * 0.7, 2, 2);
  }

  // parallax skyline
  let sx = -((t * g.speed * 0.12) % (W + 200));
  ctx.fillStyle = z.sky;
  for (let rep = 0; rep < 2; rep++) {
    let x = sx + rep * (W + 200);
    for (const b of SKYLINE) {
      ctx.fillRect(x, GROUND_Y - b.h - 20, b.w, b.h + 20);
      x += b.w + 12;
    }
  }
  ctx.fillStyle = 'rgba(122,134,255,0.35)';
  for (let i = 0; i < 24; i++) {
    const wx = (i * 137 + 40 - t * g.speed * 0.12) % (W + 100);
    ctx.fillRect(wx, GROUND_Y - 40 - ((i * 53) % 60), 3, 4);
  }

  // ground: neon line + scrolling ticks
  ctx.strokeStyle = z.ground;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 2);
  ctx.lineTo(W, GROUND_Y + 2);
  ctx.stroke();
  ctx.fillStyle = z.tick;
  for (let x = -((t * g.speed) % 48); x < W; x += 48) {
    ctx.fillRect(x, GROUND_Y + 10, 22, 3);
  }
  ctx.fillStyle = z.sky;
  for (let x = -((t * g.speed * 0.6) % 90); x < W; x += 90) {
    ctx.fillRect(x, GROUND_Y + 22, 34, 3);
  }

  // shards (behind hazards)
  for (const s of g.shards) drawShard(ctx, s, t);

  // obstacles
  for (const ob of g.obstacles) {
    if (ob.kind === 'firewall') {
      ctx.fillStyle = '#ff3030';
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      ctx.fillStyle = '#8a0f0f';
      ctx.fillRect(ob.x + ob.w - 5, ob.y, 5, ob.h);
      ctx.fillStyle = '#ffb01e';
      const bricks = Math.floor(ob.h / 16);
      for (let i = 0; i < bricks; i++) {
        ctx.fillRect(ob.x + 4, ob.y + 6 + i * 16, ob.w - 13, 6);
      }
      if (Math.floor(t * 12) % 2 === 0) {
        ctx.fillStyle = '#ffe14a';
        ctx.fillRect(ob.x + 2, ob.y - 4, ob.w - 8, 3);
      }
    } else {
      const oy = obstacleY(ob, t);
      drawSprite(ctx, DRONE, ob.x, oy, 4, DRONE_PALETTE);
      ctx.fillStyle = `rgba(255,90,210,${0.18 + 0.12 * Math.sin(t * 9)})`;
      ctx.fillRect(ob.x + 12, oy + ob.h, 16, GROUND_Y - oy - ob.h);
    }
  }

  // particles (behind runner reads fine and keeps trails under the sprite)
  for (const pt of g.particles) {
    ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  // runner
  const duck = g.ducking && g.playerY >= 0;
  const frame = g.phase !== 'playing' ? 1 : duck ? 5 : g.playerY < 0 ? 4 : Math.floor(t * 14) % 4;
  drawSprite(ctx, RUNNER_FRAMES[frame], RUNNER_X, GROUND_Y - 10 * RUNNER_PX + g.playerY, RUNNER_PX, RUNNER_PALETTE);

  // floating popups
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const pp of g.popups) {
    ctx.globalAlpha = clamp(pp.life / 0.9, 0, 1);
    ctx.font = `10px ${PIXEL}`;
    ctx.fillStyle = pp.color;
    ctx.fillText(pp.text, pp.x, pp.y);
  }
  ctx.globalAlpha = 1;

  // zone flash
  if (g.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(g.flash * 0.4).toFixed(2)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // HUD
  ctx.textBaseline = 'top';
  ctx.font = `12px ${PIXEL}`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8e8f8';
  ctx.fillText(String(Math.floor(g.score)).padStart(6, '0'), W - 20, 16);
  ctx.fillStyle = '#8a8aa8';
  ctx.fillText(`HI ${String(Math.floor(Math.max(g.best, g.score))).padStart(6, '0')}`, W - 20, 36);

  // combo multiplier
  if (g.multiplier > 1) {
    const pulse = 12 + Math.sin(t * 16) * 2;
    ctx.textAlign = 'left';
    ctx.font = `${pulse.toFixed(0)}px ${PIXEL}`;
    ctx.fillStyle = '#ff5ad2';
    ctx.fillText(`x${g.multiplier.toFixed(1)}`, 20, 16);
    ctx.font = `8px ${PIXEL}`;
    ctx.fillStyle = '#7aff7a';
    ctx.fillText(`${g.combo} CHAIN`, 20, 34);
    // combo timer bar
    ctx.fillStyle = 'rgba(255,90,210,0.6)';
    ctx.fillRect(20, 46, 60 * clamp(g.comboTimer / COMBO_WINDOW, 0, 1), 3);
  }

  // zone banner
  if (g.banner > 0) {
    const a = clamp(g.banner / 2.2, 0, 1);
    ctx.globalAlpha = Math.min(1, a * 1.6);
    ctx.textAlign = 'center';
    ctx.font = `18px ${PIXEL}`;
    ctx.fillStyle = z.ground;
    ctx.fillText(g.bannerText, W / 2, 60);
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = 'center';

  if (g.phase === 'ready') {
    ctx.fillStyle = 'rgba(4,6,42,0.55)';
    ctx.fillRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, 70, 0, 110);
    grad.addColorStop(0, '#ffe14a');
    grad.addColorStop(1, '#ff6a1a');
    ctx.font = `34px ${PIXEL}`;
    ctx.fillStyle = '#1a0b4a';
    ctx.fillText('NETRUNNER', W / 2 + 3, 73);
    ctx.fillStyle = grad;
    ctx.fillText('NETRUNNER', W / 2, 70);
    ctx.font = `11px ${PIXEL}`;
    ctx.fillStyle = '#62e8ff';
    ctx.fillText('JUMP FIREWALLS · SLIDE ICE · GRAB SHARDS', W / 2, 128);
    ctx.fillStyle = '#ff5ad2';
    ctx.fillText('SKIM HAZARDS TO BUILD A COMBO CHAIN', W / 2, 150);
    ctx.fillStyle = '#c8c8e8';
    ctx.fillText('SPACE / W JUMP     S / DOWN SLIDE', W / 2, 178);
    if (Math.floor(t * 1.6) % 2 === 0) {
      ctx.font = `14px ${PIXEL}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PRESS SPACE TO JACK IN', W / 2, 224);
    }
  } else if (g.phase === 'enter-initials') {
    ctx.fillStyle = 'rgba(4,6,42,0.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.font = `20px ${PIXEL}`;
    ctx.fillStyle = '#39ff14';
    ctx.fillText('NEW HIGH SCORE', W / 2, 70);
    ctx.font = `12px ${PIXEL}`;
    ctx.fillStyle = '#e8e8f8';
    ctx.fillText(`${Math.floor(g.score)}`, W / 2, 104);
    ctx.fillStyle = '#62e8ff';
    ctx.fillText('ENTER YOUR HANDLE', W / 2, 138);
    // three big letters with a caret under the active slot
    ctx.font = `40px ${PIXEL}`;
    const spacing = 56;
    const startX = W / 2 - spacing;
    for (let i = 0; i < 3; i++) {
      const active = i === g.initIdx;
      ctx.fillStyle = active ? '#ffe14a' : '#c8c8e8';
      ctx.fillText(g.initials[i], startX + i * spacing, 176);
      if (active && Math.floor(t * 3) % 2 === 0) {
        ctx.fillStyle = '#ffe14a';
        ctx.fillRect(startX + i * spacing - 16, 226, 32, 4);
      }
    }
    ctx.font = `9px ${PIXEL}`;
    ctx.fillStyle = '#8a8aa8';
    ctx.fillText('TYPE A-Z · ↑↓ CYCLE · ←→ MOVE · ENTER SAVE', W / 2, 264);
  } else if (g.phase === 'dead') {
    ctx.fillStyle = 'rgba(4,6,42,0.6)';
    ctx.fillRect(0, 0, W, H);
    drawSprite(ctx, SKULL, W / 2 - 8 * 5, 56, 5, SKULL_PALETTE);
    ctx.font = `24px ${PIXEL}`;
    ctx.fillStyle = '#ff3030';
    ctx.fillText('FLATLINED', W / 2, 150);
    ctx.font = `12px ${PIXEL}`;
    ctx.fillStyle = '#e8e8f8';
    ctx.fillText(`SCORE ${Math.floor(g.score)}`, W / 2, 196);
    if (g.newBest) {
      ctx.fillStyle = '#39ff14';
      ctx.fillText('NEW HIGH SCORE!', W / 2, 222);
    }
    if (g.t - g.diedAt > 0.7 && Math.floor(t * 1.6) % 2 === 0) {
      ctx.font = `12px ${PIXEL}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('SPACE - RETRY    Q - WALK AWAY', W / 2, 262);
    }
  }

  ctx.textAlign = 'left';
}

/* ------------------------------- component --------------------------------- */

export function NetrunnerGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const vctx = canvas.getContext('2d')!;

    // Everything renders to an offscreen scene; present() blits it with shake +
    // a chromatic-aberration split, so the glitch pass is a cheap post effect.
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      return c;
    };
    const scene = mk();
    const sctx = scene.getContext('2d')!;
    const redC = mk();
    const redCtx = redC.getContext('2d')!;
    const cyanC = mk();
    const cyanCtx = cyanC.getContext('2d')!;
    const overlay = makeCrtOverlay(W, H);

    const music = createGameMusic();
    const g = freshState();
    let raf = 0;
    let last = performance.now();

    const present = () => {
      vctx.setTransform(1, 0, 0, 1, 0, 0);
      vctx.fillStyle = '#000';
      vctx.fillRect(0, 0, W, H);
      vctx.save();
      if (g.shake > 0.2) {
        vctx.translate((Math.random() * 2 - 1) * g.shake, (Math.random() * 2 - 1) * g.shake);
      }
      if (g.glitch > 0.03) {
        const off = 0.6 + g.glitch * 5;
        // isolate the red channel (multiply by pure red), then the cyan channel
        redCtx.globalCompositeOperation = 'source-over';
        redCtx.clearRect(0, 0, W, H);
        redCtx.drawImage(scene, 0, 0);
        redCtx.globalCompositeOperation = 'multiply';
        redCtx.fillStyle = '#ff0000';
        redCtx.fillRect(0, 0, W, H);
        cyanCtx.globalCompositeOperation = 'source-over';
        cyanCtx.clearRect(0, 0, W, H);
        cyanCtx.drawImage(scene, 0, 0);
        cyanCtx.globalCompositeOperation = 'multiply';
        cyanCtx.fillStyle = '#00ffff';
        cyanCtx.fillRect(0, 0, W, H);
        // additively recombine with opposing horizontal offsets
        vctx.globalCompositeOperation = 'lighter';
        vctx.drawImage(redC, -off, 0);
        vctx.drawImage(cyanC, off, 0);
        vctx.globalCompositeOperation = 'source-over';
      } else {
        vctx.drawImage(scene, 0, 0);
      }
      vctx.restore();
      vctx.drawImage(overlay, 0, 0);
      // torn-scanline glitch slices
      if (g.glitch > 0.03) {
        const n = 2 + Math.floor(g.glitch * 4);
        for (let i = 0; i < n; i++) {
          if (Math.random() > 0.55) continue;
          const y = Math.random() * H;
          const h = 3 + Math.random() * 16;
          const dx = (Math.random() * 2 - 1) * g.glitch * 22;
          vctx.drawImage(scene, 0, y, W, h, dx, y, W, h);
        }
      }
    };

    // start / retry the run
    const jack = () => {
      resumeAudio();
      if (g.phase === 'ready') {
        g.phase = 'playing';
        playBlip(660, 0.1, 'square', 0.05, 990);
        return;
      }
      if (g.phase === 'dead') {
        if (g.t - g.diedAt > 0.5) {
          Object.assign(g, freshState(), { phase: 'playing', best: getBestScore() });
          playBlip(660, 0.1, 'square', 0.05, 990);
        }
        return;
      }
      if (g.phase === 'playing') {
        g.jumpBuffer = BUFFER;
        g.jumpHeld = true;
      }
    };

    const submitInitials = () => {
      submitScore(g.initials.join(''), g.score);
      g.best = getBestScore();
      g.phase = 'dead';
      playBlip(880, 0.12, 'square', 0.05, 1320);
    };

    const cycleLetter = (dir: number) => {
      const code = g.initials[g.initIdx].charCodeAt(0) - 65;
      const next = (code + dir + 26) % 26;
      g.initials[g.initIdx] = String.fromCharCode(65 + next);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ') {
        onClose();
        return;
      }
      if (g.phase === 'enter-initials') {
        if (/^Key[A-Z]$/.test(e.code)) {
          g.initials[g.initIdx] = e.code.slice(3);
          g.initIdx = Math.min(2, g.initIdx + 1);
        } else if (e.code === 'ArrowUp') {
          cycleLetter(1);
        } else if (e.code === 'ArrowDown') {
          cycleLetter(-1);
        } else if (e.code === 'ArrowLeft') {
          g.initIdx = Math.max(0, g.initIdx - 1);
        } else if (e.code === 'ArrowRight') {
          g.initIdx = Math.min(2, g.initIdx + 1);
        } else if (e.code === 'Backspace') {
          g.initIdx = Math.max(0, g.initIdx - 1);
        } else if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          submitInitials();
        }
        return;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (!e.repeat) jack();
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        g.ducking = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') g.ducking = false;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        g.jumpHeld = false;
        if (g.velY < 0) g.velY *= JUMP_CUT; // release early → shorter hop
      }
    };

    // touch: tap upper area = jump, hold lower third = slide
    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const ry = (e.clientY - rect.top) / rect.height;
      const rx = (e.clientX - rect.left) / rect.width;
      if (g.phase === 'enter-initials') {
        if (ry > 0.72) submitInitials();
        else if (rx < 0.4) cycleLetter(-1);
        else if (rx > 0.6) cycleLetter(1);
        else g.initIdx = (g.initIdx + 1) % 3;
        return;
      }
      if (g.phase === 'playing' && ry > 0.65) {
        g.ducking = true;
      } else {
        jack();
      }
    };
    const onPointerUp = () => {
      g.ducking = false;
      g.jumpHeld = false;
      if (g.velY < 0) g.velY *= JUMP_CUT;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const prev = g.phase;

      g.t += dt;
      if (g.hitstop > 0) {
        g.hitstop -= dt;
      } else if (g.phase === 'playing') {
        update(g, dt);
      }
      stepEffects(g, dt);

      if (g.phase === 'playing') {
        music.setIntensity((g.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED));
      }
      // music reacts to phase transitions
      if (prev === 'playing' && (g.phase === 'dead' || g.phase === 'enter-initials')) {
        music.death();
      } else if (prev !== 'playing' && g.phase === 'playing') {
        music.start();
      }

      draw(sctx, g);
      present();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      music.stop();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [onClose]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        // above the tour chrome (EXIT TOUR / mode buttons, zIndex 30):
        // the cabinet screen is a fullscreen takeover, not a dialog
        zIndex: 40,
        background: 'radial-gradient(circle at 50% 40%, #14102a 0%, #060410 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'all',
        fontFamily: PIXEL,
      }}
    >
      {/* marquee */}
      <div
        style={{
          padding: '0.7rem 3rem',
          marginBottom: '0.9rem',
          background: 'linear-gradient(180deg, #1a1040, #0c0824)',
          border: '3px solid #2a2456',
          borderRadius: 6,
          color: '#ffb01e',
          fontSize: '1rem',
          letterSpacing: '0.25em',
          textShadow: '0 0 12px rgba(255,176,30,0.8), 0 0 30px rgba(230,57,80,0.5)',
        }}
      >
        NETRUNNER
      </div>

      {/* CRT bezel + game canvas */}
      <div
        style={{
          padding: 18,
          background: '#17131f',
          border: '3px solid #2a2430',
          borderRadius: 14,
          boxShadow: '0 0 60px rgba(58,68,204,0.35), inset 0 0 24px #000',
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{
            display: 'block',
            width: 'min(84vw, calc((100vh - 220px) * 16 / 9))',
            aspectRatio: '16 / 9',
            imageRendering: 'pixelated',
            borderRadius: 6,
            background: '#04062a',
            touchAction: 'none',
          }}
        />
      </div>

      <div
        style={{
          marginTop: '1rem',
          color: '#776c72',
          fontSize: '0.45rem',
          letterSpacing: '0.12em',
        }}
      >
        SPACE JUMP · S SLIDE · Q LEAVE CABINET
      </div>
    </div>
  );
}
