import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MONO, PIXEL, makeCrtOverlay } from './netrunnerShared';

/**
 * Retro boot sequence rendered to a canvas texture: BIOS POST → OS loader →
 * a minimal desktop with the diary/ and research/ folders that the VM
 * simulator overlay opens (walk up and press E). Boot plays once, then the
 * desktop persists; redraws are throttled to ~20fps during boot and drop to
 * 4fps once the desktop settles.
 */

const W = 1024;
const H = 432;
const FPS = 20;
const DESKTOP_AT = 12.4;

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
  { at: 7.9, text: 'DzekicOS boot loader v2.1' },
  { at: 8.4, text: 'mounting /dev/hda1 on / ............. ok' },
  { at: 8.8, text: 'mounting /dev/hda2 on /home ......... ok' },
  { at: 9.2, prompt: 'login: ', typed: 'ndz', cps: 6 },
  { at: 10.2, text: 'password: ********' },
  { at: 11.0, prompt: '$ ', typed: 'startx', cps: 9 },
];

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

function drawLogin(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);
  ctx.font = `22px ${MONO}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#c8c8c8';

  let y = 18;
  for (const line of DOS_LINES) {
    if (t < line.at) break;
    if (line.typed) {
      const cps = line.cps ?? 10;
      const shown = line.typed.slice(0, Math.floor((t - line.at) * cps));
      ctx.fillText(`${line.prompt}${shown}`, 52, y);
    } else {
      ctx.fillText(line.text ?? '', 52, y);
    }
    y += 27;
  }

  if (Math.floor(t * 2.4) % 2 === 0) {
    ctx.fillRect(52, y + 4, 11, 18);
  }
}

/* --------------------------------- desktop --------------------------------- */

function drawFolder(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
  // folder body with retro shading
  ctx.fillStyle = '#caa23c';
  ctx.fillRect(x, y + 10, 88, 60);
  ctx.fillStyle = '#e8c451';
  ctx.fillRect(x, y, 40, 14);
  ctx.fillRect(x, y + 6, 88, 10);
  ctx.fillStyle = '#f8dd7c';
  ctx.fillRect(x, y + 10, 88, 5);
  ctx.fillStyle = '#8a6a1e';
  ctx.fillRect(x, y + 66, 88, 4);
  ctx.fillRect(x + 84, y + 10, 4, 60);

  ctx.font = `17px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0e1210';
  ctx.fillText(label, x + 45, y + 84);
  ctx.fillStyle = '#d8e8dc';
  ctx.fillText(label, x + 44, y + 83);
  ctx.textAlign = 'left';
}

function drawDesktop(ctx: CanvasRenderingContext2D, t: number) {
  // wallpaper: deep teal gradient + subtle grid
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0c2a26');
  bg.addColorStop(1, '#071512');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(80,180,150,0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // centered logo watermark
  ctx.font = `26px ${PIXEL}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(90,190,160,0.16)';
  ctx.fillText('DzekicOS', W / 2, 160);
  ctx.font = `13px ${MONO}`;
  ctx.fillStyle = 'rgba(90,190,160,0.28)';
  ctx.fillText('v2.1 — property of ndz', W / 2, 200);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // desktop icons
  drawFolder(ctx, 60, 48, 'diary');
  drawFolder(ctx, 60, 190, 'research');

  // hint card, bottom right
  ctx.fillStyle = 'rgba(10,20,16,0.75)';
  ctx.fillRect(W - 360, H - 130, 300, 62);
  ctx.strokeStyle = '#2f6a58';
  ctx.lineWidth = 2;
  ctx.strokeRect(W - 360, H - 130, 300, 62);
  ctx.font = `18px ${MONO}`;
  ctx.fillStyle = '#7ad0b0';
  ctx.fillText('PRESS [E] AT THE DESK', W - 340, H - 116);
  ctx.fillText('TO USE THIS MACHINE', W - 340, H - 92);

  // taskbar
  ctx.fillStyle = '#101a16';
  ctx.fillRect(0, H - 44, W, 44);
  ctx.fillStyle = '#1c3a2e';
  ctx.fillRect(0, H - 44, W, 3);
  ctx.fillStyle = '#2f6a58';
  ctx.fillRect(10, H - 36, 96, 28);
  ctx.font = `18px ${MONO}`;
  ctx.fillStyle = '#dff5ea';
  ctx.fillText('start', 30, H - 32);

  // live clock
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const colon = Math.floor(t * 1.2) % 2 === 0 ? ':' : ' ';
  ctx.fillStyle = '#9adfc4';
  ctx.textAlign = 'right';
  ctx.fillText(`${hh}${colon}${mm}`, W - 24, H - 32);
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
  } else if (t < 12.0) {
    drawLogin(ctx, t);
  } else if (t < DESKTOP_AT) {
    // video mode switch: black with one bright flash frame
    ctx.fillStyle = t > 12.05 && t < 12.12 ? '#aab4ff' : '#000000';
    ctx.fillRect(0, 0, W, H);
  } else {
    drawDesktop(ctx, t);
  }
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
    // Dev helper: ?boot=12 fast-forwards the boot sequence by 12 seconds
    const bootOffset = Number(new URLSearchParams(window.location.search).get('boot')) || 0;
    return { ctx, texture, material, overlay: makeCrtOverlay(W, H), bootOffset };
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
    const t = now + bootOffset;
    // desktop is near-static: 4fps keeps the clock/cursor alive for cheap
    const fps = t > DESKTOP_AT + 1 ? 4 : FPS;
    if (now - lastDraw.current < 1 / fps) return;
    lastDraw.current = now;

    drawFrame(ctx, t);

    // moving refresh band
    const bandY = ((now * 130) % (H + 240)) - 120;
    const band = ctx.createLinearGradient(0, bandY, 0, bandY + 110);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, 'rgba(255,255,255,0.045)');
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, Math.max(0, bandY), W, 110);

    ctx.drawImage(overlay, 0, 0);
    texture.needsUpdate = true;
  });

  return null;
}
