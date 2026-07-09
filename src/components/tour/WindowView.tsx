import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshPortalMaterial, useTexture } from '@react-three/drei';
import * as THREE from 'three';

/**
 * The window is a portal into a small separate scene (true parallax — the
 * city sits meters behind the wall instead of being painted on the glass).
 * Everything inside is self-lit meshBasicMaterial so room lighting never
 * washes it out. All coordinates are window-plane local: -z is outside.
 */

interface WindowViewProps {
  isDark?: boolean;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCityTexture(
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
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Parse '#rrggbb' or 'rgb(r,g,b)' — shade/mix output feeds back into them, so both forms occur. */
function parseCol(c: string): [number, number, number] {
  if (c.startsWith('#')) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/\d+/g)!;
  return [+m[0], +m[1], +m[2]];
}

/** Multiply a colour by a brightness factor (clamped to 0..255). */
function shade(col: string, f: number): string {
  const [r, g, b] = parseCol(col);
  return `rgb(${Math.min(255, Math.round(r * f))},${Math.min(255, Math.round(g * f))},${Math.min(255, Math.round(b * f))})`;
}

/** Blend two colours: t=0 → a, t=1 → b. */
function mix(a: string, b: string, t: number): string {
  const ca = parseCol(a);
  const cb = parseCol(b);
  const ch = (i: number) => Math.round(ca[i] + (cb[i] - ca[i]) * t);
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}

// Day facade palettes sampled from the Tokyo backdrop photo so the procedural
// layers sit in the same light as the photograph instead of clashing cold-grey.
const DAY_FACADES = ['#e2ddd2', '#d8cbb0', '#cbbc9e', '#b8ada0', '#9a9d97', '#a08573'];
const DAY_GLASS = ['#4e7d78', '#3e6e6a', '#5b8489', '#6a8f94'];

interface SkylineOptions {
  seed: number;
  night: boolean;
  /** Building fill color */
  body: string;
  /** Hazier color toward the building top (day atmospheric perspective) */
  hazeTop?: string;
  /** Max building height as a fraction of canvas height */
  maxH: number;
  litDensity: number;
  /** Day only: how far facades melt toward the haze colour (atmospheric perspective) */
  dayHazeMix?: number;
}

interface Beacon {
  u: number; // 0..1 across the strip
  v: number; // 0..1 from the bottom
}

function drawSkyline(
  w: number,
  h: number,
  opts: SkylineOptions
): { texture: THREE.CanvasTexture; beacons: Beacon[] } {
  const rand = mulberry32(opts.seed);
  const beacons: Beacon[] = [];
  const palette = opts.night
    ? ['#ffb347', '#ffcf7a', '#ff8a4b', '#ffd9a0', '#7fe9ff', '#6af2ff', '#ff5ad1', '#c9a0ff']
    : ['#e6f0fa', '#d2e2f1', '#bcd4e8', '#cddff0']; // pale sky reflected in glass by day

  const texture = makeCityTexture(w, h, (ctx) => {
    ctx.clearRect(0, 0, w, h);
    if (opts.night) {
      drawNightSkyline(ctx, w, h, opts, rand, beacons, palette);
    } else {
      drawDaySkyline(ctx, w, h, opts, rand, beacons, palette);
    }
  });

  return { texture, beacons: beacons.slice(0, 3) };
}

/** The original approved night renderer — kept on its own rand stream so day tweaks never reshuffle it. */
function drawNightSkyline(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: SkylineOptions,
  rand: () => number,
  beacons: Beacon[],
  palette: string[]
) {
  let x = 0;
  while (x < w - 8) {
    const bw = 26 + Math.floor(rand() * 70);
    const bh = Math.floor(h * (0.22 + rand() * opts.maxH));
    const top = h - bh;

    // facade tone with vertical form: top catches sky light, base sinks into shadow
    const body = ctx.createLinearGradient(0, top, 0, h);
    body.addColorStop(0, shade(opts.body, 1.5));
    body.addColorStop(1, shade(opts.body, 0.65));
    ctx.fillStyle = body;
    ctx.fillRect(x, top, bw, bh);

    // directional side-light: bright lit edge on the left, shadowed right face — gives volume
    const side = ctx.createLinearGradient(x, 0, x + bw, 0);
    side.addColorStop(0, 'rgba(150,170,210,0.12)');
    side.addColorStop(0.35, 'rgba(0,0,0,0)');
    side.addColorStop(1, 'rgba(0,0,0,0.30)');
    ctx.fillStyle = side;
    ctx.fillRect(x, top, bw, bh);

    const cols = Math.max(1, Math.floor(bw / 8));
    const rows = Math.max(1, Math.floor(bh / 11));
    const colX = (c: number) => x + 4 + c * 8;
    const rowY = (r: number) => top + 6 + r * 11;

    // antenna / spire on some towers
    if (rand() < 0.3) {
      ctx.fillStyle = shade(opts.body, 1.2);
      ctx.fillRect(x + bw / 2 - 1, top - 14 - rand() * 22, 2, 36);
    }
    if (rand() < 0.22 && bh > h * 0.55) {
      beacons.push({ u: (x + bw / 2) / w, v: 1 - top / h });
    }

    // lit windows — clustered per column so floors read as occupied vs. empty, and
    // each window carries a baked glow halo (real bloom can't reach the portal)
    for (let c = 0; c < cols; c++) {
      const colBias = 0.25 + rand() * 0.95;
      for (let r = 0; r < rows; r++) {
        if (rand() > opts.litDensity * colBias) continue;
        const col = palette[Math.floor(rand() * palette.length)];
        ctx.shadowColor = col;
        ctx.shadowBlur = 5 + rand() * 4;
        ctx.globalAlpha = 0.6 + rand() * 0.4;
        ctx.fillStyle = col;
        ctx.fillRect(colX(c), rowY(r), 4, 5);
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // giant LED ad-board on the facade
    if (rand() < 0.16 && bh > h * 0.5) {
      const aw = bw * 0.5;
      const ah = 20 + rand() * 26;
      const ax = x + bw * 0.25;
      const ay = top + 10 + rand() * (bh * 0.3);
      const grad = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah);
      grad.addColorStop(0, '#ff2fb4');
      grad.addColorStop(1, '#2fd4ff');
      ctx.shadowColor = '#ff2fb4';
      ctx.shadowBlur = 16;
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(ax, ay, aw, ah);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    x += bw + 2 + Math.floor(rand() * 8);
  }

  // warm street-glow rising from below the sill
  const glow = ctx.createLinearGradient(0, h, 0, h * 0.72);
  glow.addColorStop(0, 'rgba(255,140,70,0.5)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, Math.floor(h * 0.72), w, Math.ceil(h * 0.28));
}

/**
 * Day renderer: two overlapping rows per layer (hazy silhouettes peeking through
 * the gaps behind a detailed front row), and every front building gets a receding
 * shadowed side face — the 2.5D trick that stops slabs reading as paper cutouts.
 */
function drawDaySkyline(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: SkylineOptions,
  rand: () => number,
  beacons: Beacon[],
  palette: string[]
) {
  const haze = opts.hazeTop || opts.body;
  const layerMix = opts.dayHazeMix ?? 0.3;

  const drawBuilding = (x: number, back: boolean): number => {
    const bw = back ? 34 + Math.floor(rand() * 84) : 26 + Math.floor(rand() * 70);
    const bh = Math.floor(h * (0.24 + rand() * opts.maxH * (back ? 1.05 : 1)));
    const top = h - bh;
    // back row melts further into the haze; that tonal step IS the depth cue
    const hazeMix = Math.min(0.92, layerMix + (back ? 0.34 : 0));
    const isGlass = rand() < 0.3 && bh > h * 0.4;
    const dayBase = isGlass
      ? DAY_GLASS[Math.floor(rand() * DAY_GLASS.length)]
      : DAY_FACADES[Math.floor(rand() * DAY_FACADES.length)];
    const baseCol = mix(dayBase, haze, hazeMix);

    // front face + receding side face split
    const sideW = back ? 0 : Math.max(6, Math.floor(bw * 0.16));
    const frontW = bw - sideW;

    const body = ctx.createLinearGradient(0, top, 0, h);
    if (isGlass) {
      // glass curtain wall reflects the sandy sky at the top, deepens toward the street
      body.addColorStop(0, mix(baseCol, haze, 0.5));
      body.addColorStop(0.5, baseCol);
      body.addColorStop(1, shade(baseCol, 0.74));
    } else {
      body.addColorStop(0, mix(baseCol, haze, 0.3));
      body.addColorStop(0.45, baseCol);
      body.addColorStop(1, shade(baseCol, 0.82));
    }
    ctx.fillStyle = body;
    ctx.fillRect(x, top, frontW, bh);

    // receding side face: darker, roofline dropping toward the vanishing side.
    // This one trapezoid is what turns a rectangle into a volume.
    if (sideW > 0) {
      const skew = 3 + Math.floor(rand() * 5);
      const sideBase = mix(shade(dayBase, 0.6), haze, Math.min(0.95, hazeMix + 0.1));
      const sg = ctx.createLinearGradient(0, top, 0, h);
      sg.addColorStop(0, mix(sideBase, haze, 0.25));
      sg.addColorStop(1, shade(sideBase, 0.85));
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(x + frontW, top);
      ctx.lineTo(x + bw, top + skew);
      ctx.lineTo(x + bw, h);
      ctx.lineTo(x + frontW, h);
      ctx.closePath();
      ctx.fill();
      // floor lines wrap onto the side face
      ctx.strokeStyle = 'rgba(20,30,35,0.12)';
      ctx.lineWidth = 1;
      for (let yy = top + 11; yy < h; yy += 11) {
        ctx.beginPath();
        ctx.moveTo(x + frontW, yy);
        ctx.lineTo(x + bw, yy + skew);
        ctx.stroke();
      }
    }

    // warm sun-kissed left edge on the front face
    const litEdge = ctx.createLinearGradient(x, 0, x + frontW, 0);
    litEdge.addColorStop(0, 'rgba(255,240,215,0.26)');
    litEdge.addColorStop(0.35, 'rgba(0,0,0,0)');
    ctx.fillStyle = litEdge;
    ctx.fillRect(x, top, frontW, bh);

    // rooftop clutter: AC units, water tanks, stair bulkheads
    if (bw > 30) {
      const clutterN = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < clutterN; k++) {
        const cwid = 5 + rand() * 12;
        const chgt = 4 + rand() * 8;
        const cx = x + 4 + rand() * (Math.max(cwid, frontW - cwid - 8));
        ctx.fillStyle = shade(baseCol, 0.72 + rand() * 0.2);
        ctx.fillRect(cx, top - chgt, cwid, chgt);
      }
    }
    if (rand() < 0.3) {
      ctx.fillStyle = shade(baseCol, 0.6);
      ctx.fillRect(x + frontW / 2 - 1, top - 14 - rand() * 22, 2, 36);
    }

    // back row stops here: silhouette + clutter is all the haze lets you see anyway
    if (back) return bw;

    if (rand() < 0.22 && bh > h * 0.55) {
      beacons.push({ u: (x + bw / 2) / w, v: 1 - top / h });
    }

    const cols = Math.max(1, Math.floor(frontW / 8));
    const rows = Math.max(1, Math.floor(bh / 11));
    const colX = (c: number) => x + 4 + c * 8;
    const rowY = (r: number) => top + 6 + r * 11;

    // mullion grid: strong floor bands on glass, light grid on masonry
    ctx.strokeStyle = isGlass ? 'rgba(25,45,50,0.28)' : 'rgba(35,50,70,0.14)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(colX(c), top);
      ctx.lineTo(colX(c), h);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(x, rowY(r));
      ctx.lineTo(x + frontW, rowY(r));
      ctx.stroke();
    }
    // per-panel tint jitter so big facades don't read as one flat fill
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const j = rand();
        if (j < 0.18) {
          ctx.fillStyle = j < 0.09 ? 'rgba(255,255,255,0.07)' : 'rgba(20,35,40,0.07)';
          ctx.fillRect(colX(c), rowY(r), 8, 11);
        }
      }
    }
    // masonry gets dark punched windows — the contrast that makes daytime
    // facades read as buildings instead of pale slabs. Window contrast fades
    // with the layer's haze, like everything else at distance.
    if (!isGlass) {
      const winA = 1 - hazeMix;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rand() < 0.6) {
            ctx.fillStyle = `rgba(30,38,48,${(0.32 + rand() * 0.3) * winA})`;
            ctx.fillRect(colX(c), rowY(r), 4, 5);
          }
        }
      }
    }

    // pale sky-reflection windows + rare hot sun glints on sun-facing columns
    for (let c = 0; c < cols; c++) {
      const colBias = 0.25 + rand() * 0.95;
      for (let r = 0; r < rows; r++) {
        if (rand() > opts.litDensity * colBias) continue;
        ctx.globalAlpha = 0.22 + rand() * 0.35;
        ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
        ctx.fillRect(colX(c), rowY(r), 4, 5);
      }
      if (c < cols * 0.45 && rand() < 0.045) {
        const r = Math.floor(rand() * rows);
        ctx.shadowColor = '#fff6e0';
        ctx.shadowBlur = 4;
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = '#fff8e6';
        ctx.fillRect(colX(c), rowY(r), 4, 5);
        ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;

    // LED ad-board, dim against the daylight
    if (rand() < 0.08 && bh > h * 0.5) {
      const aw = frontW * 0.5;
      const ah = 20 + rand() * 26;
      const ax = x + frontW * 0.25;
      const ay = top + 10 + rand() * (bh * 0.3);
      const grad = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah);
      grad.addColorStop(0, '#ff2fb4');
      grad.addColorStop(1, '#2fd4ff');
      ctx.shadowColor = '#ff2fb4';
      ctx.shadowBlur = 6;
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(ax, ay, aw, ah);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    return bw;
  };

  // hazy back row first, with gaps the front row won't fully cover
  let x = -10;
  while (x < w) {
    const bw = drawBuilding(x, true);
    x += bw + 14 + Math.floor(rand() * 40);
  }
  // detailed front row on top
  x = 0;
  while (x < w - 8) {
    const bw = drawBuilding(x, false);
    x += bw + 4 + Math.floor(rand() * 14);
  }

  // street-canyon shadow at the very base — buildings ground into dark streets
  // instead of dissolving into milk (the haze now lives between layers instead)
  const base = ctx.createLinearGradient(0, h - 26, 0, h);
  base.addColorStop(0, 'rgba(45,45,50,0)');
  base.addColorStop(1, 'rgba(45,45,50,0.3)');
  ctx.fillStyle = base;
  ctx.fillRect(0, h - 26, w, 26);
}

