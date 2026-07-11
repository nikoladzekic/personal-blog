import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Room, DESK_TOP_Y, DESK_Z } from './Room';
import { Player } from './Player';
import { HUD } from './HUD';
import { Effects } from './Effects';
import type { PostEntry } from './PostModal';
import { ArcadeCabinet } from './ArcadeCabinet';
import { NetrunnerGame } from './NetrunnerGame';
import { VMDesktop } from './VMDesktop';
import { LoadingScreen } from './LoadingScreen';
import { SceneErrorBoundary } from './SceneErrorBoundary';
import { SpatialAudio } from './SpatialAudio';
import { setMuted } from './sounds';

interface WorldProps {
  blogPosts: PostEntry[];
  researchPosts: PostEntry[];
}

/** Everything the player can press E on: the arcade cabinet on the right
 *  wall and the desk PC (opens the VM simulator, which holds the diary and
 *  research log as folders). */
const INTERACTABLES: { id: string; position: [number, number, number] }[] = [
  { id: 'arcade', position: [4.2, 1.2, 1.4] as [number, number, number] },
  { id: 'pc', position: [0, DESK_TOP_Y + 0.5, DESK_Z] as [number, number, number] },
];

type ModalSection = 'arcade' | 'pc';

const ZONE_LABELS: Record<string, string> = {
  arcade: 'ARCADE',
  pc: 'WORKSTATION',
};

/** HUD prompt per interactable: "[E] {action}" */
const INTERACT_ACTIONS: Record<string, string> = {
  arcade: 'PLAY NETRUNNER',
  pc: 'USE WORKSTATION',
};

/**
 * Nothing that casts a shadow ever moves (the player has no body), so
 * re-rendering the shadow map every frame is pure waste. Let it settle for a
 * few frames after mount/mode-switch, then freeze it.
 */
function FrozenShadows({ isDark }: { isDark: boolean }) {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  useEffect(() => {
    frames.current = 0;
    gl.shadowMap.autoUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl, isDark]);
  useFrame(() => {
    if (frames.current <= 30 && frames.current++ === 30) {
      gl.shadowMap.autoUpdate = false;
    }
  });
  return null;
}

function WorldScene({
  onNearTarget,
  isDark,
}: {
  onNearTarget: (id: string | null) => void;
  isDark: boolean;
}) {
  return (
    <>
      <Environment preset="apartment" environmentIntensity={isDark ? 0.15 : 0.6} />
      <Room isDark={isDark} />
      <ArcadeCabinet position={[4.45, 0, 1.4]} rotation={[0, Math.PI, 0]} isDark={isDark} />
      <Player onNearTerminal={onNearTarget} terminalPositions={INTERACTABLES} />
      <SpatialAudio />
      <FrozenShadows isDark={isDark} />
      <Effects isDark={isDark} />
    </>
  );
}

export function World({ blogPosts, researchPosts }: WorldProps) {
  const [nearTarget, setNearTarget] = useState<string | null>(null);
  const [modalSection, setModalSection] = useState<ModalSection | null>(null);
  const [locked, setLocked] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const toggleSound = useCallback(() => {
    setSoundOn((v) => {
      setMuted(v);
      return !v;
    });
  }, []);

  const handleNearTarget = useCallback((id: string | null) => {
    setNearTarget(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && nearTarget && modalSection === null) {
        setModalSection(nearTarget as ModalSection);
        document.exitPointerLock?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nearTarget, modalSection]);

  useEffect(() => {
    const handler = () => setLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', handler);
    return () => document.removeEventListener('pointerlockchange', handler);
  }, []);

  const closeModal = useCallback(() => {
    setModalSection(null);
  }, []);

  const currentZone = nearTarget
    ? ZONE_LABELS[nearTarget] ?? nearTarget.toUpperCase()
    : 'IT ROOM';

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      <a
        href="/"
        style={{
          position: 'absolute',
          top: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '0.4rem',
          color: '#9a8d92',
          textDecoration: 'none',
          letterSpacing: '0.1em',
          zIndex: 30,
          pointerEvents: 'all',
          transition: 'color 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#e63950')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#9a8d92')}
      >
        ← EXIT TOUR
      </a>

      <button
        type="button"
        onClick={() => setIsDark((v) => !v)}
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '0.4rem',
          color: isDark ? '#f2a33c' : '#b3a8ab',
          background: 'rgba(0,0,0,0.65)',
          border: `1px solid ${isDark ? '#f2a33c' : '#e63950'}`,
          padding: '0.5rem 0.75rem',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          zIndex: 30,
          pointerEvents: 'all',
        }}
      >
        {isDark ? 'DAY MODE' : 'NIGHT MODE'}
      </button>

      <button
        type="button"
        onClick={toggleSound}
        style={{
          position: 'absolute',
          top: '4.2rem',
          right: '1.5rem',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '0.4rem',
          color: soundOn ? '#b3a8ab' : '#8f6b6b',
          background: 'rgba(0,0,0,0.65)',
          border: `1px solid ${soundOn ? '#e63950' : '#ff4444'}`,
          padding: '0.5rem 0.75rem',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          zIndex: 30,
          pointerEvents: 'all',
        }}
      >
        {soundOn ? 'SOUND: ON' : 'SOUND: OFF'}
      </button>

      <SceneErrorBoundary>
        <Canvas
          // imageRendering is inherited by the inner <canvas>: the half-res
          // buffer upscales nearest-neighbor into the same 2px blocks the old
          // Pixelation pass produced, for a quarter of the fragment work
          style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
          shadows={isDark ? false : 'soft'}
          camera={{ fov: 70, near: 0.1, far: 100 }}
          // antialias off: the EffectComposer renders via a non-MSAA buffer, so
          // canvas MSAA costs memory/fill without smoothing a single edge
          gl={{
            antialias: false,
            stencil: false,
            powerPreference: 'high-performance',
            toneMappingExposure: isDark ? 1.0 : 1.35,
          }}
          // half of a CSS pixel per buffer pixel = the retro 2px-block look,
          // rendered instead of post-processed
          dpr={0.5}
        >
          <color attach="background" args={[isDark ? '#050510' : '#8fc7f2']} />
          <fog attach="fog" args={[isDark ? '#08081a' : '#c4ddf1', 14, 26]} />
          <Suspense fallback={null}>
            <WorldScene onNearTarget={handleNearTarget} isDark={isDark} />
          </Suspense>
        </Canvas>
      </SceneErrorBoundary>

      <LoadingScreen />

      <HUD
        nearTerminal={modalSection === null ? nearTarget : null}
        zone={currentZone}
        locked={locked}
        interactLabel={nearTarget ? INTERACT_ACTIONS[nearTarget] : undefined}
      />

      {modalSection === 'arcade' && <NetrunnerGame onClose={closeModal} />}

      {modalSection === 'pc' && (
        <VMDesktop blogPosts={blogPosts} researchPosts={researchPosts} onClose={closeModal} />
      )}
    </div>
  );
}
