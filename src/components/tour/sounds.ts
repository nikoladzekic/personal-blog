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

/**
 * One-shot chiptune blip routed through the listener's master gain so the
 * global mute toggle applies. Used by the NETRUNNER game overlay.
 */
export function playBlip(
  freq = 440,
  duration = 0.08,
  type: OscillatorType = 'square',
  volume = 0.05,
  slideTo?: number
) {
  const l = getListener();
  const ctx = l.context;
  if (ctx.state !== 'running') return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
  }
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(l.getInput());
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

/* ------------------------------- game music -------------------------------- */

export interface GameMusic {
  start(): void;
  stop(): void;
  /** 0..1 — maps to tempo (higher game speed → faster riff). */
  setIntensity(v: number): void;
  /** Flatline sting: kill the loop and slur a detuned power-down. */
  death(): void;
}

const A1 = 55; // Hz
const semi = (n: number) => A1 * Math.pow(2, n / 12);

// 16-step (sixteenth-note) patterns in A-minor pentatonic; null = rest.
// prettier-ignore
const BASS_PAT: (number | null)[] = [ 0, null, 0, 12, 3, null, 3, null, 5, null, 5, 12, 3, null, 7, null];
// prettier-ignore
const ARP_PAT:  (number | null)[] = [24, 19, 15, 19, 27, 22, 19, 22, 29, 24, 19, 24, 27, 22, 19, 15];

/**
 * Lookahead sequencer for the NETRUNNER overlay. Schedules bass + arp voices a
 * little ahead of the clock (the standard Web Audio pattern) so tempo can be
 * nudged every frame without glitching. All voices route through the listener's
 * master gain, so the tour's mute toggle applies.
 */
export function createGameMusic(): GameMusic {
  const l = getListener();
  const ctx = l.context as AudioContext;
  const out = l.getInput();

  let timer: number | null = null;
  let step = 0;
  let nextTime = 0;
  let intensity = 0;
  let dead = false;

  const voice = (
    freq: number,
    time: number,
    dur: number,
    type: OscillatorType,
    vol: number
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  };

  const stepDur = () => 60 / (100 + intensity * 76) / 4; // sixteenths, 100–176 BPM

  const schedule = () => {
    if (dead) return;
    while (nextTime < ctx.currentTime + 0.12) {
      const dur = stepDur();
      const s = step % 16;
      const b = BASS_PAT[s];
      if (b != null) voice(semi(b), nextTime, dur * 1.7, 'square', 0.05);
      const a = ARP_PAT[s];
      if (a != null) voice(semi(a), nextTime, dur * 0.85, 'square', 0.022);
      // driving off-beat hat
      if (s % 2 === 1) voice(semi(48), nextTime, dur * 0.3, 'triangle', 0.012);
      nextTime += dur;
      step++;
    }
  };

  return {
    start() {
      if (timer != null) return;
      if (ctx.state === 'suspended') void ctx.resume();
      dead = false;
      step = 0;
      nextTime = ctx.currentTime + 0.06;
      timer = window.setInterval(schedule, 25);
    },
    stop() {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
      dead = true;
    },
    setIntensity(v: number) {
      intensity = Math.max(0, Math.min(1, v));
    },
    death() {
      dead = true;
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(semi(7), now);
      osc.frequency.exponentialRampToValueAtTime(semi(-17), now + 0.85);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.95);
    },
  };
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
