import { useMemo } from 'react';
import * as THREE from 'three';

function makeTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Warm wooden floor planks — clearly readable as a wooden floor */
function drawFloor(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const plankH = Math.floor(h / 6);
  const colors = ['#9b7042', '#aa7b49', '#8f653b', '#b38250'];
  for (let y = 0; y < h; y += plankH) {
    const c = colors[Math.floor(y / plankH) % colors.length];
    ctx.fillStyle = c;
    ctx.fillRect(0, y, w, plankH);
    // plank groove
    ctx.fillStyle = '#5b3d20';
    ctx.fillRect(0, y + plankH - 1, w, 1);
    // grain streaks
    for (let i = 0; i < 4; i++) {
      const gx = Math.floor(Math.random() * w);
      ctx.fillStyle = 'rgba(82,52,24,0.34)';
      ctx.fillRect(gx, y + 1, 1, plankH - 2);
    }
    // subtle plank highlight
    ctx.fillStyle = 'rgba(255,220,160,0.12)';
    ctx.fillRect(0, y + 1, w, 1);
  }
}

/* Warm apartment wall: light enough to avoid the bunker/horror feel. */
function drawWalls(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#d2cfda';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h * 0.08; i++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    const v = 198 + Math.floor(Math.random() * 18);
    ctx.fillStyle = `rgb(${v},${v - 2},${v + 10})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

/* Medium wood grain for the desk surface */
function drawDeskWood(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#b9854d';
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) {
    ctx.fillStyle = y % 4 === 0 ? '#c49258' : '#9f7040';
    ctx.fillRect(0, y, w, 1);
  }
  for (let i = 0; i < 6; i++) {
    const gx = Math.floor(Math.random() * w);
    ctx.fillStyle = 'rgba(96,60,28,0.35)';
    ctx.fillRect(gx, 0, 1, h);
  }
}

function drawShelfWood(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#8a633a';
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) {
    ctx.fillStyle = y % 4 === 0 ? '#a27645' : '#765230';
    ctx.fillRect(0, y, w, 1);
  }
}

function drawCeiling(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#d9d6dd';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h * 0.05; i++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    ctx.fillStyle = 'rgba(230,226,236,0.6)';
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawBookCover(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: string,
  spine: string,
  accent: string
) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // spine band on the left
  ctx.fillStyle = spine;
  ctx.fillRect(0, 0, Math.floor(w * 0.22), h);
  // title plate
  ctx.fillStyle = accent;
  ctx.fillRect(Math.floor(w * 0.32), Math.floor(h * 0.16), w - Math.floor(w * 0.4), Math.floor(h * 0.14));
  // decorative lines
  ctx.fillStyle = accent;
  ctx.fillRect(Math.floor(w * 0.32), Math.floor(h * 0.55), w - Math.floor(w * 0.4), 1);
  ctx.fillRect(Math.floor(w * 0.32), Math.floor(h * 0.62), w - Math.floor(w * 0.45), 1);
  ctx.fillRect(Math.floor(w * 0.32), Math.floor(h * 0.69), w - Math.floor(w * 0.42), 1);
  // worn edge highlight
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(w - 1, 0, 1, h);
}

/* A small framed poster — abstract pixel art */
function drawPoster(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#0d1b2a';
  ctx.fillRect(0, 0, w, h);
  // "mountains"
  ctx.fillStyle = '#1b4965';
  ctx.fillRect(0, Math.floor(h * 0.6), w, Math.floor(h * 0.4));
  ctx.fillStyle = '#2a6f97';
  for (let x = 0; x < w; x += 1) {
    const peak = Math.floor(h * 0.6 + Math.sin(x * 0.6) * 3);
    ctx.fillRect(x, peak, 1, h - peak);
  }
  // sun
  ctx.fillStyle = '#e0a458';
  ctx.fillRect(Math.floor(w * 0.6), Math.floor(h * 0.2), 4, 4);
}

/* Bug-hunter "target board" for the dark frame beside the desk: polaroid
 * recon cards joined by pinned string, sticky-note leads, a barcode footer.
 * Fully deterministic (no Math.random) so it bakes identically every mount. */
function drawOpsBoard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const crimson = '#d22f4f';
  const gold = '#d4a04a';

  ctx.fillStyle = '#101522';
  ctx.fillRect(0, 0, w, h);
  // faint blueprint grid
  ctx.fillStyle = 'rgba(90,110,160,0.09)';
  for (let x = 8; x < w; x += 8) ctx.fillRect(x, 0, 1, h);
  for (let y = 8; y < h; y += 8) ctx.fillRect(0, y, w, 1);

  // header
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = crimson;
  ctx.fillRect(8, 8, w - 16, 2);
  ctx.font = 'bold 12px monospace';
  ctx.fillText('// TARGET BOARD', 10, 14);
  ctx.fillStyle = gold;
  ctx.font = '8px monospace';
  ctx.fillText('ACTIVE ENGAGEMENTS: 2', 10, 30);

  // polaroid card with a tiny pixel sketch in the photo window
  const card = (
    cx: number,
    cy: number,
    cw: number,
    ch: number,
    tilt: number,
    sketch: 'building' | 'chip' | 'radar',
    label: string
  ) => {
    ctx.save();
    ctx.translate(cx + cw / 2, cy + ch / 2);
    ctx.rotate(tilt);
    ctx.translate(-cw / 2, -ch / 2);
    ctx.fillStyle = '#d8d4c8';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#141a28';
    ctx.fillRect(4, 4, cw - 8, ch - 18);
    if (sketch === 'building') {
      ctx.fillStyle = '#3f5878';
      ctx.fillRect(8, ch - 30, 10, 14);
      ctx.fillRect(20, ch - 40, 12, 24);
      ctx.fillRect(34, ch - 26, 9, 10);
      ctx.fillStyle = gold;
      for (const [bx, by] of [[22, ch - 36], [27, ch - 36], [22, ch - 29], [27, ch - 22], [10, ch - 27], [36, ch - 23]])
        ctx.fillRect(bx, by, 2, 2);
    } else if (sketch === 'chip') {
      ctx.fillStyle = '#2e4a3a';
      ctx.fillRect(12, 12, cw - 30, ch - 40);
      ctx.fillStyle = gold;
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(8, 14 + i * 5, 3, 2);
        ctx.fillRect(cw - 19, 14 + i * 5, 3, 2);
      }
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(16, 16, 4, 4);
    } else {
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 1;
      const rcx = cw / 2;
      const rcy = (ch - 14) / 2 + 2;
      for (const r of [6, 12, 18]) {
        ctx.beginPath();
        ctx.arc(rcx, rcy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(rcx, rcy);
      ctx.lineTo(rcx + 14, rcy - 11);
      ctx.stroke();
      ctx.fillStyle = crimson;
      ctx.fillRect(rcx - 9, rcy + 4, 2, 2);
      ctx.fillRect(rcx + 6, rcy - 14, 2, 2);
    }
    ctx.fillStyle = '#3a3630';
    ctx.font = '7px monospace';
    ctx.fillText(label, 5, ch - 12);
    ctx.restore();
  };

  card(10, 46, 50, 60, -0.05, 'building', 'API GW');
  card(112, 50, 52, 62, 0.06, 'chip', 'MCU FW');
  card(60, 118, 54, 64, -0.03, 'radar', 'RECON');

  // sticky-note leads
  const sticky = (x: number, y: number, sw: number, text: string, color: string, tilt: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, sw, 16);
    ctx.fillStyle = '#221c10';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(text, 3, 5);
    ctx.restore();
  };
  sticky(124, 122, 34, 'SSRF?', '#d8b830', 0.08);
  sticky(8, 116, 54, 'AUTH BYPASS', '#d8b830', -0.06);
  sticky(4, 152, 60, 'CVE-2026-????', '#7ad07a', 0.04);
  sticky(126, 32, 44, 'IN SCOPE', '#7ad07a', -0.05);

  // crimson string joining the gold pins
  ctx.strokeStyle = crimson;
  ctx.lineWidth = 1;
  const pins: [number, number][] = [
    [38, 52],
    [136, 56],
    [88, 124],
  ];
  ctx.beginPath();
  ctx.moveTo(pins[0][0], pins[0][1]);
  ctx.lineTo(pins[1][0], pins[1][1]);
  ctx.lineTo(pins[2][0], pins[2][1]);
  ctx.closePath();
  ctx.stroke();
  for (const [px, py] of pins) {
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff2d0';
    ctx.fillRect(px - 1, py - 1, 1, 1);
  }

  // classified footer + barcode
  ctx.fillStyle = crimson;
  ctx.font = 'bold 8px monospace';
  ctx.fillText('CLASSIFIED', 122, 200);
  ctx.fillStyle = '#c8c8d8';
  const bars = [2, 1, 3, 1, 1, 2, 1, 4, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 1, 2, 4, 1, 2, 1, 3];
  let bx = 10;
  for (let i = 0; i < bars.length; i++) {
    if (i % 2 === 0) ctx.fillRect(bx, 198, bars[i], 14);
    bx += bars[i] + 1;
  }
}

function drawOutside(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Dark night sky with purple/blue gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#0a0614');
  gradient.addColorStop(0.4, '#1a0f2e');
  gradient.addColorStop(1, '#2a1848');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Background buildings - larger, more detailed
  const buildings = [
    { x: 0, y: 8, w: 12, h: 24, color: '#0d0818' },
    { x: 10, y: 5, w: 10, h: 27, color: '#110a20' },
    { x: 18, y: 12, w: 14, h: 20, color: '#0f0719' },
    { x: 30, y: 3, w: 11, h: 29, color: '#140c25' },
    { x: 39, y: 9, w: 9, h: 23, color: '#0e0617' },
    { x: 46, y: 6, w: 10, h: 26, color: '#120922' },
  ];

  // Draw buildings with window lights
  for (const building of buildings) {
    // Building silhouette
    ctx.fillStyle = building.color;
    ctx.fillRect(building.x, building.y, building.w, building.h);
    
    // Building edge highlights
    ctx.fillStyle = 'rgba(255, 0, 140, 0.15)';
    ctx.fillRect(building.x, building.y, 1, building.h);
    ctx.fillRect(building.x + building.w - 1, building.y, 1, building.h);
    
    // Windows with various neon colors
    const windowColors = ['#ff0080', '#00ffff', '#ff00ff', '#ffff00', '#00ff80'];
    for (let wy = building.y + 2; wy < building.y + building.h - 2; wy += 3) {
      for (let wx = building.x + 2; wx < building.x + building.w - 2; wx += 3) {
        if (Math.random() > 0.3) {
          const color = windowColors[Math.floor(Math.random() * windowColors.length)];
          ctx.fillStyle = color;
          ctx.fillRect(wx, wy, 1, 1);
          // Window glow
          ctx.fillStyle = color + '22';
          ctx.fillRect(wx - 1, wy - 1, 3, 3);
        }
      }
    }
  }

  // Neon signs and holographic ads
  const neonSigns = [
    { x: 15, y: 10, color: '#ff0080' },
    { x: 35, y: 7, color: '#00ffff' },
    { x: 8, y: 15, color: '#ff00ff' },
    { x: 42, y: 12, color: '#80ff00' },
  ];

  for (const sign of neonSigns) {
    // Sign glow effect
    ctx.fillStyle = sign.color + '44';
    ctx.fillRect(sign.x - 2, sign.y - 1, 5, 3);
    ctx.fillStyle = sign.color;
    ctx.fillRect(sign.x - 1, sign.y, 3, 1);
  }

  // Street level fog/mist
  const mistGradient = ctx.createLinearGradient(0, h - 8, 0, h);
  mistGradient.addColorStop(0, 'rgba(0, 245, 255, 0.05)');
  mistGradient.addColorStop(0.5, 'rgba(255, 0, 128, 0.08)');
  mistGradient.addColorStop(1, 'rgba(140, 0, 255, 0.12)');
  ctx.fillStyle = mistGradient;
  ctx.fillRect(0, h - 8, w, 8);

  // Flying vehicles (small dots with trails)
  const vehicles = [
    { x: 5, y: 4, color: '#ff6600' },
    { x: 25, y: 8, color: '#00ff99' },
    { x: 45, y: 5, color: '#ff00aa' },
  ];

  for (const vehicle of vehicles) {
    // Vehicle trail
    ctx.fillStyle = vehicle.color + '33';
    ctx.fillRect(vehicle.x - 3, vehicle.y, 4, 1);
    // Vehicle light
    ctx.fillStyle = vehicle.color;
    ctx.fillRect(vehicle.x, vehicle.y, 1, 1);
  }
}

export type BookTextureVariant = 'diary' | 'research';

export function usePixelTextures() {
  return useMemo(() => {
    const floor = makeTexture(32, 32, drawFloor);
    floor.repeat.set(3, 3);

    const walls = makeTexture(32, 32, drawWalls);
    walls.repeat.set(3, 1);

    const desk = makeTexture(16, 16, drawDeskWood);
    desk.repeat.set(2, 1);

    const ceiling = makeTexture(16, 16, drawCeiling);
    ceiling.repeat.set(3, 3);

    const shelfWood = makeTexture(16, 16, drawShelfWood);

    const poster = makeTexture(24, 32, drawPoster);

    const opsBoard = makeTexture(176, 220, drawOpsBoard);

    const outside = makeTexture(128, 64, drawOutside);

    const bookResearch = makeTexture(16, 32, (ctx, w, h) =>
      drawBookCover(ctx, w, h, '#7a2222', '#4a1010', '#d4a04a')
    );

    const bookDiary = makeTexture(16, 32, (ctx, w, h) =>
      drawBookCover(ctx, w, h, '#1d5a5a', '#0e3232', '#7ad0d0')
    );

    return {
      floor,
      walls,
      desk,
      ceiling,
      shelfWood,
      poster,
      opsBoard,
      outside,
      bookResearch,
      bookDiary,
    };
  }, []);
}

export function getBookTexture(
  textures: ReturnType<typeof usePixelTextures>,
  variant: BookTextureVariant
): THREE.CanvasTexture {
  return variant === 'diary' ? textures.bookDiary : textures.bookResearch;
}