/**
 * Aerial city fabric for the ground plane — seen from an upper-floor window the
 * ground reads as blocks and streets, not as a sheet of asphalt. v=0 is far, v=1
 * near. Both modes share one block layout (same city, different hour): day shows
 * rooftops, lane markings and traffic; night goes dark with streetlight strings.
 */
function drawCityBlocks(ctx: CanvasRenderingContext2D, w: number, h: number, night: boolean) {
  const road = 30;

  // roads = the base coat; blocks get stamped on top, leaving the grid exposed
  ctx.fillStyle = night ? '#0a0813' : '#46464a';
  ctx.fillRect(0, 0, w, h);

  // one layout stream for both modes, separate stream for per-mode detail
  const layout = mulberry32(77);
  const detail = mulberry32(night ? 101 : 102);

  const xs: number[] = [];
  for (let x = -30 + layout() * 40; x < w + 260; x += 130 + layout() * 150) xs.push(x);
  const ys: number[] = [];
  for (let y = -30 + layout() * 30; y < h + 240; y += 110 + layout() * 130) ys.push(y);

  const dayRoofs = ['#b5aa96', '#a8a49a', '#c0b6a2', '#8f8c84', '#9aa08e', '#b3a58c'];

  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const bx = xs[i] + road / 2;
      const by = ys[j] + road / 2;
      const bw = xs[i + 1] - xs[i] - road;
      const bh = ys[j + 1] - ys[j] - road;
      const t = layout();

      if (night) {
        // blocks are near-black roof masses; the streets stay the visible thing
        ctx.fillStyle = 'rgba(120,110,130,0.16)'; // faint kerb ring so roads read as cut channels
        ctx.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
        ctx.fillStyle = `rgb(${14 + Math.round(t * 9)},${11 + Math.round(t * 7)},${24 + Math.round(t * 10)})`;
        ctx.fillRect(bx, by, bw, bh);
        // faint courtyard light leaking between roofs
        for (let k = 0; k < 3; k++) {
          if (detail() < 0.35) {
            ctx.fillStyle = `rgba(255,190,120,${0.05 + detail() * 0.09})`;
            ctx.fillRect(bx + detail() * (bw - 8), by + detail() * (bh - 8), 4 + detail() * 6, 4 + detail() * 6);
          }
        }
      } else {
        // pale sidewalk ring frames the block, so every road has crisp kerb lines
        ctx.fillStyle = 'rgba(206,202,190,0.85)';
        ctx.fillRect(bx - 5, by - 5, bw + 10, bh + 10);
        ctx.fillStyle = dayRoofs[Math.floor(t * dayRoofs.length)];
        ctx.fillRect(bx, by, bw, bh);
        // sun from the left: lit west kerb, shadowed south edge grounds each block
        ctx.fillStyle = 'rgba(255,244,220,0.25)';
        ctx.fillRect(bx, by, 4, bh);
        ctx.fillStyle = 'rgba(30,30,35,0.28)';
        ctx.fillRect(bx, by + bh - 5, bw, 5);
        // rooftop clutter speckles: AC boxes, skylights, vents
        for (let k = 0; k < 12; k++) {
          if (detail() < 0.55) {
            ctx.fillStyle = detail() < 0.5 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.12)';
            ctx.fillRect(bx + 4 + detail() * (bw - 16), by + 4 + detail() * (bh - 16), 3 + detail() * 9, 3 + detail() * 9);
          }
        }
        // occasional green pocket park
        if (t > 0.82) {
          ctx.fillStyle = 'rgba(96,118,80,0.8)';
          ctx.fillRect(bx + bw * 0.55, by + bh * 0.2, bw * 0.35, bh * 0.5);
        }
      }
    }
  }

  // street life along the road grid
  for (let i = 1; i < xs.length - 1; i++) {
    const rx = xs[i]; // vertical road centre
    if (rx < -road || rx > w + road) continue;
    for (let yy = 0; yy < h; yy += 26) {
      if (night) {
        // streetlight strings — warm dots marching down each road
        ctx.shadowColor = '#ffb46a';
        ctx.shadowBlur = 6;
        ctx.fillStyle = 'rgba(255,180,105,0.85)';
        ctx.fillRect(rx + (yy % 52 < 26 ? -9 : 7), yy, 3, 3);
        ctx.shadowBlur = 0;
        // sparse headlight/taillight pairs
        if (detail() < 0.1) {
          ctx.fillStyle = '#fff6e0';
          ctx.fillRect(rx - 4, yy + 8, 2, 5);
          ctx.fillStyle = '#ff5544';
          ctx.fillRect(rx + 3, yy + 8, 2, 5);
        }
      } else {
        // dashed centre line + sparse traffic
        ctx.fillStyle = 'rgba(225,225,212,0.3)';
        ctx.fillRect(rx - 1, yy, 2, 7);
        if (detail() < 0.2) {
          const carCols = ['#d8d8d8', '#9aa2ab', '#7a7f88', '#c8bfae'];
          ctx.fillStyle = carCols[Math.floor(detail() * carCols.length)];
          ctx.fillRect(rx + (detail() < 0.5 ? -8 : 5), yy + 6, 4, 8);
        }
      }
    }
  }
  for (let j = 1; j < ys.length - 1; j++) {
    const ry = ys[j]; // horizontal road centre
    if (ry < -road || ry > h + road) continue;
    for (let xx = 0; xx < w; xx += 26) {
      if (night) {
        ctx.shadowColor = '#ffb46a';
        ctx.shadowBlur = 6;
        ctx.fillStyle = 'rgba(255,180,105,0.85)';
        ctx.fillRect(xx, ry + (xx % 52 < 26 ? -9 : 7), 3, 3);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(225,225,212,0.3)';
        ctx.fillRect(xx, ry - 1, 7, 2);
        if (detail() < 0.2) {
          const carCols = ['#d8d8d8', '#9aa2ab', '#7a7f88', '#c8bfae'];
          ctx.fillStyle = carCols[Math.floor(detail() * carCols.length)];
          ctx.fillRect(xx + 6, ry + (detail() < 0.5 ? -8 : 5), 8, 4);
        }
      }
    }
  }

  // zebra crossings at every intersection — the most legible "city street from
  // above" cue there is (day only; they'd be invisible in the dark)
  if (!night) {
    ctx.fillStyle = 'rgba(228,228,216,0.55)';
    for (let i = 1; i < xs.length - 1; i++) {
      for (let j = 1; j < ys.length - 1; j++) {
        const cx = xs[i];
        const cy = ys[j];
        if (cx < 0 || cx > w || cy < 0 || cy > h) continue;
        for (let s = -2; s <= 2; s++) {
          // stripes across the vertical road, above and below the junction
          ctx.fillRect(cx + s * 6 - 2, cy - road / 2 - 9, 4, 7);
          ctx.fillRect(cx + s * 6 - 2, cy + road / 2 + 2, 4, 7);
          // stripes across the horizontal road, left and right of the junction
          ctx.fillRect(cx - road / 2 - 9, cy + s * 6 - 2, 7, 4);
          ctx.fillRect(cx + road / 2 + 2, cy + s * 6 - 2, 7, 4);
        }
      }
    }
  }

  // guaranteed main avenue right below the window (world z ≈ -5.8..-4.2, canvas
  // f = (z+48)/64) — the StreetTraffic cars drive on this band, so it must be a
  // road regardless of where the random block grid landed
  const avTop = Math.floor(h * 0.658);
  const avH = Math.ceil(h * 0.027);
  ctx.fillStyle = night ? '#0a0813' : '#46464a';
  ctx.fillRect(0, avTop, w, avH);
  if (night) {
    // streetlight strings down both kerbs
    ctx.shadowColor = '#ffb46a';
    ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(255,180,105,0.85)';
    for (let xx = 8; xx < w; xx += 26) {
      ctx.fillRect(xx, avTop + 2, 3, 3);
      ctx.fillRect(xx + 13, avTop + avH - 5, 3, 3);
    }
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = 'rgba(206,202,190,0.85)';
    ctx.fillRect(0, avTop - 4, w, 4); // far sidewalk
    ctx.fillRect(0, avTop + avH, w, 4); // near sidewalk
    ctx.fillStyle = 'rgba(225,225,212,0.3)';
    for (let xx = 0; xx < w; xx += 26) {
      ctx.fillRect(xx, avTop + Math.floor(avH / 2) - 1, 7, 2); // centre dashes
    }
  }

  if (night) {
    // wet-street neon reflections smeared along the receding roads
    const rand = mulberry32(71);
    const colors = ['#ff2fb4', '#2fd4ff', '#ffc46a', '#6af2ff'];
    for (let i = 0; i < 40; i++) {
      const x = rand() * w;
      const len = h * (0.12 + rand() * 0.3);
      const y = h * 0.45 + rand() * h * 0.5;
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      ctx.globalAlpha = 0.05 + rand() * 0.12;
      ctx.fillRect(x, y, 2 + rand() * 3, len);
    }
    ctx.globalAlpha = 1;
  }

  // far edge dissolves into the mode's haze so the plane never shows a horizon seam
  const fade = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  if (night) {
    fade.addColorStop(0, 'rgba(11,6,24,0.95)');
    fade.addColorStop(1, 'rgba(11,6,24,0)');
  } else {
    fade.addColorStop(0, 'rgba(226,220,196,1)');
    fade.addColorStop(0.6, 'rgba(226,220,196,0.4)');
    fade.addColorStop(1, 'rgba(226,220,196,0)');
  }
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, Math.ceil(h * 0.5));
}

