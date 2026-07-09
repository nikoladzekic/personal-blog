import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Tour scene error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a12',
            fontFamily: "'Press Start 2P', monospace",
            color: '#ff6b6b',
            gap: '1.5rem',
            zIndex: 40,
            pointerEvents: 'all',
          }}
        >
          <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em' }}>SCENE CRASHED</p>
          <p style={{ fontSize: '0.4rem', color: '#9a8d92', letterSpacing: '0.08em' }}>
            WebGL OR ASSET LOAD FAILED
          </p>
          <a
            href="/tour"
            style={{
              fontSize: '0.45rem',
              color: '#e63950',
              textDecoration: 'none',
              letterSpacing: '0.1em',
            }}
          >
            [ RETRY TOUR ]
          </a>
          <a
            href="/"
            style={{
              fontSize: '0.4rem',
              color: '#b3a8ab',
              textDecoration: 'none',
              letterSpacing: '0.08em',
            }}
          >
            ← EXIT TO MENU
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}
