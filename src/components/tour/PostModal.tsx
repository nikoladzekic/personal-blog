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

const MODAL_STYLE: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'rgba(0,0,0,0.92)',
  zIndex: 20,
  display: 'flex',
  fontFamily: "'VT323', monospace",
  pointerEvents: 'all',
};

const SIDEBAR_STYLE: React.CSSProperties = {
  width: 280,
  borderRight: '1px solid #1e1e3a',
  overflowY: 'auto',
  flexShrink: 0,
};

const CONTENT_STYLE: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '2rem',
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
    critical: '#ff3e3e', high: '#ff6b00',
    medium: '#ffb800', low: '#00b4ff', info: '#3d5c3d',
  };

  return (
    <div style={MODAL_STYLE}>
      {/* Sidebar — post list */}
      <div style={SIDEBAR_STYLE}>
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #1e1e3a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '0.5rem', color: '#39ff14', letterSpacing: '0.1em',
          }}>
            {section.toUpperCase()}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid #1e1e3a',
              color: '#3d5c3d', cursor: 'pointer', padding: '0.2rem 0.5rem',
              fontFamily: "'Press Start 2P', monospace", fontSize: '0.4rem',
            }}
          >
            ESC
          </button>
        </div>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {posts.map(post => (
            <li key={post.slug}>
              <button
                onClick={() => onSelect(post)}
                style={{
                  width: '100%', textAlign: 'left',
                  background: selected?.slug === post.slug ? '#0f0f1a' : 'transparent',
                  border: 'none', borderBottom: '1px solid #1e1e3a',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  color: selected?.slug === post.slug ? '#39ff14' : '#6b8f6b',
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                {post.severity && (
                  <span style={{
                    display: 'inline-block',
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: severityColor[post.severity] ?? '#3d5c3d',
                    marginRight: '0.5rem',
                    verticalAlign: 'middle',
                  }} />
                )}
                <span style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '0.4rem', lineHeight: 1.8,
                  letterSpacing: '0.03em',
                  display: 'block',
                  marginTop: post.severity ? 0 : 0,
                }}>
                  {post.title}
                </span>
                {post.cve && (
                  <span style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '0.35rem', color: '#ff3e3e',
                    display: 'block', marginTop: '0.25rem',
                  }}>
                    {post.cve}
                  </span>
                )}
                <span style={{
                  fontSize: '0.9rem', color: '#3d5c3d',
                  display: 'block', marginTop: '0.2rem',
                }}>
                  {new Date(post.date).toLocaleDateString('en-GB', {
                    year: 'numeric', month: 'short', day: '2-digit',
                  }).toUpperCase()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Content pane */}
      <div style={CONTENT_STYLE}>
        {!selected ? (
          <div style={{
            height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '1rem',
          }}>
            <span style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '0.5rem', color: '#1a7a08',
            }}>
              SELECT AN ENTRY
            </span>
            <span style={{ fontSize: '1rem', color: '#3d5c3d' }}>
              ← choose from the list
            </span>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: '1.5rem',
              paddingBottom: '1rem', borderBottom: '1px solid #1e1e3a',
            }}>
              <div>
                <h2 style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '0.65rem', color: '#39ff14',
                  lineHeight: 1.6, margin: 0, marginBottom: '0.5rem',
                }}>
                  {selected.title}
                </h2>
                {selected.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {selected.tags.map(tag => (
                      <span key={tag} style={{
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: '0.35rem', color: '#3d5c3d',
                        border: '1px solid #1e1e3a', padding: '0.15rem 0.35rem',
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
                  background: 'none', border: '1px solid #3d5c3d',
                  color: '#00b4ff', cursor: 'pointer',
                  padding: '0.3rem 0.6rem', flexShrink: 0, marginLeft: '1rem',
                  fontFamily: "'Press Start 2P', monospace", fontSize: '0.38rem',
                  letterSpacing: '0.05em',
                }}
              >
                FULL PAGE ↗
              </button>
            </div>

            {/* Markdown body */}
            <div style={{ fontSize: '1.15rem', lineHeight: 1.8, color: '#c8ffc8' }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.7rem', color: '#39ff14', margin: '1.5rem 0 0.75rem', lineHeight: 1.6 }}>{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem', color: '#39ff14', margin: '1.25rem 0 0.6rem', lineHeight: 1.6 }}>{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.5rem', color: '#1a7a08', margin: '1rem 0 0.5rem', lineHeight: 1.6 }}>{children}</h3>
                  ),
                  code: ({ children, className }) => {
                    const isBlock = className?.includes('language-');
                    return isBlock ? (
                      <pre style={{ background: '#0f0f1a', border: '1px solid #1e1e3a', padding: '1rem', overflowX: 'auto', margin: '1rem 0' }}>
                        <code style={{ fontFamily: "'VT323', monospace", fontSize: '1rem', color: '#ffb800' }}>{children}</code>
                      </pre>
                    ) : (
                      <code style={{ background: '#0f0f1a', color: '#ffb800', padding: '0.1em 0.3em', border: '1px solid #1e1e3a' }}>{children}</code>
                    );
                  },
                  a: ({ children, href }) => (
                    <a href={href} style={{ color: '#00b4ff' }} target="_blank" rel="noopener">{children}</a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote style={{ borderLeft: '3px solid #1a7a08', paddingLeft: '1rem', color: '#6b8f6b', margin: '1rem 0' }}>{children}</blockquote>
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
