import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Room, DESK_TOP_Y, DESK_Z } from './Room';
import { Player } from './Player';
import { Book } from './Book';
import { HUD } from './HUD';
import { Effects } from './Effects';
import { PostModal, type PostEntry } from './PostModal';
import { LoadingScreen } from './LoadingScreen';
import { SceneErrorBoundary } from './SceneErrorBoundary';
import { SpatialAudio } from './SpatialAudio';
import { setMuted } from './sounds';
import type { BookTextureVariant } from './usePixelTexture';

interface WorldProps {
  blogPosts: PostEntry[];
  researchPosts: PostEntry[];
}

const BOOK_Y = DESK_TOP_Y + 0.04;
const BOOK_Z = DESK_Z + 0.18;

const BOOKS: {
  id: string;
  position: [number, number, number];
  label: string;
  variant: BookTextureVariant;
}[] = [
  {
    id: 'blog',
    position: [-1, BOOK_Y, BOOK_Z],
    label: 'PERSONAL DIARY',
    variant: 'diary',
  },
  {
    id: 'research',
    position: [0.52, BOOK_Y, BOOK_Z],
    label: 'RESEARCH LOG',
    variant: 'research',
  },
];

const ZONE_LABELS: Record<string, string> = {
  blog: 'PERSONAL DIARY',
  research: 'RESEARCH LOG',
};

/**
 * Nothing that casts a shadow ever moves (the player has no body, books only
 * pulse emissive), so re-rendering the shadow map every frame is pure waste.
 * Let it settle for a few frames after mount/mode-switch, then freeze it.
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
  onNearBook,
  nearBook,
  isDark,
}: {
  onNearBook: (id: string | null) => void;
  nearBook: string | null;
  isDark: boolean;
}) {
  return (
    <>
      <Environment preset="apartment" environmentIntensity={isDark ? 0.15 : 0.6} />
      <Room isDark={isDark} />
      {BOOKS.map((book) => (
        <Book
          key={book.id}
          id={book.id}
          position={book.position}
          label={book.label}
          variant={book.variant}
          isNear={nearBook === book.id}
          isDark={isDark}
        />
      ))}
      <Player onNearTerminal={onNearBook} terminalPositions={BOOKS} />
      <SpatialAudio />
      <FrozenShadows isDark={isDark} />
      <Effects isDark={isDark} />
    </>
  );
}

export function World({ blogPosts, researchPosts }: WorldProps) {
  const [nearBook, setNearBook] = useState<string | null>(null);
  const [modalSection, setModalSection] = useState<'blog' | 'research' | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostEntry | null>(null);
  const [locked, setLocked] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const toggleSound = useCallback(() => {
    setSoundOn((v) => {
      setMuted(v);
      return !v;
    });
  }, []);

  const handleNearBook = useCallback((id: string | null) => {
    setNearBook(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && nearBook && modalSection === null) {
        setModalSection(nearBook as 'blog' | 'research');
        document.exitPointerLock?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nearBook, modalSection]);

  useEffect(() => {
    const handler = () => setLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', handler);
    return () => document.removeEventListener('pointerlockchange', handler);
  }, []);

  const closeModal = useCallback(() => {
    setModalSection(null);
    setSelectedPost(null);
  }, []);

  const openFull = useCallback(
    (slug: string) => {
      const section = modalSection;
      window.location.href = `/${section}/${slug}`;
    },
    [modalSection]
  );

  const posts = modalSection === 'blog' ? blogPosts : researchPosts;
  const currentZone = nearBook ? ZONE_LABELS[nearBook] ?? nearBook.toUpperCase() : 'IT ROOM';

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
            <WorldScene onNearBook={handleNearBook} nearBook={nearBook} isDark={isDark} />
          </Suspense>
        </Canvas>
      </SceneErrorBoundary>

      <LoadingScreen />

      <HUD
        nearTerminal={modalSection === null ? nearBook : null}
        zone={currentZone}
        locked={locked}
        interactLabel={nearBook ? ZONE_LABELS[nearBook] : undefined}
      />

      {modalSection && (
        <PostModal
          section={modalSection}
          posts={posts}
          selected={selectedPost}
          onSelect={setSelectedPost}
          onClose={closeModal}
          onOpenFull={openFull}
        />
      )}
    </div>
  );
}