function drawNightGround(ctx: CanvasRenderingContext2D, w: number, h: number) {
  drawCityBlocks(ctx, w, h, true);
}

function drawDayGround(ctx: CanvasRenderingContext2D, w: number, h: number) {
  drawCityBlocks(ctx, w, h, false);
}

function drawNeonSign(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  // dark sign housing so the tubes have a backing
  ctx.fillStyle = 'rgba(8,5,18,0.92)';
  ctx.fillRect(0, 0, w, h);

  const rand = mulberry32(42);
  const drawBar = (x: number, y: number, bw: number, bh: number, color: string) => {
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, bw, bh);
    // hot white core
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(x + bw * 0.25, y + bh * 0.25, bw * 0.5, bh * 0.5);
  };

  // border tube
  ctx.shadowColor = '#ff2fb4';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = '#ff2fb4';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.shadowBlur = 0;

  // four glyph cells of thick tube strokes
  const cell = (h - 80) / 4;
  for (let i = 0; i < 4; i++) {
    const cy = 40 + i * cell;
    const color = i % 2 ? '#2fd4ff' : '#ff2fb4';
    drawBar(28, cy + cell * 0.18, w - 56, 7, color);
    drawBar(28 + rand() * 20, cy + cell * 0.5, w - 70 - rand() * 30, 7, color);
    drawBar(w * (0.3 + rand() * 0.3), cy + cell * 0.2, 7, cell * 0.55, color);
  }
}

