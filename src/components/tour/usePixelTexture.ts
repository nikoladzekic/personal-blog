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
