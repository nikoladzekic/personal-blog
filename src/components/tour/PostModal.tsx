import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect } from 'react';

export interface PostEntry {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  body: string;
  type?: string;
  severity?: string;
  cve?: string;
  program?: string;
  platform?: string;
}

interface PostModalProps {
  section: 'blog' | 'research';
  posts: PostEntry[];
  selected: PostEntry | null;
  onSelect: (post: PostEntry) => void;
  onClose: () => void;
  onOpenFull: (slug: string) => void;
}

/* mirrors the site palette in src/styles/global.css */
const C = {
  bg: 'rgba(19, 16, 19, 0.95)',
  surface: '#181418',
  elevated: '#201a1f',
  border: '#2e2529',
  borderBright: '#453640',
  primary: '#e63950',
  accent: '#f2a33c',
  cyan: '#67e8f9',
  text: '#ece7e8',
  dim: '#b3a8ab',
  muted: '#776c72',
};

const F = {
  display: "'Chakra Petch', sans-serif",
  mono: "'JetBrains Mono', monospace",
  meta: "'Space Mono', monospace",
};

const MODAL_STYLE: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: C.bg,
  zIndex: 20,
  display: 'flex',
  fontFamily: F.mono,
  pointerEvents: 'all',
};

const SIDEBAR_STYLE: React.CSSProperties = {
  width: 300,
  borderRight: `1px solid ${C.border}`,
  background: C.surface,
  overflowY: 'auto',
  flexShrink: 0,
};

const CONTENT_STYLE: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '2rem 2.5rem',
};

