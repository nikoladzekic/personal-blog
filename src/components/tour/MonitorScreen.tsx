import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Retro boot sequence rendered to a canvas texture: BIOS POST → DOS prompt →
 * 8-bit game title/loading screen → high scores, looping. Deterministic in
 * loop time so it cycles seamlessly. Redraws are throttled to ~20fps.
 */

const W = 1024;
const H = 432;
const LOOP = 38;
const FPS = 20;

const PIXEL = "'Press Start 2P', monospace";
const MONO = "'Share Tech Mono', monospace";

/* ---------------------------------- timeline ----------------------------------
 * 0.0–1.0    black, blinking cursor
 * 1.0–7.5    BIOS POST (memory count 2.2→4.4)
 * 7.5–8.6    blank → "Starting MS-DOS..."
 * 8.6–13.0   DOS prompt typing, loader messages
 * 13.0–13.5  video mode switch flicker
 * 13.5–27.5  title screen + loading bar
 * 27.5–36.0  title + high scores + PRESS ENTER
 * 36.0–38.0  power-fade to black
 * ------------------------------------------------------------------------------ */

interface BiosLine {
  at: number;
  text: string | ((t: number) => string);
  x?: number;
  color?: string;
}

const MEM_START = 2.2;
const MEM_END = 4.4;
const MEM_KB = 16384;

const BIOS_LINES: BiosLine[] = [
  { at: 1.0, text: 'DZEKIC Modular BIOS v4.51PG, An Energy Star Ally' },
  { at: 1.12, text: 'Copyright (C) 1984-92, Dzekic Software, Inc.' },
  { at: 1.7, text: '' },
  { at: 1.7, text: '486DX2 CPU at 66MHz' },
  {
    at: MEM_START,
    text: (t) => {
      const p = Math.min(1, Math.max(0, (t - MEM_START) / (MEM_END - MEM_START)));
      const kb = Math.floor((MEM_KB * p) / 64) * 64;
      return `Memory Test :  ${kb} KB${p >= 1 ? ' OK' : ''}`;
    },
  },
  { at: 4.9, text: '' },
  { at: 4.9, text: 'Plug and Play BIOS Extension v1.0A' },
  { at: 5.2, text: 'Detecting HDD Primary Master ... WDC AC2540H' },
  { at: 5.8, text: 'Detecting HDD Primary Slave  ... None' },
  { at: 6.2, text: 'Detecting Floppy Drive A     ... 1.44M, 3.5in.' },
  { at: 6.6, text: '' },
  { at: 6.6, text: 'Keyboard ..... OK' },
  { at: 6.9, text: 'Mouse ........ PS/2' },
];

interface DosLine {
  at: number;
  prompt?: string;
  typed?: string;
  text?: string;
  cps?: number;
}

const DOS_LINES: DosLine[] = [
  { at: 7.9, text: 'Starting MS-DOS...' },
  { at: 8.8, prompt: 'C:\\>', typed: 'cd netrun', cps: 11 },
  { at: 10.0, prompt: 'C:\\NETRUN>', typed: 'netrun', cps: 10 },
  { at: 11.1, text: 'NETRUNNER loader v1.2' },
  { at: 11.4, text: 'VGA 320x200 256-color mode ....... OK' },
  { at: 11.8, text: 'Sound Blaster 16 at A220 I5 D1 ... OK' },
  { at: 12.2, text: 'EMS memory: 4096 KB available' },
  { at: 12.6, text: 'Loading NETRUN.DAT ...' },
];

/* Loading-bar progress waypoints (time, fraction) — stalls included on purpose */
const LOAD_STEPS: [number, number][] = [
  [14.5, 0],
  [16.5, 0.18],
  [17.4, 0.18],
  [19.5, 0.42],
  [20.6, 0.46],
  [23.0, 0.71],
  [24.0, 0.71],
  [26.5, 1.0],
];

function loadProgress(t: number): number {
  if (t <= LOAD_STEPS[0][0]) return 0;
  for (let i = 1; i < LOAD_STEPS.length; i++) {
    const [t1, p1] = LOAD_STEPS[i];
    const [t0, p0] = LOAD_STEPS[i - 1];
    if (t < t1) return p0 + ((t - t0) / (t1 - t0)) * (p1 - p0);
  }
  return 1;
}

