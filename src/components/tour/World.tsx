import { Suspense, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Room, DESK_TOP_Y, DESK_Z } from './Room';
import { Player } from './Player';
import { Book } from './Book';
import { HUD } from './HUD';
import { Effects } from './Effects';
import { PostModal, type PostEntry } from './PostModal';
import { LoadingScreen } from './LoadingScreen';
import { SceneErrorBoundary } from './SceneErrorBoundary';
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
          color: '#3d5c3d',
          textDecoration: 'none',
          letterSpacing: '0.1em',
          zIndex: 30,
          pointerEvents: 'all',
          transition: 'color 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#39ff14')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#3d5c3d')}
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
          color: isDark ? '#ffb800' : '#6b8f6b',
          background: 'rgba(0,0,0,0.65)',
          border: `1px solid ${isDark ? '#ffb800' : '#39ff14'}`,
          padding: '0.5rem 0.75rem',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          zIndex: 30,
          pointerEvents: 'all',
        }}
      >
        {isDark ? 'DAY MODE' : 'NIGHT MODE'}
      </button>

      <SceneErrorBoundary>
        <Canvas
          style={{ width: '100%', height: '100%' }}
          shadows={isDark ? false : 'soft'}
          camera={{ fov: 70, near: 0.1, far: 100 }}
          gl={{ antialias: true, toneMappingExposure: isDark ? 1.0 : 1.35 }}
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
