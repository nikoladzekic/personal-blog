import { lazy, Suspense, useEffect, useState } from 'react';
import type { PostEntry } from './PostModal';

/**
 * Keeps the 3D world off phones. `World` is behind a dynamic import so the
 * three.js bundle is never fetched on a viewport that can't use it.
 */
const World = lazy(() =>
  import('./World').then((m) => ({ default: m.World }))
);

const DESKTOP = '(min-width: 861px)';

interface TourGateProps {
  blogPosts: PostEntry[];
  researchPosts: PostEntry[];
}

export function TourGate({ blogPosts, researchPosts }: TourGateProps) {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    setSupported(mq.matches);
  }, []);

  if (supported === null) return null;

  if (!supported) {
    return (
      <div id="tour-unsupported">
        <p className="tu-title">DESKTOP ONLY</p>
        <p className="tu-body">
          The 3D tour needs a keyboard and a bit more GPU than a phone has.
          Come back on a laptop or desktop.
        </p>
        <a className="tu-link" href="/">← back to the site</a>
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <World blogPosts={blogPosts} researchPosts={researchPosts} />
    </Suspense>
  );
}