/* 16x14 skull sprite (0 transparent, 1 bone, 2 shadow, 3 eye glow) */
// prettier-ignore
const SKULL: number[][] = [
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

const HIGH_SCORES: [string, string, string][] = [
  ['1', 'NDZ', '999999'],
  ['2', 'ACE', '421337'],
  ['3', 'R4T', '080486'],
  ['4', 'GH0', '064000'],
  ['5', 'SYS', '032768'],
];

/* Deterministic starfield */
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r1 = Math.sin(i * 127.1) * 43758.5453;
  const r2 = Math.sin(i * 311.7) * 12543.853;
  const r3 = Math.sin(i * 74.7) * 9631.41;
  return {
    x: (r1 - Math.floor(r1)) * W,
    y: (r2 - Math.floor(r2)) * H,
    phase: (r3 - Math.floor(r3)) * Math.PI * 2,
    speed: 1.5 + (r3 - Math.floor(r3)) * 3,
  };
});

function drawSprite(
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

function drawBios(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);
  ctx.font = `22px ${MONO}`;
  ctx.textBaseline = 'top';

  let y = 18;
  for (const line of BIOS_LINES) {
    if (t < line.at) break;
    const text = typeof line.text === 'function' ? line.text(t) : line.text;
    ctx.fillStyle = line.color ?? '#c8c8c8';
    ctx.fillText(text, line.x ?? 52, y);
    y += 27;
  }

  // blinking cursor under last line
  if (Math.floor(t * 2.4) % 2 === 0 && t < 7.0) {
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(52, y + 4, 11, 18);
  }

  // "energy star"-style badge, top right
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(W - 150, 16, 120, 56);
  ctx.strokeStyle = '#3a6a3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(W - 150, 16, 120, 56);
  ctx.font = `13px ${MONO}`;
  ctx.fillStyle = '#5aaa5a';
  ctx.fillText('DZEKIC', W - 138, 26);
  ctx.fillText('SYSTEMS', W - 138, 42);
  ctx.fillStyle = '#3a7a3a';
  ctx.fillText('est.1984', W - 138, 56);

  // footer
  ctx.font = `20px ${MONO}`;
  ctx.fillStyle = '#888888';
  ctx.fillText('Press DEL to enter SETUP', 52, H - 56);
  ctx.fillText('06/12/92-UMC-491-2A4X5D21C-00', 52, H - 30);
}

