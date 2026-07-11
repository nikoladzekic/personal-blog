import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
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
  getScoreTable,
} from './netrunnerShared';

/**
 * Attract-mode loop rendered to a canvas texture on the arcade cabinet's
 * GameScreen_Plane mesh: title + INSERT COIN → tiny gameplay demo → high
 * scores (including the player's persisted best), looping.
 */

const W = 512;
const H = 512;
const LOOP = 24;
const FPS = 15;

const STARS = makeStars(50, W, H);

function drawFrame(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = '#04062a';
  ctx.fillRect(0, 0, W, H);

  for (const s of STARS) {
    const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
    ctx.fillStyle = `rgba(180,200,255,${(0.55 * tw).toFixed(2)})`;
    ctx.fillRect((s.x + t * 6) % W, s.y, 2, 2);
  }

  // chunky border
  ctx.strokeStyle = '#3a44cc';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, W - 12, H - 12);
  ctx.strokeStyle = '#7a86ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(13, 13, W - 26, H - 26);

  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  // title, always on top
  const bob = Math.sin(t * 1.8) * 3;
  drawSprite(ctx, SKULL, 44, 40 + bob, 4, SKULL_PALETTE);
  drawSprite(ctx, SKULL, W - 44 - 16 * 4, 40 - bob, 4, SKULL_PALETTE);

  const grad = ctx.createLinearGradient(0, 46, 0, 46 + 34);
  grad.addColorStop(0, '#ffe14a');
  grad.addColorStop(0.55, '#ffb01e');
  grad.addColorStop(1, '#ff6a1a');
  ctx.font = `30px ${PIXEL}`;
  ctx.fillStyle = '#1a0b4a';
  ctx.fillText('NETRUNNER', W / 2 + 3, 49);
  ctx.fillStyle = grad;
  ctx.fillText('NETRUNNER', W / 2, 46);

  ctx.font = `10px ${PIXEL}`;
  ctx.fillStyle = '#62e8ff';
  ctx.fillText('SHADOW OF THE KERNEL', W / 2, 92);

  const phase = t % LOOP;
  if (phase < 12) {
    // ------- gameplay demo: runner on a neon floor, obstacles scroll past -------
    const floorY = 330;
    ctx.strokeStyle = '#3a44cc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, floorY);
    ctx.lineTo(W - 24, floorY);
    ctx.stroke();
    // scrolling floor ticks
    for (let x = -((t * 160) % 40); x < W - 48; x += 40) {
      if (x < 0) continue;
      ctx.fillStyle = '#2a3488';
      ctx.fillRect(24 + x, floorY + 6, 18, 3);
    }

    // obstacle: firewall block scrolling left
    const obX = W - ((t * 160) % (W + 80)) - 40;
    if (obX > 0 && obX < W - 60) {
      ctx.fillStyle = '#ff3030';
      ctx.fillRect(obX, floorY - 36, 18, 36);
      ctx.fillStyle = '#ffb01e';
      for (let i = 0; i < 3; i++) ctx.fillRect(obX + 3, floorY - 30 + i * 11, 12, 4);
    }
    // drone
    const drX = W - ((t * 160 + 300) % (W + 80)) - 40;
    if (drX > 0 && drX < W - 60) {
      drawSprite(ctx, DRONE, drX, floorY - 110 + Math.sin(t * 5) * 4, 4, DRONE_PALETTE);
    }

    // runner: hop when the firewall is near
    const runnerX = 96;
    const gap = obX - runnerX;
    const jumping = gap > -20 && gap < 70;
    const jumpY = jumping ? -Math.sin(((gap + 20) / 90) * Math.PI) * 58 : 0;
    const frame = jumping ? 0 : Math.floor(t * 10) % 2;
    drawSprite(ctx, RUNNER_FRAMES[frame], runnerX, floorY - 48 + jumpY, 6, RUNNER_PALETTE);

    // demo score ticker
    ctx.font = `10px ${PIXEL}`;
    ctx.fillStyle = '#e8e8f8';
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.floor(phase * 137)).padStart(6, '0'), W - 30, 130);
    ctx.textAlign = 'center';

    if (Math.floor(t * 1.6) % 2 === 0) {
      ctx.font = `13px ${PIXEL}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('INSERT COIN', W / 2, 400);
    }
    ctx.font = `9px ${PIXEL}`;
    ctx.fillStyle = '#8a8aa8';
    ctx.fillText('PRESS [E] TO JACK IN', W / 2, 432);
  } else {
    // ------------------------------ high scores ------------------------------
    ctx.font = `13px ${PIXEL}`;
    ctx.fillStyle = '#ff5ad2';
    ctx.fillText('TOP NETRUNNERS', W / 2, 160);

    const rowColors = ['#ffe14a', '#ffb01e', '#62e8ff', '#7aff7a', '#c8c8e8'];
    ctx.font = `11px ${PIXEL}`;
    getScoreTable().forEach(([rank, name, score], i) => {
      ctx.fillStyle = name === 'YOU' ? '#39ff14' : rowColors[i];
      ctx.fillText(`${rank}  ${name} ...... ${String(score).padStart(6, '0')}`, W / 2, 200 + i * 30);
    });

    if (Math.floor(t * 1.6) % 2 === 0) {
      ctx.font = `13px ${PIXEL}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PRESS [E] TO PLAY', W / 2, 400);
    }
  }

  ctx.font = `9px ${PIXEL}`;
  ctx.fillStyle = '#8a8aa8';
  ctx.fillText('(C) 1992 DZEKIC SOFT', W / 2, H - 40);
  ctx.textAlign = 'left';
}

/**
 * Swaps the cabinet's screen-mesh material for the animated attract-mode
 * canvas texture (same technique as MonitorScreen on the desk monitor).
 */
export function ArcadeScreen({ mesh }: { mesh: THREE.Mesh }) {
  const { ctx, texture, material, overlay } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const texture = new THREE.CanvasTexture(canvas);
    // the GLB's UVs follow the glTF convention (V origin at top), so the
    // default canvas flip renders upside-down on this mesh
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    return { ctx, texture, material, overlay: makeCrtOverlay(W, H) };
  }, []);

  useEffect(() => {
    const previous = mesh.material;
    mesh.material = material;
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

    drawFrame(ctx, now);
    ctx.drawImage(overlay, 0, 0);
    texture.needsUpdate = true;
  });

  return null;
}
