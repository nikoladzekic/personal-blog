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
} from './netrunnerShared';
import { playBlip } from './sounds';

/**
 * Fullscreen NETRUNNER mini game — an endless runner in the google-dino mold:
 * jump firewalls, slide under ICE drones, speed ramps with distance. Rendered
 * to a fixed low-res canvas upscaled with pixelated image-rendering, framed by
 * an arcade bezel. High score persists via netrunnerShared (the cabinet's
 * attract mode picks it up).
 */

const W = 640;
const H = 360;

const GROUND_Y = 300;
const PX = 5; // sprite pixel size
const RUNNER_X = 90;
const GRAVITY = 2600;
const JUMP_V = -880;
const BASE_SPEED = 260;
const MAX_SPEED = 620;

interface Obstacle {
  kind: 'firewall' | 'drone';
  x: number;
  w: number;
  h: number;
  /** top edge in canvas px (drones hover, firewalls sit on the ground) */
  y: number;
  bobPhase: number;
}

type Phase = 'ready' | 'playing' | 'dead';

interface GameState {
  phase: Phase;
  t: number;
  speed: number;
  score: number;
  best: number;
  newBest: boolean;
  playerY: number; // offset above ground, <= 0 while airborne
  velY: number;
  ducking: boolean;
  obstacles: Obstacle[];
  nextSpawn: number;
  diedAt: number;
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
    obstacles: [],
    nextSpawn: 1.2,
    diedAt: 0,
  };
}

const STARS = makeStars(60, W, H);

/* distant skyline silhouette, deterministic */
const SKYLINE = Array.from({ length: 22 }, (_, i) => {
  const r = Math.sin(i * 91.7) * 23421.63;
  const f = r - Math.floor(r);
  return { w: 22 + f * 30, h: 30 + ((f * 977) % 70) };
});

function spawnObstacle(g: GameState): Obstacle {
  const droneChance = Math.min(0.45, (g.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED) + 0.12);
  if (Math.random() < droneChance) {
    // hovers at head height: slide under it (or thread a jump before it lands in view)
    const h = 6 * 4;
    return { kind: 'drone', x: W + 40, w: 10 * 4, h, y: GROUND_Y - 62, bobPhase: Math.random() * 6 };
  }
  const tall = Math.random() < 0.35;
  const h = tall ? 66 : 42;
  return { kind: 'firewall', x: W + 40, w: 26, h, y: GROUND_Y - h, bobPhase: 0 };
}

function playerBox(g: GameState) {
  // sprite is 12x8 cells at PX; hitbox trimmed for forgiveness
  const duck = g.ducking && g.playerY >= 0;
  const w = duck ? 11 * PX - 14 : 7 * PX - 10;
  const h = duck ? 5 * PX - 6 : 8 * PX - 8;
  const x = RUNNER_X + 8;
  const y = GROUND_Y - h + g.playerY;
  return { x, y, w, h };
}

function update(g: GameState, dt: number) {
  g.t += dt;
  g.speed = Math.min(MAX_SPEED, BASE_SPEED + g.score * 0.9);
  g.score += g.speed * dt * 0.04;

  // physics
  if (g.playerY < 0 || g.velY < 0) {
    // fast-fall when duck is held mid-air
    g.velY += GRAVITY * (g.ducking ? 2.2 : 1) * dt;
    g.playerY += g.velY * dt;
    if (g.playerY >= 0) {
      g.playerY = 0;
      g.velY = 0;
    }
  }

  // spawn
  g.nextSpawn -= dt;
  if (g.nextSpawn <= 0) {
    g.obstacles.push(spawnObstacle(g));
    // gap shrinks as speed grows, with jitter; expressed in seconds of travel
    const gapPx = 300 + Math.random() * 320;
    g.nextSpawn = Math.max(0.55, gapPx / g.speed);
  }

  // move + cull
  for (const ob of g.obstacles) ob.x -= g.speed * dt;
  g.obstacles = g.obstacles.filter((ob) => ob.x + ob.w > -20);

  // collision
  const p = playerBox(g);
  for (const ob of g.obstacles) {
    const oy = ob.kind === 'drone' ? ob.y + Math.sin(g.t * 5 + ob.bobPhase) * 5 : ob.y;
    if (p.x < ob.x + ob.w - 6 && p.x + p.w > ob.x + 6 && p.y < oy + ob.h - 5 && p.y + p.h > oy + 5) {
      g.phase = 'dead';
      g.diedAt = g.t;
      g.newBest = submitScore(g.score);
      g.best = getBestScore();
      playBlip(220, 0.4, 'sawtooth', 0.07, 40);
      return;
    }
  }
}