function drawDos(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);
  ctx.font = `22px ${MONO}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#c8c8c8';

  let y = 18;
  let lastLineEnd = 0;
  for (const line of DOS_LINES) {
    if (t < line.at) break;
    if (line.typed) {
      const cps = line.cps ?? 10;
      const shown = line.typed.slice(0, Math.floor((t - line.at) * cps));
      ctx.fillText(`${line.prompt}${shown}`, 52, y);
      lastLineEnd = line.at + line.typed.length / cps;
    } else {
      ctx.fillText(line.text ?? '', 52, y);
      lastLineEnd = line.at;
    }
    y += 27;
  }

  // cursor at end of current line
  if (Math.floor(t * 2.4) % 2 === 0) {
    ctx.fillRect(52, y + 4, 11, 18);
  }
  void lastLineEnd;
}

function drawTitle(ctx: CanvasRenderingContext2D, t: number) {
  // VGA dark blue backdrop
  ctx.fillStyle = '#04062a';
  ctx.fillRect(0, 0, W, H);

  // starfield
  for (const s of STARS) {
    const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
    ctx.fillStyle = `rgba(180,200,255,${(0.55 * tw).toFixed(2)})`;
    const x = (s.x + t * 4) % W;
    ctx.fillRect(x, s.y, 2, 2);
  }

  // chunky double border
  ctx.strokeStyle = '#3a44cc';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  ctx.strokeStyle = '#7a86ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(17, 17, W - 34, H - 34);
  // corner blocks
  ctx.fillStyle = '#7a86ff';
  for (const [cx, cy] of [
    [8, 8],
    [W - 28, 8],
    [8, H - 28],
    [W - 28, H - 28],
  ]) {
    ctx.fillRect(cx, cy, 20, 20);
    ctx.fillStyle = '#3a44cc';
    ctx.fillRect(cx + 5, cy + 5, 10, 10);
    ctx.fillStyle = '#7a86ff';
  }

  // skulls flanking the title
  const bob = Math.sin(t * 1.8) * 4;
  const skullPal = { 1: '#cdd2e8', 2: '#5a608a', 3: '#39ff14' };
  drawSprite(ctx, SKULL, 96, 64 + bob, 7, skullPal);
  drawSprite(ctx, SKULL, W - 96 - 16 * 7, 64 - bob, 7, skullPal);

  // title with classic 3-layer arcade lettering, laid out by glyph ink bounds
  // so padded glyphs (like T) don't leave uneven gaps
  const TITLE = 'NETRUNNER';
  const GAP = 6;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `64px ${PIXEL}`;
  const metrics = [...TITLE].map((ch) => ctx.measureText(ch));
  const inkW = metrics.map((m) => m.actualBoundingBoxRight + m.actualBoundingBoxLeft);
  const total = inkW.reduce((a, b) => a + b, 0) + GAP * (TITLE.length - 1);
  const drawTitle = (ox: number, oy: number, fill: string | CanvasGradient) => {
    ctx.fillStyle = fill;
    let x = W / 2 - total / 2;
    for (let i = 0; i < TITLE.length; i++) {
      ctx.fillText(TITLE[i], x + metrics[i].actualBoundingBoxLeft + ox, 76 + oy);
      x += inkW[i] + GAP;
    }
  };
  const grad = ctx.createLinearGradient(0, 76, 0, 76 + 64);
  grad.addColorStop(0, '#ffe14a');
  grad.addColorStop(0.55, '#ffb01e');
  grad.addColorStop(1, '#ff6a1a');
  drawTitle(6, 6, '#1a0b4a');
  drawTitle(0, 0, grad);
  ctx.textAlign = 'center';

  ctx.font = `18px ${PIXEL}`;
  ctx.fillStyle = '#62e8ff';
  ctx.fillText('SHADOW OF THE KERNEL', W / 2, 168);

  ctx.font = `13px ${PIXEL}`;
  ctx.fillStyle = '#8a8aa8';
  ctx.fillText('(C) 1992 DZEKIC SOFT', W / 2, H - 40);
  ctx.textAlign = 'left';
}

function drawLoadingBar(ctx: CanvasRenderingContext2D, t: number) {
  const p = loadProgress(t);
  const barW = 420;
  const barH = 26;
  const bx = (W - barW) / 2;
  const by = 268;

  ctx.textAlign = 'center';
  ctx.font = `16px ${PIXEL}`;
  ctx.fillStyle = '#e8e8f8';
  ctx.fillText('LOADING', W / 2, by - 34);

  ctx.strokeStyle = '#e8e8f8';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, barW, barH);

  // segmented fill
  const segW = 14;
  const gap = 4;
  const inner = barW - 8;
  const segs = Math.floor(inner / (segW + gap));
  const lit = Math.floor(segs * p);
  for (let i = 0; i < lit; i++) {
    ctx.fillStyle = i === lit - 1 && p < 1 ? '#ff5ad2' : '#b03ae8';
    ctx.fillRect(bx + 4 + i * (segW + gap) + 2, by + 5, segW, barH - 10);
  }

  // disk activity line
  const stalled = p > 0 && p < 1 && Math.abs(loadProgress(t + 0.12) - p) < 0.0001;
  ctx.font = `11px ${PIXEL}`;
  if (p < 1) {
    if (Math.floor(t * 3) % 2 === 0) {
      ctx.fillStyle = stalled ? '#ffb01e' : '#62e8ff';
      ctx.fillText(stalled ? 'SEEK DISK A: ...' : 'READING DISK A: ...', W / 2, by + barH + 18);
    }
    // drive LED
    ctx.fillStyle = !stalled && Math.floor(t * 9) % 2 === 0 ? '#ff3030' : '#401010';
    ctx.fillRect(bx + barW + 18, by + 8, 10, 10);
  }
  ctx.textAlign = 'left';
}

function drawHighScores(ctx: CanvasRenderingContext2D, t: number) {
  ctx.textAlign = 'center';
  ctx.font = `14px ${PIXEL}`;
  ctx.fillStyle = '#ff5ad2';
  ctx.fillText('TOP NETRUNNERS', W / 2, 212);

  const rowColors = ['#ffe14a', '#ffb01e', '#62e8ff', '#7aff7a', '#c8c8e8'];
  ctx.font = `12px ${PIXEL}`;
  HIGH_SCORES.forEach(([rank, name, score], i) => {
    ctx.fillStyle = rowColors[i];
    ctx.fillText(`${rank}  ${name} ...... ${score}`, W / 2, 240 + i * 23);
  });

  if (Math.floor(t * 1.4) % 2 === 0) {
    ctx.font = `15px ${PIXEL}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PRESS ENTER', W / 2, H - 64);
  }
  ctx.textAlign = 'left';
}