/** Cylindrical backdrop so grazing view angles never run off the edge. */
function Backdrop({ isDark }: { isDark: boolean }) {
  const [night, day] = useTexture(['/cyberpunk-city.jpg', '/futuristic-city-day.jpg']);
  const tex = isDark ? night : day;
  // Night photo frames best slightly rotated; the day Tokyo sprawl is uniformly dense.
  const rotY = isDark ? 0 : -0.05;
  return (
    <mesh position={[0, -2, 0]} rotation={[0, rotY, 0]}>
      <cylinderGeometry args={[38, 38, 56, 64, 1, true, Math.PI - 1.5, 3]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} />
    </mesh>
  );
}

/** Flat street the towers rise from; fog fades its far edge into the skyline. */
function Ground({ isDark }: { isDark: boolean }) {
  const tex = useMemo(() => {
    const t = makeCityTexture(1024, 1024, isDark ? drawNightGround : drawDayGround);
    t.anisotropy = 16; // the plane is seen at a grazing angle — without this the road grid mip-blurs away
    return t;
  }, [isDark]);
  // r3f only auto-disposes on unmount, not on prop swap — day/night toggles
  // would otherwise stack orphaned GPU textures
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, -16]}>
      <planeGeometry args={[130, 64]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
}

function BlinkingBeacons({
  beacons,
  width,
  height,
  centerY,
  z,
  dim = false,
}: {
  beacons: Beacon[];
  width: number;
  height: number;
  centerY: number;
  z: number;
  /** Day mode: beacons still blink but faintly — full red squares look like glitches in sunlight */
  dim?: boolean;
}) {
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    mats.current.forEach((m, i) => {
      const on = Math.sin(t * 1.6 + i * 2.4) > 0.55;
      m.opacity = dim ? (on ? 0.4 : 0.03) : on ? 0.95 : 0.08;
    });
  });
  return (
    <>
      {beacons.map((b, i) => (
        <mesh
          key={i}
          position={[(b.u - 0.5) * width, centerY + (b.v - 0.5) * height + 0.25, z + 0.1]}
        >
          <planeGeometry args={dim ? [0.13, 0.13] : [0.22, 0.22]} />
          <meshBasicMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            color="#ff3344"
            transparent
            opacity={0.9}
            fog={false}
          />
        </mesh>
      ))}
    </>
  );
}

