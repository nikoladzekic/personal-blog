import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { PostEntry } from './PostModal';

/**
 * Fullscreen "VM" overlay opened by pressing E at the desk PC: a mouse-driven
 * DzekicOS desktop (same teal theme the MonitorScreen paints on the 3D
 * monitor) where the diary/ and research/ folders open into draggable
 * file-manager windows and files render as markdown. Q closes the top
 * window, or powers the session down when the desktop is empty.
 */

interface VMDesktopProps {
  blogPosts: PostEntry[];
  researchPosts: PostEntry[];
  onClose: () => void;
}

type Section = 'blog' | 'research';

interface Win {
  id: number;
  kind: 'folder' | 'file';
  section: Section;
  post?: PostEntry;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}

/* DzekicOS palette — mirrors drawDesktop() in MonitorScreen.tsx */
const T = {
  wallTop: '#0c2a26',
  wallBot: '#071512',
  grid: 'rgba(80,180,150,0.07)',
  bar: '#101a16',
  barEdge: '#1c3a2e',
  accent: '#2f6a58',
  bright: '#7ad0b0',
  text: '#dff5ea',
  dim: '#9adfc4',
  muted: '#4a8a72',
  winBg: '#0d1f1a',
  titleBg: '#173a2f',
  titleBgFocus: '#2f6a58',
  folderBody: '#caa23c',
  folderLight: '#f8dd7c',
  folderMid: '#e8c451',
  folderDark: '#8a6a1e',
  danger: '#e66a50',
  cyan: '#67e8f9',
};

const PIXEL_F = "'Press Start 2P', monospace";
const MONO_F = "'JetBrains Mono', monospace";

const FOLDER_NAMES: Record<Section, string> = { blog: 'diary', research: 'research' };

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function fmtDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function FolderGlyph({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 70) / 88}
      viewBox="0 0 88 70"
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      <rect x="0" y="10" width="88" height="60" fill={T.folderBody} />
      <rect x="0" y="0" width="40" height="14" fill={T.folderMid} />
      <rect x="0" y="6" width="88" height="10" fill={T.folderMid} />
      <rect x="0" y="10" width="88" height="5" fill={T.folderLight} />
      <rect x="0" y="66" width="88" height="4" fill={T.folderDark} />
      <rect x="84" y="10" width="4" height="60" fill={T.folderDark} />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg width="15" height="18" viewBox="0 0 15 18" style={{ flexShrink: 0 }}>
      <path d="M1 1h8l5 5v11H1z" fill={T.winBg} stroke={T.dim} strokeWidth="1" />
      <path d="M9 1v5h5" fill="none" stroke={T.dim} strokeWidth="1" />
      <rect x="3.5" y="9" width="8" height="1" fill={T.muted} />
      <rect x="3.5" y="12" width="8" height="1" fill={T.muted} />
    </svg>
  );
}

/* Markdown component overrides, tinted to the VM theme */
const MD_COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 style={{ fontFamily: MONO_F, fontSize: '1.15rem', fontWeight: 700, color: T.bright, margin: '1.4rem 0 0.5rem', lineHeight: 1.3 }}>{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 style={{ fontFamily: MONO_F, fontSize: '1.02rem', fontWeight: 700, color: T.bright, margin: '1.3rem 0 0.5rem', lineHeight: 1.3, paddingBottom: '0.25rem', borderBottom: `1px solid ${T.accent}` }}>
      <span style={{ color: T.muted, fontWeight: 400 }}>{'## '}</span>{children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 style={{ fontFamily: MONO_F, fontSize: '0.95rem', fontWeight: 700, color: T.folderMid, margin: '1.1rem 0 0.4rem', lineHeight: 1.3 }}>
      <span style={{ color: T.muted, fontWeight: 400 }}>{'### '}</span>{children}
    </h3>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = className?.includes('language-');
    return isBlock ? (
      <pre style={{ background: '#081410', border: `1px solid ${T.accent}`, borderLeft: `3px solid ${T.bright}`, padding: '0.9rem 1.1rem', overflowX: 'auto', margin: '0.9rem 0' }}>
        <code style={{ fontFamily: MONO_F, fontSize: '0.8rem', color: T.text }}>{children}</code>
      </pre>
    ) : (
      <code style={{ background: '#081410', color: T.folderMid, padding: '0.1em 0.35em', border: `1px solid ${T.accent}`, borderRadius: 2, fontSize: '0.85em' }}>{children}</code>
    );
  },
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} style={{ color: T.cyan }} target="_blank" rel="noopener">{children}</a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote style={{ borderLeft: `3px solid ${T.folderMid}`, paddingLeft: '1rem', color: T.dim, fontStyle: 'italic', margin: '0.9rem 0' }}>{children}</blockquote>
  ),
};