function draw(ctx: CanvasRenderingContext2D, g: GameState, overlay: HTMLCanvasElement) {
  const t = g.t;
  ctx.fillStyle = '#04062a';
  ctx.fillRect(0, 0, W, H);

  // stars
  for (const s of STARS) {
    const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
    ctx.fillStyle = `rgba(180,200,255,${(0.5 * tw).toFixed(2)})`;
    ctx.fillRect((s.x - t * 8 + W * 10) % W, s.y * 0.7, 2, 2);
  }

  // parallax skyline
  let sx = -((t * g.speed * 0.12) % (W + 200));
  ctx.fillStyle = '#0a103f';
  for (let rep = 0; rep < 2; rep++) {
    let x = sx + rep * (W + 200);
    for (const b of SKYLINE) {
      ctx.fillRect(x, GROUND_Y - b.h - 20, b.w, b.h + 20);
      x += b.w + 12;
    }
  }
  // a few lit windows
  ctx.fillStyle = 'rgba(122,134,255,0.35)';
  for (let i = 0; i < 24; i++) {
    const wx = (i * 137 + 40 - t * g.speed * 0.12) % (W + 100);
    ctx.fillRect(wx, GROUND_Y - 40 - ((i * 53) % 60), 3, 4);
  }

  // ground: neon line + scrolling ticks
  ctx.strokeStyle = '#3a44cc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 2);
  ctx.lineTo(W, GROUND_Y + 2);
  ctx.stroke();
  ctx.fillStyle = '#2a3488';
  for (let x = -((t * g.speed) % 48); x < W; x += 48) {
    ctx.fillRect(x, GROUND_Y + 10, 22, 3);
  }
  ctx.fillStyle = '#161d5e';
  for (let x = -((t * g.speed * 0.6) % 90); x < W; x += 90) {
    ctx.fillRect(x, GROUND_Y + 22, 34, 3);
  }

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
      // flicker crown
      if (Math.floor(t * 12) % 2 === 0) {
        ctx.fillStyle = '#ffe14a';
        ctx.fillRect(ob.x + 2, ob.y - 4, ob.w - 8, 3);
      }
    } else {
      const oy = ob.y + Math.sin(t * 5 + ob.bobPhase) * 5;
      drawSprite(ctx, DRONE, ob.x, oy, 4, DRONE_PALETTE);
      // scan beam under the drone
      ctx.fillStyle = `rgba(255,90,210,${0.18 + 0.12 * Math.sin(t * 9)})`;
      ctx.fillRect(ob.x + 12, oy + ob.h, 16, GROUND_Y - oy - ob.h);
    }
  }

  // runner
  const duck = g.ducking && g.playerY >= 0;
  const frame = g.phase !== 'playing' ? 0 : duck ? 2 : g.playerY < 0 ? 0 : Math.floor(t * 12) % 2;
  drawSprite(ctx, RUNNER_FRAMES[frame], RUNNER_X, GROUND_Y - 8 * PX + g.playerY, PX, RUNNER_PALETTE);

  // HUD
  ctx.textBaseline = 'top';
  ctx.font = `12px ${PIXEL}`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8e8f8';
  ctx.fillText(String(Math.floor(g.score)).padStart(6, '0'), W - 20, 16);
  ctx.fillStyle = '#8a8aa8';
  ctx.fillText(`HI ${String(Math.floor(Math.max(g.best, g.score))).padStart(6, '0')}`, W - 20, 36);
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
    ctx.fillText('JUMP THE FIREWALLS - SLIDE UNDER ICE', W / 2, 130);
    ctx.fillStyle = '#c8c8e8';
    ctx.fillText('SPACE / W - JUMP      S / DOWN - SLIDE', W / 2, 168);
    if (Math.floor(t * 1.6) % 2 === 0) {
      ctx.font = `14px ${PIXEL}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PRESS SPACE TO JACK IN', W / 2, 220);
    }
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
  ctx.drawImage(overlay, 0, 0);
}

export function NetrunnerGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const overlay = makeCrtOverlay(W, H);
    const g = freshState();
    let raf = 0;
    let last = performance.now();

    const jump = () => {
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
      if (g.playerY >= 0) {
        g.velY = JUMP_V;
        g.playerY = -0.01;
        playBlip(520, 0.12, 'square', 0.045, 780);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Q quits the cabinet — ESC is reserved for pointer-lock/menu outside
      if (e.code === 'KeyQ') {
        onClose();
        return;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (!e.repeat) jump();
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        g.ducking = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') g.ducking = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let lastMilestone = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (g.phase === 'playing') {
        update(g, dt);
        const milestone = Math.floor(g.score / 100);
        if (milestone > lastMilestone) {
          lastMilestone = milestone;
          playBlip(880, 0.07, 'square', 0.04, 1320);
        }
      } else {
        g.t += dt;
      }
      draw(ctx, g, overlay);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
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