function AirTraffic({ isDark }: { isDark: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const lanes = useMemo(() => {
    const rand = mulberry32(isDark ? 11 : 12);
    return Array.from({ length: isDark ? 10 : 7 }, () => {
      const z = -8 - rand() * 18;
      // day craft catch the sun — pale hulls with the odd bright glint
      const dayCol = rand() < 0.3 ? '#fffdf4' : rand() < 0.5 ? '#e8e4d8' : '#c8cdd2';
      return {
        z,
        y: -1 + rand() * 7,
        x: -26 + rand() * 52,
        speed: (14 / -z) * (rand() < 0.5 ? 1 : -1) * (0.7 + rand() * 0.6),
        color: isDark ? (rand() < 0.5 ? '#ff4444' : '#ffeecc') : dayCol,
      };
    });
  }, [isDark]);

  useFrame((_, delta) => {
    group.current.children.forEach((child, i) => {
      child.position.x += lanes[i].speed * delta;
      if (child.position.x > 27) child.position.x = -27;
      if (child.position.x < -27) child.position.x = 27;
    });
  });

  return (
    <group ref={group}>
      {lanes.map((lane, i) => (
        <mesh key={i} position={[lane.x, lane.y, lane.z]}>
          <planeGeometry args={[0.5, 0.07]} />
          <meshBasicMaterial
            color={lane.color}
            transparent
            opacity={isDark ? 0.95 : 0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Day only: a translucent haze card slotted between two skyline layers. Dense at
 * street level, gone by rooftop — atmospheric perspective that pools low, the way
 * the photo's haze does, instead of the uniform milky tint global fog gives.
 */
function HazeBand({
  z,
  y,
  width,
  height,
  opacity,
}: {
  z: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}) {
  const tex = useMemo(
    () =>
      makeCityTexture(32, 128, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(235,225,203,0)');
        g.addColorStop(0.55, 'rgba(235,225,203,0.4)');
        g.addColorStop(1, 'rgba(235,225,203,0.92)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }),
    []
  );
  return (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} fog={false} />
    </mesh>
  );
}

/**
 * Ground traffic on the baked avenue below the window (z ≈ -5.8..-4.2): small
 * car bodies by day, dark hulls with headlight/taillight pairs at night. One
 * lane per direction, right-hand traffic.
 */
function StreetTraffic({ isDark }: { isDark: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const cars = useMemo(() => {
    const rand = mulberry32(isDark ? 31 : 32);
    const dayCols = ['#c8c2b4', '#8f979e', '#5f6a72', '#a84038', '#d8d8d8', '#3a4148'];
    return Array.from({ length: 8 }, () => {
      const dir = rand() < 0.5 ? 1 : -1;
      return {
        x: -14 + rand() * 28,
        z: dir > 0 ? -5.45 : -4.65,
        dir,
        speed: (1.4 + rand() * 1.8) * dir,
        color: dayCols[Math.floor(rand() * dayCols.length)],
      };
    });
  }, [isDark]);

  useFrame((_, delta) => {
    group.current.children.forEach((car, i) => {
      car.position.x += cars[i].speed * delta;
      if (car.position.x > 15) car.position.x = -15;
      if (car.position.x < -15) car.position.x = 15;
    });
  });

  return (
    <group ref={group}>
      {cars.map((c, i) => (
        <group key={i} position={[c.x, -2.93, c.z]}>
          <mesh>
            <boxGeometry args={[0.34, 0.11, 0.16]} />
            <meshBasicMaterial color={isDark ? '#0d0c14' : c.color} />
          </mesh>
          {isDark && (
            <>
              {/* headlights ahead, taillights behind */}
              <mesh position={[0.18 * c.dir, -0.01, 0]} rotation={[0, (Math.PI / 2) * c.dir, 0]}>
                <planeGeometry args={[0.14, 0.05]} />
                <meshBasicMaterial color="#fff6dc" fog={false} />
              </mesh>
              <mesh position={[-0.18 * c.dir, -0.01, 0]} rotation={[0, (-Math.PI / 2) * c.dir, 0]}>
                <planeGeometry args={[0.14, 0.05]} />
                <meshBasicMaterial color="#ff3b30" fog={false} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

/** Soft cumulus blob baked from overlapping radial gradients. */
function drawCloud(seed: number) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    const rand = mulberry32(seed);
    for (let i = 0; i < 22; i++) {
      const x = w * 0.5 + (rand() - 0.5) * w * 0.72;
      // puffs pile on top of a flatter base line, like real cumulus
      const y = h * 0.62 - rand() * rand() * h * 0.4;
      const r = h * (0.1 + rand() * 0.17);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,251,240,0.5)');
      g.addColorStop(0.7, 'rgba(250,242,226,0.22)');
      g.addColorStop(1, 'rgba(250,242,226,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

/** Day only: hazy clouds drifting slowly above the skyline. */
function Clouds() {
  const group = useRef<THREE.Group>(null!);
  const clouds = useMemo(() => {
    const rand = mulberry32(21);
    // high and flat — grazing the tower tops they read as sky haze;
    // any lower and the puffs look like smoke on the facades
    return Array.from({ length: 5 }, (_, i) => ({
      tex: makeCityTexture(256, 96, drawCloud(30 + i)),
      x: -28 + rand() * 56,
      y: 13 + rand() * 5,
      z: -30 - rand() * 5,
      w: 14 + rand() * 10,
      speed: 0.25 + rand() * 0.3,
      opacity: 0.3 + rand() * 0.18,
    }));
  }, []);

  useFrame((_, delta) => {
    group.current.children.forEach((child, i) => {
      child.position.x += clouds[i].speed * delta;
      if (child.position.x > 32) child.position.x = -32;
    });
  });

  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]}>
          <planeGeometry args={[c.w, c.w * 0.24]} />
          <meshBasicMaterial map={c.tex} transparent opacity={c.opacity} depthWrite={false} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

function drawBird(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(45,48,54,0.9)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.06, h * 0.72);
  ctx.quadraticCurveTo(w * 0.3, h * 0.18, w * 0.5, h * 0.6);
  ctx.quadraticCurveTo(w * 0.7, h * 0.18, w * 0.94, h * 0.72);
  ctx.stroke();
}

/** Day only: a small flock crossing the mid-distance, wings flapping. */
function Birds() {
  const group = useRef<THREE.Group>(null!);
  const tex = useMemo(() => makeCityTexture(64, 40, drawBird), []);
  const flock = useMemo(() => {
    const rand = mulberry32(55);
    return Array.from({ length: 7 }, () => ({
      // loose V-formation offsets
      dx: (rand() - 0.5) * 3.4,
      dy: (rand() - 0.5) * 1.1,
      phase: rand() * Math.PI * 2,
      flapSpeed: 7 + rand() * 4,
    }));
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    group.current.position.x += 1.1 * delta;
    if (group.current.position.x > 26) group.current.position.x = -26;
    group.current.children.forEach((bird, i) => {
      const b = flock[i];
      // wing flap = vertical squash of the chevron sprite, plus a gentle bob
      bird.scale.y = 0.35 + Math.abs(Math.sin(t * b.flapSpeed + b.phase)) * 0.75;
      bird.position.y = b.dy + Math.sin(t * 1.3 + b.phase) * 0.12;
    });
  });

  return (
    <group ref={group} position={[-26, 3.6, -13]}>
      {flock.map((b, i) => (
        <mesh key={i} position={[b.dx, b.dy, 0]}>
          <planeGeometry args={[0.34, 0.2]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Day only: warm glare where the photo's sunlight comes from — fakes the bloom the portal can't have. */
function SunGlare() {
  const tex = useMemo(
    () =>
      makeCityTexture(256, 256, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(255,244,214,0.85)');
        g.addColorStop(0.35, 'rgba(255,236,196,0.32)');
        g.addColorStop(1, 'rgba(255,236,196,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }),
    []
  );
  return (
    <mesh position={[-13, 10, -31]}>
      <planeGeometry args={[24, 24]} />
      <meshBasicMaterial
        map={tex}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fog={false}
        opacity={0.55}
      />
    </mesh>
  );
}

function NeonSign({ isDark }: { isDark: boolean }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const tex = useMemo(() => makeCityTexture(128, 512, drawNeonSign), []);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    const t = clock.getElapsedTime();
    // occasional dropout, like a dying tube
    const dropout = Math.sin(t * 13.7) * Math.sin(t * 3.1) < -0.92 ? 0.25 : 1;
    mat.current.opacity = isDark
      ? 0.95 * dropout * (0.92 + 0.08 * Math.sin(t * 31))
      : 0.35 * dropout; // LED screen stays on in daylight, just dimmer vs the sky
  });
  return (
    // rides just in front of the right tower's face, which sits at a different
    // depth per mode (night plane at -2.6, day box front at -1.3)
    <mesh position={[2.7, 0.4, isDark ? -2.5 : -1.2]}>
      <planeGeometry args={[0.5, 2.0]} />
      <meshBasicMaterial ref={mat} map={tex} transparent />
    </mesh>
  );
}

/** Concrete/glass facade of a near framing tower (the `map` — lit by scene lights). */
function drawTowerBody(night: boolean) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (night) {
      g.addColorStop(0, '#1a1730');
      g.addColorStop(1, '#070512');
    } else {
      // teal glass reflecting the sandy Tokyo sky at the top, darkening down —
      // kept luminous so the tower doesn't go dead next to the bright photo
      g.addColorStop(0, '#e0d6ba');
      g.addColorStop(0.25, '#adc2b6');
      g.addColorStop(0.6, '#7ea19a');
      g.addColorStop(1, '#5a7472');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // lit edge / shadowed face so the slab has volume even under flat light
    const side = ctx.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, night ? 'rgba(150,170,210,0.10)' : 'rgba(255,240,210,0.26)');
    side.addColorStop(0.4, 'rgba(0,0,0,0)');
    side.addColorStop(1, night ? 'rgba(0,0,0,0.35)' : 'rgba(15,25,30,0.32)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, w, h);

    // curtain-wall mullion grid
    ctx.strokeStyle = night ? 'rgba(0,0,0,0.4)' : 'rgba(20,35,40,0.3)';
    ctx.lineWidth = 1;
    const cw = 18;
    const ch = 24;
    for (let xx = 0; xx <= w; xx += cw) {
      ctx.beginPath();
      ctx.moveTo(xx, 0);
      ctx.lineTo(xx, h);
      ctx.stroke();
    }
    for (let yy = 0; yy <= h; yy += ch) {
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();
    }

    // day: per-panel reflection jitter — adjacent glass panes never mirror the
    // sky identically, which is what sells curtain wall as glass
    if (!night) {
      const rand = mulberry32(83);
      for (let xx = 0; xx < w; xx += cw) {
        for (let yy = 0; yy < h; yy += ch) {
          const j = rand();
          if (j < 0.3) {
            ctx.fillStyle = j < 0.14 ? 'rgba(240,235,215,0.12)' : 'rgba(10,25,30,0.12)';
            ctx.fillRect(xx + 1, yy + 1, cw - 2, ch - 2);
          }
        }
      }
      // a passing cloud reflected diagonally across the glass
      const refl = ctx.createLinearGradient(0, h * 0.3, w, h * 0.55);
      refl.addColorStop(0, 'rgba(245,240,224,0)');
      refl.addColorStop(0.5, 'rgba(245,240,224,0.16)');
      refl.addColorStop(1, 'rgba(245,240,224,0)');
      ctx.fillStyle = refl;
      ctx.fillRect(0, 0, w, h);
    }
  };
}

/** Glowing windows + ad panel of a near tower (the `emissiveMap` — self-lights on black). */
function drawTowerEmissive(night: boolean) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const rand = mulberry32(night ? 91 : 92);
    const palette = night
      ? ['#ffb347', '#ffcf7a', '#7fe9ff', '#ff5ad1']
      : ['#fff4d8', '#dff0ff'];
    const cw = 18;
    const ch = 24;
    const cols = Math.floor(w / cw);
    const rows = Math.floor(h / ch);
    for (let c = 0; c < cols; c++) {
      const colBias = 0.2 + rand() * 0.9;
      for (let r = 0; r < rows; r++) {
        const lit = night ? rand() < 0.5 * colBias : rand() < 0.1;
        if (!lit) continue;
        const col = palette[Math.floor(rand() * palette.length)];
        ctx.shadowColor = col;
        ctx.shadowBlur = night ? 8 : 0;
        ctx.globalAlpha = night ? 0.7 + rand() * 0.3 : 0.4;
        ctx.fillStyle = col;
        ctx.fillRect(c * cw + 3, r * ch + 4, cw - 7, ch - 9);
      }
      // day: hot sun glints on the sun-facing panes — they genuinely emit,
      // so they flash against the glass like real reflections
      if (!night && c < cols * 0.4 && rand() < 0.3) {
        const r = Math.floor(rand() * rows);
        ctx.shadowColor = '#fff6dd';
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#fff9e8';
        ctx.fillRect(c * cw + 3, r * ch + 4, cw - 7, ch - 9);
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // rooftop ad panel (day: dimmer, so it reads as an LED screen fighting sunlight)
    const grad = ctx.createLinearGradient(0, h * 0.12, w, h * 0.19);
    grad.addColorStop(0, '#ff2fb4');
    grad.addColorStop(1, '#2fd4ff');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#ff2fb4';
    ctx.shadowBlur = night ? 18 : 4;
    ctx.globalAlpha = night ? 0.9 : 0.4;
    ctx.fillRect(w * 0.2, h * 0.12, w * 0.6, h * 0.07);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  };
}

/**
 * The two close framing towers — the strongest parallax cue, so they get true
 * lighting: a standardMaterial facade lit by the scene's neon point lights, plus
 * an emissive window map so the windows genuinely glow.
 */
function NearTowers({ isDark }: { isDark: boolean }) {
  const body = useMemo(() => makeCityTexture(256, 1024, drawTowerBody(isDark)), [isDark]);
  const emis = useMemo(() => makeCityTexture(256, 1024, drawTowerEmissive(isDark)), [isDark]);
  useEffect(
    () => () => {
      body.dispose();
      emis.dispose();
    },
    [body, emis]
  );
  return (
    <>
      {/* day gets real boxes (front face where the night plane was) so the viewer
          sees an actual receding side wall instead of a paper cutout. The avenue
          (z -5.8..-4.2) runs between them: right tower on the window side of the
          road, left tower across the street. */}
      <mesh position={[3.55, 1, isDark ? -2.6 : -2.4]}>
        {isDark ? <planeGeometry args={[2.6, 17]} /> : <boxGeometry args={[2.6, 17, 2.2]} />}
        <meshStandardMaterial
          map={body}
          emissiveMap={emis}
          emissive="#ffffff"
          emissiveIntensity={isDark ? 1.4 : 0.6}
          roughness={0.6}
          metalness={0.25}
        />
      </mesh>
      {/* mirrored so the two towers don't read as identical */}
      <mesh position={[-4.6, 0.4, isDark ? -6.2 : -7.2]} scale={[-1, 1, 1]}>
        {isDark ? <planeGeometry args={[3.8, 16]} /> : <boxGeometry args={[3.8, 16, 2.6]} />}
        <meshStandardMaterial
          map={body}
          emissiveMap={emis}
          emissive="#ffffff"
          emissiveIntensity={isDark ? 1.4 : 0.6}
          roughness={0.6}
          metalness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

function CityScene({ isDark }: { isDark: boolean }) {
  const layers = useMemo(() => {
    const far = drawSkyline(2048, 512, {
      seed: 1,
      night: isDark,
      body: isDark ? '#0a0618' : '#9aa3a8',
      hazeTop: '#ddd2b8', // warm haze to match the Tokyo backdrop
      maxH: 0.7,
      litDensity: isDark ? 0.34 : 0.1,
      dayHazeMix: 0.55,
    });
    const mid = drawSkyline(1024, 512, {
      seed: 2,
      night: isDark,
      body: isDark ? '#0d0a1e' : '#6d7479',
      hazeTop: '#d2c6aa',
      maxH: 0.62,
      litDensity: isDark ? 0.3 : 0.12,
      dayHazeMix: 0.35,
    });
    // day only: dense low-rise sprawl between mid and far, like the photo's
    // carpet of small buildings — fills what used to be a milky fog gap
    const sprawl = isDark
      ? null
      : drawSkyline(2048, 384, {
          seed: 7,
          night: false,
          body: '#8a8d88',
          hazeTop: '#d8ccb0',
          maxH: 0.3,
          litDensity: 0.08,
          dayHazeMix: 0.45,
        });
    const near = drawSkyline(2048, 512, {
      seed: 5,
      night: isDark,
      body: isDark ? '#070512' : '#4a4f53',
      hazeTop: '#c2b69c',
      maxH: 0.64,
      litDensity: isDark ? 0.32 : 0.14,
      dayHazeMix: 0.15,
    });
    // side wings: angled rows continuing the street canyon past the near row's
    // ends, so grazing views through the window edges don't hit empty ground
    const wing = drawSkyline(1024, 512, {
      seed: 9,
      night: isDark,
      body: isDark ? '#070512' : '#4a4f53',
      hazeTop: '#c2b69c',
      maxH: 0.6,
      litDensity: isDark ? 0.32 : 0.14,
      dayHazeMix: 0.18,
    });
    return { far, mid, sprawl, near, wing };
  }, [isDark]);

  useEffect(
    () => () => {
      layers.far.texture.dispose();
      layers.mid.texture.dispose();
      layers.sprawl?.texture.dispose();
      layers.near.texture.dispose();
      layers.wing.texture.dispose();
    },
    [layers]
  );

  return (
    <>
      <color attach="background" args={[isDark ? '#050310' : '#e3d8c0']} />
      {/* day: global fog is nearly off — depth haze comes from the HazeBand cards
          between layers instead, so it pools low rather than tinting whole planes */}
      <fog attach="fog" args={isDark ? ['#0b0618', 6, 42] : ['#e6dcc4', 24, 85]} />

      {/* lights only touch the standardMaterial near towers; baked skylines ignore them */}
      <ambientLight intensity={isDark ? 0.25 : 1.05} />
      {isDark ? (
        <>
          <pointLight position={[2.5, 1, -1.5]} color="#ff2fb4" intensity={6} distance={14} decay={1.5} />
          <pointLight position={[-3, 0.5, -2.5]} color="#2fd4ff" intensity={5} distance={16} decay={1.5} />
        </>
      ) : (
        <directionalLight position={[4, 8, 5]} intensity={1.4} color="#fff0db" />
      )}

      <Suspense fallback={null}>
        <Backdrop isDark={isDark} />
      </Suspense>

      <Ground isDark={isDark} />

      {!isDark && <SunGlare />}
      {!isDark && <Clouds />}

      {/* far skyline */}
      <mesh position={[0, -3, -22]}>
        <planeGeometry args={[60, 15]} />
        <meshBasicMaterial map={layers.far.texture} transparent />
      </mesh>
      <BlinkingBeacons beacons={layers.far.beacons} width={60} height={15} centerY={-3} z={-22} dim={!isDark} />

      {/* haze pools in the air gaps between layers, densest toward the horizon */}
      {!isDark && <HazeBand z={-18} y={-0.8} width={64} height={7.5} opacity={0.5} />}

      {/* day-only low-rise sprawl carpet between far and mid */}
      {layers.sprawl && (
        <mesh position={[1, -3.4, -14]}>
          <planeGeometry args={[44, 8]} />
          <meshBasicMaterial map={layers.sprawl.texture} transparent />
        </mesh>
      )}

      {!isDark && <HazeBand z={-12.2} y={-1.6} width={50} height={5} opacity={0.42} />}

      {/* mid skyline */}
      <mesh position={[-2, -2.5, -10]}>
        <planeGeometry args={[30, 12]} />
        <meshBasicMaterial map={layers.mid.texture} transparent />
      </mesh>
      <BlinkingBeacons beacons={layers.mid.beacons} width={30} height={12} centerY={-2.5} z={-10} dim={!isDark} />

      {!isDark && <HazeBand z={-8.4} y={-2.4} width={36} height={3.6} opacity={0.3} />}

      {!isDark && <Birds />}

      {/* dense foreground row so buildings rise from the street instead of floating */}
      <mesh position={[0, -3.6, -6.5]}>
        <planeGeometry args={[28, 12]} />
        <meshBasicMaterial map={layers.near.texture} transparent />
      </mesh>
      <BlinkingBeacons beacons={layers.near.beacons} width={28} height={12} centerY={-3.6} z={-6.5} dim={!isDark} />

      {/* wings continue the street wall past the near row's ends, staying on the
          far side of the avenue (rear edge -5.8) — only a whisper of rotation,
          so their footprint never crosses onto the road */}
      <mesh position={[-20, -3.6, -6.8]} rotation={[0, 0.12, 0]}>
        <planeGeometry args={[14, 12]} />
        <meshBasicMaterial map={layers.wing.texture} transparent />
      </mesh>
      <mesh position={[20, -3.6, -6.8]} rotation={[0, -0.12, 0]}>
        <planeGeometry args={[14, 12]} />
        <meshBasicMaterial map={layers.wing.texture} transparent />
      </mesh>

      <StreetTraffic isDark={isDark} />

      {/* near towers framing the view — strongest parallax cue */}
      <Suspense fallback={null}>
        <NearTowers isDark={isDark} />
      </Suspense>

      <NeonSign isDark={isDark} />
      <AirTraffic isDark={isDark} />
    </>
  );
}

export function WindowView({ isDark = false }: WindowViewProps) {
  return (
    <MeshPortalMaterial>
      <CityScene isDark={isDark} />
    </MeshPortalMaterial>
  );
}