export function VMDesktop({ blogPosts, researchPosts, onClose }: VMDesktopProps) {
  const [phase, setPhase] = useState<'boot' | 'flash' | 'on'>('boot');
  const [wins, setWins] = useState<Win[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<Section | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const winsRef = useRef(wins);
  winsRef.current = wins;
  const nextId = useRef(1);
  const topZ = useRef(10);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);

  const postsFor = useCallback(
    (section: Section) => (section === 'blog' ? blogPosts : researchPosts),
    [blogPosts, researchPosts]
  );

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('flash'), 750);
    const t2 = setTimeout(() => setPhase('on'), 920);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(i);
  }, []);

  const focusWin = useCallback((id: number) => {
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z: ++topZ.current } : w)));
  }, []);

  const closeWin = useCallback((id: number) => {
    setWins((ws) => ws.filter((w) => w.id !== id));
  }, []);

  const openFolder = useCallback((section: Section) => {
    setWins((ws) => {
      const existing = ws.find((w) => w.kind === 'folder' && w.section === section);
      if (existing) {
        return ws.map((w) => (w.id === existing.id ? { ...w, z: ++topZ.current } : w));
      }
      const n = ws.length;
      return [
        ...ws,
        {
          id: nextId.current++,
          kind: 'folder' as const,
          section,
          x: clamp(200 + n * 32, 0, window.innerWidth - 560),
          y: clamp(80 + n * 28, 0, window.innerHeight - 440),
          w: 540,
          h: 400,
          z: ++topZ.current,
        },
      ];
    });
  }, []);

  const openFile = useCallback((section: Section, post: PostEntry) => {
    setWins((ws) => {
      const existing = ws.find((w) => w.kind === 'file' && w.post?.slug === post.slug);
      if (existing) {
        return ws.map((w) => (w.id === existing.id ? { ...w, z: ++topZ.current } : w));
      }
      const n = ws.length;
      const w = Math.min(780, window.innerWidth - 80);
      const h = Math.min(560, window.innerHeight - 120);
      return [
        ...ws,
        {
          id: nextId.current++,
          kind: 'file' as const,
          section,
          post,
          x: clamp(260 + n * 32, 0, window.innerWidth - w - 20),
          y: clamp(60 + n * 28, 0, window.innerHeight - h - 60),
          w,
          h,
          z: ++topZ.current,
        },
      ];
    });
  }, []);

  // Q: close the focused window first, then power down — ESC is reserved
  // for pointer-lock/menu outside the VM
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== 'KeyQ') return;
      const ws = winsRef.current;
      if (ws.length === 0) {
        onClose();
      } else {
        const top = ws.reduce((a, b) => (a.z > b.z ? a : b));
        closeWin(top.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, closeWin]);

  // Titlebar dragging
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      setWins((ws) =>
        ws.map((w) =>
          w.id === d.id
            ? {
                ...w,
                x: clamp(e.clientX - d.dx, -w.w + 120, window.innerWidth - 120),
                y: clamp(e.clientY - d.dy, 0, window.innerHeight - 80),
              }
            : w
        )
      );
    };
    const up = () => {
      drag.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  const startDrag = useCallback(
    (e: React.PointerEvent, win: Win) => {
      drag.current = { id: win.id, dx: e.clientX - win.x, dy: e.clientY - win.y };
      focusWin(win.id);
    },
    [focusWin]
  );

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  if (phase !== 'on') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          // above the tour chrome (EXIT TOUR / mode buttons, zIndex 30):
          // the VM is a fullscreen takeover, not a dialog
          zIndex: 40,
          pointerEvents: 'all',
          background: phase === 'flash' ? '#aab4ff' : '#0a0a0a',
          fontFamily: MONO_F,
          color: '#c8c8c8',
          padding: '2rem 2.5rem',
          fontSize: '0.95rem',
        }}
      >
        {phase === 'boot' && (
          <>
            <div>$ startx</div>
            <div style={{ color: '#888' }}>switching to video mode 1024x432 ...</div>
            <div style={{ display: 'inline-block', width: 9, height: 17, background: '#c8c8c8', marginTop: 4 }} />
          </>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        pointerEvents: 'all',
        overflow: 'hidden',
        background: `linear-gradient(${T.wallTop}, ${T.wallBot})`,
        backgroundColor: T.wallBot,
        fontFamily: MONO_F,
        color: T.text,
        userSelect: 'none',
      }}
      onPointerDown={() => {
        setSelectedIcon(null);
        setStartOpen(false);
      }}
    >
      {/* wallpaper grid + watermark */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${T.grid} 1px, transparent 1px), linear-gradient(90deg, ${T.grid} 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '32%',
          left: 0,
          right: 0,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontFamily: PIXEL_F, fontSize: '1.6rem', color: 'rgba(90,190,160,0.16)' }}>
          DzekicOS
        </div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(90,190,160,0.28)', marginTop: '0.8rem' }}>
          v2.1 — property of ndz
        </div>
      </div>

      {/* scanlines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.10) 3px, rgba(0,0,0,0.10) 5px)',
          pointerEvents: 'none',
          zIndex: 9000,
        }}
      />

      {/* desktop icons */}
      {(['blog', 'research'] as Section[]).map((section, i) => (
        <button
          key={section}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setSelectedIcon(section)}
          onDoubleClick={() => openFolder(section)}
          style={{
            position: 'absolute',
            left: 44,
            top: 44 + i * 132,
            width: 110,
            padding: '0.5rem 0.4rem',
            background: selectedIcon === section ? 'rgba(47,106,88,0.35)' : 'transparent',
            border: `1px dotted ${selectedIcon === section ? T.bright : 'transparent'}`,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <FolderGlyph />
          <span
            style={{
              fontFamily: MONO_F,
              fontSize: '0.8rem',
              color: T.text,
              textShadow: '1px 1px 0 #0e1210',
            }}
          >
            {FOLDER_NAMES[section]}
          </span>
        </button>
      ))}

      {/* windows */}
      {wins.map((win) => {
        const focused = wins.every((w) => w.z <= win.z);
        const posts = postsFor(win.section);
        return (
          <div
            key={win.id}
            onPointerDown={(e) => {
              e.stopPropagation();
              focusWin(win.id);
            }}
            style={{
              position: 'absolute',
              left: win.x,
              top: win.y,
              width: win.w,
              height: win.h,
              zIndex: win.z,
              background: T.winBg,
              border: `1px solid ${focused ? T.bright : T.accent}`,
              boxShadow: '6px 6px 0 rgba(0,0,0,0.45)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* titlebar */}
            <div
              onPointerDown={(e) => startDrag(e, win)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: focused ? T.titleBgFocus : T.titleBg,
                padding: '0.3rem 0.5rem 0.3rem 0.7rem',
                cursor: 'grab',
                flexShrink: 0,
                touchAction: 'none',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  color: focused ? T.text : T.dim,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {win.kind === 'folder'
                  ? `/home/ndz/${FOLDER_NAMES[win.section]}`
                  : `${FOLDER_NAMES[win.section]}/${win.post?.slug}.md`}
              </span>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => closeWin(win.id)}
                style={{
                  background: T.winBg,
                  border: `1px solid ${T.dim}`,
                  color: T.text,
                  width: 20,
                  height: 20,
                  fontSize: '0.7rem',
                  lineHeight: 1,
                  cursor: 'pointer',
                  fontFamily: MONO_F,
                  flexShrink: 0,
                  marginLeft: '0.75rem',
                }}
              >
                ×
              </button>
            </div>

            {win.kind === 'folder' ? (
              <>
                {/* file listing */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <div
                    style={{
                      display: 'flex',
                      padding: '0.35rem 0.9rem',
                      borderBottom: `1px solid ${T.accent}`,
                      fontSize: '0.68rem',
                      color: T.muted,
                      position: 'sticky',
                      top: 0,
                      background: T.winBg,
                    }}
                  >
                    <span style={{ flex: 1 }}>NAME</span>
                    <span style={{ width: 110, textAlign: 'right' }}>MODIFIED</span>
                  </div>
                  {posts.map((post) => (
                    <button
                      key={post.slug}
                      type="button"
                      onDoubleClick={() => openFile(win.section, post)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `1px solid rgba(47,106,88,0.25)`,
                        padding: '0.5rem 0.9rem',
                        cursor: 'pointer',
                        color: T.text,
                        fontFamily: MONO_F,
                        fontSize: '0.8rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(47,106,88,0.3)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <FileGlyph />
                      <span
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {post.title}
                      </span>
                      <span style={{ width: 110, textAlign: 'right', color: T.muted, fontSize: '0.7rem', flexShrink: 0 }}>
                        {fmtDate(post.date)}
                      </span>
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    borderTop: `1px solid ${T.accent}`,
                    padding: '0.3rem 0.9rem',
                    fontSize: '0.68rem',
                    color: T.muted,
                    flexShrink: 0,
                  }}
                >
                  {posts.length} object(s) · double-click to open
                </div>
              </>
            ) : (
              <>
                {/* file viewer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: `1px solid ${T.accent}`,
                    padding: '0.45rem 1rem',
                    flexShrink: 0,
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fmtDate(win.post!.date)}
                    {win.post!.tags.length > 0 && ` · ${win.post!.tags.join(', ')}`}
                    {win.post!.cve && ` · ${win.post!.cve}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `/${win.section}/${win.post!.slug}`;
                    }}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${T.accent}`,
                      color: T.bright,
                      cursor: 'pointer',
                      padding: '0.25rem 0.6rem',
                      fontFamily: MONO_F,
                      fontSize: '0.68rem',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    full page ↗
                  </button>
                </div>
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem 1.4rem 1.5rem',
                    fontSize: '0.85rem',
                    lineHeight: 1.75,
                    userSelect: 'text',
                    cursor: 'auto',
                  }}
                >
                  <h1 style={{ fontFamily: MONO_F, fontSize: '1.25rem', fontWeight: 700, color: T.bright, margin: '0 0 1rem', lineHeight: 1.3 }}>
                    {win.post!.title}
                  </h1>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                    {win.post!.body}
                  </ReactMarkdown>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* start menu */}
      {startOpen && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: 10,
            bottom: 46,
            width: 200,
            background: T.winBg,
            border: `1px solid ${T.bright}`,
            zIndex: 9500,
            fontSize: '0.78rem',
          }}
        >
          <div style={{ padding: '0.45rem 0.8rem', color: T.muted, fontSize: '0.66rem', borderBottom: `1px solid ${T.accent}` }}>
            DzekicOS v2.1
          </div>
          {(['blog', 'research'] as Section[]).map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => {
                setStartOpen(false);
                openFolder(section);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: T.text,
                padding: '0.5rem 0.8rem',
                cursor: 'pointer',
                fontFamily: MONO_F,
                fontSize: '0.78rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {FOLDER_NAMES[section]}/
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              borderTop: `1px solid ${T.accent}`,
              color: T.danger,
              padding: '0.5rem 0.8rem',
              cursor: 'pointer',
              fontFamily: MONO_F,
              fontSize: '0.78rem',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ⏻ log out
          </button>
        </div>
      )}

      {/* taskbar */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 40,
          background: T.bar,
          borderTop: `3px solid ${T.barEdge}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0 0.6rem',
          zIndex: 9400,
        }}
      >
        <button
          type="button"
          onClick={() => setStartOpen((v) => !v)}
          style={{
            background: startOpen ? T.bright : T.accent,
            border: 'none',
            color: startOpen ? T.winBg : T.text,
            padding: '0.35rem 1.1rem',
            fontFamily: MONO_F,
            fontSize: '0.8rem',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          start
        </button>

        {/* open-window buttons */}
        <div style={{ display: 'flex', gap: '0.4rem', flex: 1, overflow: 'hidden' }}>
          {wins.map((win) => {
            const focused = wins.every((w) => w.z <= win.z);
            return (
              <button
                key={win.id}
                type="button"
                onClick={() => focusWin(win.id)}
                style={{
                  background: focused ? T.titleBgFocus : 'transparent',
                  border: `1px solid ${T.accent}`,
                  color: focused ? T.text : T.dim,
                  padding: '0.25rem 0.7rem',
                  fontFamily: MONO_F,
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {win.kind === 'folder' ? `${FOLDER_NAMES[win.section]}/` : `${win.post?.slug}.md`}
              </button>
            );
          })}
        </div>

        <span style={{ fontSize: '0.66rem', color: T.muted, flexShrink: 0 }}>Q · CLOSE</span>
        <span style={{ fontSize: '0.85rem', color: T.dim, flexShrink: 0, marginLeft: '0.5rem' }}>
          {hh}:{mm}
        </span>
      </div>
    </div>
  );
}
