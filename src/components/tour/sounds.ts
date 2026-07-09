import * as THREE from 'three';

/**
 * Procedural audio for the tour — no asset files, every buffer is synthesized.
 * All loops are built from sines whose frequencies are integer multiples of
 * 1/duration, so they repeat seamlessly. Band noise uses random-phase sines
 * snapped to the same grid for the same reason.
 */

let listener: THREE.AudioListener | null = null;
let muted = false;

export function getListener(): THREE.AudioListener {
  if (!listener) {
    listener = new THREE.AudioListener();
    listener.setMasterVolume(muted ? 0 : 1);
  }
  return listener;
}

export function setMuted(value: boolean) {
  muted = value;
  listener?.setMasterVolume(muted ? 0 : 1);
}

/** Resume the AudioContext after a user gesture (pointer lock click). */
export function resumeAudio() {
  const ctx = getListener().context;
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
}

function snapFreq(freq: number, duration: number): number {
  return Math.max(1, Math.round(freq * duration)) / duration;
}

interface BandNoise {
  lo: number;
  hi: number;
  count: number;
  gain: number;
  /** Spectral slope: amplitude ∝ (lo/f)^slope */
  slope?: number;
}

function createLoopBuffer(
  ctx: AudioContext | OfflineAudioContext,
  duration: number,
  tones: { freq: number; gain: number }[],
  noise?: BandNoise,
  tremolo?: { freq: number; depth: number }
): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);

  const parts: { w: number; phase: number; amp: number }[] = tones.map((t) => ({
    w: 2 * Math.PI * snapFreq(t.freq, duration),
    phase: 0,
    amp: t.gain,
  }));

  if (noise) {
    for (let i = 0; i < noise.count; i++) {
      const f = snapFreq(noise.lo + Math.random() * (noise.hi - noise.lo), duration);
      const falloff = Math.pow(noise.lo / f, noise.slope ?? 1);
      parts.push({
        w: 2 * Math.PI * f,
        phase: Math.random() * 2 * Math.PI,
        amp: (noise.gain / Math.sqrt(noise.count)) * falloff,
      });
    }
  }

  const tremW = tremolo ? 2 * Math.PI * snapFreq(tremolo.freq, duration) : 0;

  for (let i = 0; i < length; i++) {
    const t = i / rate;
    let v = 0;
    for (const p of parts) {
      v += Math.sin(p.w * t + p.phase) * p.amp;
    }
    if (tremolo) {
      v *= 1 - tremolo.depth * 0.5 * (1 + Math.sin(tremW * t));
    }
    data[i] = v;
  }

  return buffer;
}

const bufferCache = new Map<string, AudioBuffer>();

function cached(key: string, make: () => AudioBuffer): AudioBuffer {
  let buf = bufferCache.get(key);
  if (!buf) {
    buf = make();
    bufferCache.set(key, buf);
  }
  return buf;
}

/** PC tower: low fan hum + air whoosh. */
export function getPcHumBuffer(ctx: AudioContext): AudioBuffer {
  return cached('pc-hum', () =>
    createLoopBuffer(
      ctx,
      2,
      [
        { freq: 85, gain: 0.4 },
        { freq: 170, gain: 0.16 },
        { freq: 255, gain: 0.07 },
      ],
      { lo: 250, hi: 2200, count: 120, gain: 0.5, slope: 0.8 }
    )
  );
}

/** Soldering station: mains-transformer buzz with a slow wobble. */
export function getBenchBuzzBuffer(ctx: AudioContext): AudioBuffer {
  return cached('bench-buzz', () =>
    createLoopBuffer(
      ctx,
      2,
      [
        { freq: 50, gain: 0.32 },
        { freq: 100, gain: 0.22 },
        { freq: 150, gain: 0.1 },
        { freq: 300, gain: 0.04 },
      ],
      undefined,
      { freq: 1.5, depth: 0.35 }
    )
  );
}

/** Window: low wind/city rumble. */
export function getWindowAmbienceBuffer(ctx: AudioContext): AudioBuffer {
  return cached('window-ambience', () =>
    createLoopBuffer(
      ctx,
      4,
      [],
      { lo: 40, hi: 500, count: 160, gain: 0.9, slope: 1.4 },
      { freq: 0.25, depth: 0.5 }
    )
  );
}

/** Short footstep thump: decaying low sine + damped noise tap. */
function getFootstepBuffer(ctx: AudioContext): AudioBuffer {
  return cached('footstep', () => {
    const rate = ctx.sampleRate;
    const duration = 0.16;
    const length = Math.floor(rate * duration);
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const env = Math.exp(-t * 34);
      lp += 0.18 * (Math.random() * 2 - 1 - lp);
      data[i] = (Math.sin(2 * Math.PI * 58 * t) * 0.7 + lp * 1.6) * env;
    }
    return buffer;
  });
}

let footstepAudio: THREE.Audio | null = null;

export function playFootstep() {
  const l = getListener();
  if (l.context.state !== 'running') return;
  if (!footstepAudio) {
    footstepAudio = new THREE.Audio(l);
    footstepAudio.setBuffer(getFootstepBuffer(l.context as AudioContext));
    footstepAudio.setVolume(0.16);
  }
  if (footstepAudio.isPlaying) footstepAudio.stop();
  footstepAudio.setPlaybackRate(0.9 + Math.random() * 0.25);
  footstepAudio.play();
}