export function PostModal({
  section, posts, selected, onSelect, onClose, onOpenFull,
}: PostModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const severityColor: Record<string, string> = {
    critical: '#f87171', high: C.accent,
    medium: '#fbbf24', low: C.cyan, info: C.muted,
  };

  return (
    <div style={MODAL_STYLE}>
      {/* Sidebar — post list */}
      <div style={SIDEBAR_STYLE}>
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontFamily: F.meta,
            fontSize: '0.8rem', color: C.muted, letterSpacing: '0.2em',
          }}>
            <span style={{ color: C.accent }}>{'//'}</span> {section}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: `1px solid ${C.border}`,
              color: C.muted, cursor: 'pointer', padding: '0.2rem 0.55rem',
              fontFamily: F.meta, fontSize: '0.7rem', letterSpacing: '0.08em',
            }}
          >
            esc
          </button>
        </div>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {posts.map((post, i) => {
            const active = selected?.slug === post.slug;
            return (
              <li key={post.slug}>
                <button
                  onClick={() => onSelect(post)}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: active ? C.elevated : 'transparent',
                    border: 'none', borderBottom: `1px solid ${C.border}`,
                    borderLeft: `2px solid ${active ? C.primary : 'transparent'}`,
                    padding: '0.85rem 1.1rem',
                    cursor: 'pointer',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  <span style={{
                    fontFamily: F.meta, fontSize: '0.7rem',
                    color: active ? C.accent : C.muted,
                    display: 'inline-block', marginBottom: '0.25rem',
                  }}>
                    {String(i + 1).padStart(2, '0')}
                    {post.severity && (
                      <span style={{
                        display: 'inline-block',
                        width: 6, height: 6,
                        borderRadius: '50%',
                        background: severityColor[post.severity] ?? C.muted,
                        marginLeft: '0.5rem',
                        verticalAlign: 'middle',
                      }} />
                    )}
                  </span>
                  <span style={{
                    fontFamily: F.display,
                    fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.35,
                    color: active ? C.primary : C.text,
                    display: 'block',
                  }}>
                    {post.title}
                  </span>
                  {post.cve && (
                    <span style={{
                      fontFamily: F.meta,
                      fontSize: '0.7rem', color: '#f87171',
                      display: 'block', marginTop: '0.2rem',
                    }}>
                      {post.cve}
                    </span>
                  )}
                  <span style={{
                    fontFamily: F.meta,
                    fontSize: '0.7rem', color: C.muted,
                    display: 'block', marginTop: '0.25rem',
                  }}>
                    {new Date(post.date).toLocaleDateString('en-GB', {
                      year: 'numeric', month: 'short', day: '2-digit',
                    })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Content pane */}
      <div style={CONTENT_STYLE}>
        {!selected ? (
          <div style={{
            height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '0.75rem',
          }}>
            <span style={{
              fontFamily: F.display,
              fontSize: '1.1rem', fontWeight: 600, color: C.primary,
            }}>
              select an entry
            </span>
            <span style={{ fontFamily: F.meta, fontSize: '0.8rem', color: C.muted }}>
              ← choose from the list
            </span>
          </div>
        ) : (
          <div style={{ maxWidth: '72ch' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: '1.5rem',
              paddingBottom: '1rem', borderBottom: `1px solid ${C.border}`,
            }}>
              <div>
                <h2 style={{
                  fontFamily: F.display,
                  fontSize: '1.35rem', fontWeight: 700, color: C.text,
                  lineHeight: 1.3, margin: 0, marginBottom: '0.6rem',
                }}>
                  {selected.title}
                </h2>
                {selected.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {selected.tags.map(tag => (
                      <span key={tag} style={{
                        fontFamily: F.meta,
                        fontSize: '0.7rem', color: C.dim, textTransform: 'lowercase',
                        border: `1px solid ${C.border}`, padding: '0.05rem 0.45rem',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => onOpenFull(selected.slug)}
                style={{
                  background: 'none', border: `1px solid ${C.borderBright}`,
                  color: C.primary, cursor: 'pointer',
                  padding: '0.35rem 0.75rem', flexShrink: 0, marginLeft: '1rem',
                  fontFamily: F.display, fontSize: '0.8rem', fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                full page ↗
              </button>
            </div>

            {/* Markdown body */}
            <div style={{ fontFamily: F.mono, fontSize: '0.95rem', lineHeight: 1.8, color: C.text }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 style={{ fontFamily: F.display, fontSize: '1.25rem', fontWeight: 700, color: C.primary, margin: '1.6rem 0 0.6rem', lineHeight: 1.3 }}>{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 style={{ fontFamily: F.display, fontSize: '1.1rem', fontWeight: 600, color: C.primary, margin: '1.5rem 0 0.6rem', lineHeight: 1.3, paddingBottom: '0.3rem', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.muted, fontWeight: 400 }}>{'## '}</span>{children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 style={{ fontFamily: F.display, fontSize: '1rem', fontWeight: 600, color: C.accent, margin: '1.25rem 0 0.5rem', lineHeight: 1.3 }}>
                      <span style={{ color: C.muted, fontWeight: 400 }}>{'### '}</span>{children}
                    </h3>
                  ),
                  code: ({ children, className }) => {
                    const isBlock = className?.includes('language-');
                    return isBlock ? (
                      <pre style={{ background: C.elevated, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.primary}`, padding: '1rem 1.25rem', overflowX: 'auto', margin: '1rem 0' }}>
                        <code style={{ fontFamily: F.mono, fontSize: '0.85rem', color: C.text }}>{children}</code>
                      </pre>
                    ) : (
                      <code style={{ background: C.elevated, color: C.accent, padding: '0.1em 0.35em', border: `1px solid ${C.border}`, borderRadius: 3, fontSize: '0.85em' }}>{children}</code>
                    );
                  },
                  a: ({ children, href }) => (
                    <a href={href} style={{ color: C.cyan }} target="_blank" rel="noopener">{children}</a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote style={{ borderLeft: `3px solid ${C.accent}`, paddingLeft: '1rem', color: C.dim, fontStyle: 'italic', margin: '1rem 0' }}>{children}</blockquote>
                  ),
                }}
              >
                {selected.body}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
