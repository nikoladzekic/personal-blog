interface HUDProps {
  nearTerminal: string | null;
  zone: string;
  locked: boolean;
  interactLabel?: string;
}

export function HUD({ nearTerminal, zone, locked, interactLabel }: HUDProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        fontFamily: "'Press Start 2P', monospace",
        zIndex: 10,
      }}
    >
      <style>{`
        .hud-enter-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.75);
          pointer-events: all;
          cursor: crosshair;
        }
        .hud-enter-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.14) 2px,
            rgba(0, 0, 0, 0.14) 4px
          );
          pointer-events: none;
        }
        .hud-enter-panel {
          position: relative;
          padding: 2rem 2.5rem;
          border: 2px solid #39ff14;
          text-align: center;
        }
        .hud-enter-panel::before,
        .hud-enter-panel::after {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          border-color: #39ff14;
          border-style: solid;
        }
        .hud-enter-panel::before {
          top: -2px;
          left: -2px;
          border-width: 3px 0 0 3px;
        }
        .hud-enter-panel::after {
          bottom: -2px;
          right: -2px;
          border-width: 0 3px 3px 0;
        }
        .hud-br-tr,
        .hud-br-bl {
          position: absolute;
          width: 14px;
          height: 14px;
          border-color: #39ff14;
          border-style: solid;
        }
        .hud-br-tr {
          top: -2px;
          right: -2px;
          border-width: 3px 3px 0 0;
        }
        .hud-br-bl {
          bottom: -2px;
          left: -2px;
          border-width: 0 0 3px 3px;
        }
      `}</style>

      {!locked && (
        <div className="hud-enter-overlay">
          <div className="hud-enter-panel">
            <span className="hud-br-tr" aria-hidden />
            <span className="hud-br-bl" aria-hidden />
            <p
              style={{
                color: '#39ff14',
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
                marginBottom: '1rem',
              }}
            >
              CLICK TO ENTER
            </p>
            <p style={{ color: '#3d5c3d', fontSize: '0.45rem', letterSpacing: '0.08em', margin: 0 }}>
              WASD TO MOVE · MOUSE TO LOOK · ESC TO EXIT
            </p>
          </div>
        </div>
      )}

      {locked && (
        <div
          style={{
            position: 'absolute',
            top: '1.5rem',
            left: '1.5rem',
            color: '#3d5c3d',
            fontSize: '0.45rem',
            letterSpacing: '0.12em',
          }}
        >
          &gt; SECTOR: {zone}
        </div>
      )}

      {locked && (
        <div
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            color: '#3d5c3d',
            fontSize: '0.4rem',
            letterSpacing: '0.1em',
          }}
        >
          ESC · EXIT TOUR
        </div>
      )}

      {locked && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 2,
              height: 12,
              background: nearTerminal ? '#39ff14' : 'rgba(200,255,200,0.5)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 12,
              height: 2,
              background: nearTerminal ? '#39ff14' : 'rgba(200,255,200,0.5)',
            }}
          />
        </div>
      )}

      {locked && nearTerminal && (
        <div
          style={{
            position: 'absolute',
            bottom: '3rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid #39ff14',
            padding: '0.5rem 1rem',
            color: '#39ff14',
            fontSize: '0.5rem',
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
          }}
        >
          [E] OPEN {interactLabel ?? ''}
        </div>
      )}
    </div>
  );
}