function drawFrame(ctx: CanvasRenderingContext2D, t: number) {
  if (t < 1.0) {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);
    if (Math.floor(t * 2.4) % 2 === 0) {
      ctx.fillStyle = '#c8c8c8';
      ctx.fillRect(52, 18, 11, 18);
    }
  } else if (t < 7.5) {
    drawBios(ctx, t);
  } else if (t < 13.0) {
    drawDos(ctx, t);
  } else if (t < 13.5) {
    // video mode switch: black with one bright flash frame
    ctx.fillStyle = t > 13.05 && t < 13.12 ? '#aab4ff' : '#000000';
    ctx.fillRect(0, 0, W, H);
  } else if (t < 27.5) {
    drawTitle(ctx, t);
    drawLoadingBar(ctx, t);
  } else if (t < 36.0) {
    drawTitle(ctx, t);
    drawHighScores(ctx, t);
  } else {
    // power down: collapse to a fading horizontal line
    const k = Math.min(1, (t - 36.0) / 0.5);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    if (k < 1) {
      ctx.fillStyle = `rgba(220,230,255,${(1 - k).toFixed(2)})`;
      const lh = Math.max(2, (1 - k) * 10);
      ctx.fillRect(W * 0.5 * k * 0.8, H / 2 - lh / 2, W * (1 - k * 0.8), lh);
    }
  }
}

/* Static CRT overlay: scanlines, aperture columns, vignette, dark curved corners */
function makeCrtOverlay(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  for (let x = 0; x < W; x += 3) ctx.fillRect(x, 0, 1, H);

  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // curved CRT corners
  const r = 30;
  ctx.fillStyle = 'rgba(0,0,0,0.92)';
  for (const [cx, cy] of [
    [0, 0],
    [W, 0],
    [0, H],
    [W, H],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.rect(cx - r, cy - r, r * 2, r * 2);
    ctx.fill('evenodd');
  }
  return c;
}

/**
 * Replaces the material of the GLTF monitor's curved screen mesh with the
 * animated boot-sequence canvas texture. The mesh's UVs span 0–1, so the
 * canvas maps onto the curved surface directly.
 */
export function MonitorScreen({ mesh }: { mesh: THREE.Mesh }) {
  const { ctx, texture, material, overlay, bootOffset } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    // no mipmaps: avoids regenerating them on every canvas update (20×/s)
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    // Dev helper: ?boot=12 fast-forwards the boot loop by 12 seconds
    const bootOffset = Number(new URLSearchParams(window.location.search).get('boot')) || 0;
    return { ctx, texture, material, overlay: makeCrtOverlay(), bootOffset };
  }, []);

  useEffect(() => {
    const previous = mesh.material;
    mesh.material = material;
    mesh.visible = true;
    return () => {
      mesh.material = previous;
      material.dispose();
      texture.dispose();
    };
  }, [mesh, material, texture]);

  const lastDraw = useRef(0);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    if (now - lastDraw.current < 1 / FPS) return;
    lastDraw.current = now;
    const t = (now + bootOffset) % LOOP;

    drawFrame(ctx, t);

    // moving refresh band
    const bandY = ((now * 130) % (H + 240)) - 120;
    const band = ctx.createLinearGradient(0, bandY, 0, bandY + 110);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, 'rgba(255,255,255,0.045)');
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, Math.max(0, bandY), W, 110);

    // rare horizontal sync tear
    const tearPhase = now % 11;
    if (tearPhase < 0.14) {
      const ty = Math.floor((Math.sin(now * 3.7) * 0.5 + 0.5) * (H - 40));
      ctx.drawImage(ctx.canvas, 0, ty, W, 22, 7, ty, W, 22);
    }

    ctx.drawImage(overlay, 0, 0);
    texture.needsUpdate = true;
  });

  return null;
}
