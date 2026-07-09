import { useProgress } from '@react-three/drei';

export function LoadingScreen() {
  const { active, progress } = useProgress();

  if (!active) return null;

  const pct = Math.round(progress);

  return (
    <div
      className="tour-loading"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a12',
        zIndex: 25,
        pointerEvents: 'all',
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <style>{`
        .tour-loading::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.12) 2px,
            rgba(0, 0, 0, 0.12) 4px
          );
          pointer-events: none;
        }
        .tour-loading-panel {
          position: relative;
          padding: 2rem 2.5rem;
          border: 2px solid #e63950;
          min-width: 280px;
        }
        .tour-loading-panel::before,
        .tour-loading-panel::after {
          content: '';
          position: absolute;
          width: 12px;
          height: 12px;
          border-color: #f2a33c;
          border-style: solid;
        }
        .tour-loading-panel::before {
          top: -2px;
          left: -2px;
          border-width: 3px 0 0 3px;
        }
        .tour-loading-panel::after {
          bottom: -2px;
          right: -2px;
          border-width: 0 3px 3px 0;
        }
        .tour-loading-bracket-tl,
        .tour-loading-bracket-br {
          position: absolute;
          width: 12px;
          height: 12px;
          border-color: #f2a33c;
          border-style: solid;
        }
        .tour-loading-bracket-tl {
          top: -2px;
          right: -2px;
          border-width: 3px 3px 0 0;
        }
        .tour-loading-bracket-br {
          bottom: -2px;
          left: -2px;
          border-width: 0 0 3px 3px;
        }
        .tour-loading-bar {
          height: 8px;
          border: 1px solid #9a8d92;
          margin-top: 1.25rem;
          background: #201a1f;
        }
        .tour-loading-fill {
          height: 100%;
          background: #e63950;
          transition: width 0.15s ease-out;
          box-shadow: 0 0 8px rgba(230, 57, 80, 0.5);
        }
      `}</style>

      <div className="tour-loading-panel">
        <span className="tour-loading-bracket-tl" aria-hidden />
        <span className="tour-loading-bracket-br" aria-hidden />

        <p
          style={{
            color: '#e63950',
            fontSize: '0.5rem',
            letterSpacing: '0.12em',
            margin: 0,
          }}
        >
          LOADING SECTOR
        </p>
        <p
          style={{
            color: '#9a8d92',
            fontSize: '0.38rem',
            letterSpacing: '0.1em',
            margin: '0.75rem 0 0',
          }}
        >
          BUILDING 3D WORLD...
        </p>

        <div className="tour-loading-bar">
          <div className="tour-loading-fill" style={{ width: `${pct}%` }} />
        </div>
        <p
          style={{
            color: '#b3a8ab',
            fontSize: '0.4rem',
            letterSpacing: '0.1em',
            margin: '0.5rem 0 0',
            textAlign: 'right',
          }}
        >
          {pct}%
        </p>
      </div>
    </div>
  );
}
