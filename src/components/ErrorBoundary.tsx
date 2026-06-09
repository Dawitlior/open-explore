import { Component, type ReactNode } from 'react';
import { reportClientError } from '@/lib/telemetry';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary]', error, info);
    reportClientError(error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#061326',
          color: '#e8eef8',
          fontFamily: "'IBM Plex Mono', monospace",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.3em', color: '#6b7a93', marginBottom: 16 }}>
            SYSTEM FAULT
          </div>
          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 22, marginBottom: 12 }}>
            משהו השתבש
          </h1>
          <p style={{ fontSize: 13, color: '#90a3c0', marginBottom: 24, lineHeight: 1.6 }}>
            תקלה לא צפויה ברינדור. הנתונים שלך בענן בטוחים.
          </p>
          <pre
            style={{
              fontSize: 11,
              color: '#ff6b6b',
              background: 'rgba(255,107,107,0.06)',
              border: '1px solid rgba(255,107,107,0.2)',
              padding: 12,
              borderRadius: 6,
              textAlign: 'left',
              overflow: 'auto',
              maxHeight: 160,
              marginBottom: 20,
            }}
          >
            {this.state.error.message}
          </pre>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={this.reset}
              style={{
                padding: '10px 22px',
                background: '#3d8bff',
                border: 0,
                borderRadius: 4,
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 11,
                letterSpacing: '0.2em',
                cursor: 'pointer',
              }}
            >
              נסה שוב
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 22px',
                background: 'transparent',
                border: '1px solid #2a3a55',
                borderRadius: 4,
                color: '#e8eef8',
                fontFamily: 'inherit',
                fontSize: 11,
                letterSpacing: '0.2em',
                cursor: 'pointer',
              }}
            >
              רענן
            </button>
          </div>
        </div>
      </div>
    );
  }
}
