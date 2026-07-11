interface HUDProps {
  nearTerminal: string | null;
  zone: string;
  locked: boolean;
  interactLabel?: string;
}

/** [key, action] rows for the corner legend panel */
const LEGEND: [string, string][] = [
  ['WASD', 'MOVE'],
  ['MOUSE', 'LOOK'],
  ['E', 'INTERACT'],
  ['Q', 'CLOSE APP'],
  ['ESC', 'MENU'],
];

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
          border: 2px solid #e63950;
          text-align: center;
        }
        .hud-enter-panel::before,
        .hud-enter-panel::after {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          border-color: #f2a33c;
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
          border-color: #f2a33c;
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
        .hud-legend {
          position: absolute;
          bottom: 1.5rem;
          right: 1.5rem;
          padding: 0.8rem 1rem;
          border: 2px solid #e63950;
          background: rgba(10, 10, 18, 0.78);
        }
        .hud-legend::before,
        .hud-legend::after {
          content: '';
          position: absolute;
          width: 10px;
          height: 10px;
          border-color: #f2a33c;
          border-style: solid;
        }
        .hud-legend::before {
          top: -2px;
          left: -2px;
          border-width: 3px 0 0 3px;
        }
        .hud-legend::after {
          bottom: -2px;
          right: -2px;
          border-width: 0 3px 3px 0;
        }
        .hud-legend .hud-br-tr,
        .hud-legend .hud-br-bl {
          width: 10px;
          height: 10px;
        }
        .hud-legend-title {
          color: #e63950;
          font-size: 0.38rem;
          letter-spacing: 0.12em;
          margin: 0 0 0.65rem;
        }
        .hud-legend-row {
          display: flex;
          justify-content: space-between;
          gap: 1.2rem;
          margin-top: 0.42rem;
        }
        .hud-legend-key {
          color: #f2a33c;
          font-size: 0.38rem;
          letter-spacing: 0.1em;
        }
        .hud-legend-action {
          color: #9a8d92;
          font-size: 0.38rem;
          letter-spacing: 0.1em;
        }
      `}</style>

      {!locked && (
        <div className="hud-enter-overlay">
          <div className="hud-enter-panel">
            <span className="hud-br-tr" aria-hidden />
            <span className="hud-br-bl" aria-hidden />
            <p
              style={{
                color: '#e63950',
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
                marginBottom: '1rem',
              }}
            >
              CLICK TO ENTER
            </p>
            <p style={{ color: '#9a8d92', fontSize: '0.45rem', letterSpacing: '0.08em', margin: 0 }}>
              WASD MOVE · MOUSE LOOK · E INTERACT · ESC MENU
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
            color: '#9a8d92',
            fontSize: '0.45rem',
            letterSpacing: '0.12em',
          }}
        >
          &gt; SECTOR: {zone}
        </div>
      )}

      {locked && (
        <div className="hud-legend">
          <span className="hud-br-tr" aria-hidden />
          <span className="hud-br-bl" aria-hidden />
          <p className="hud-legend-title">CONTROLS</p>
          {LEGEND.map(([key, action]) => (
            <div key={key} className="hud-legend-row">
              <span className="hud-legend-key">{key}</span>
              <span className="hud-legend-action">{action}</span>
            </div>
          ))}
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
              background: nearTerminal ? '#e63950' : 'rgba(236,231,232,0.5)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 12,
              height: 2,
              background: nearTerminal ? '#e63950' : 'rgba(236,231,232,0.5)',
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
            background: 'rgba(10,7,8,0.8)',
            border: '1px solid #e63950',
            padding: '0.5rem 1rem',
            color: '#f2a33c',
            fontSize: '0.5rem',
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
          }}
        >
          [E] {interactLabel ?? 'INTERACT'}
        </div>
      )}
    </div>
  );
}
