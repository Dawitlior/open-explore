import type { ReactNode } from 'react';
import { Suspense, useEffect, useState } from 'react';

/**
 * Premium full-bleed loading shell — used during route/dimension swaps
 * (Orca ↔ Journal ↔ Backtest). Owns the entire viewport with a deep
 * navy background so users never see a white flash while a lazy chunk
 * downloads or while a heavy iframe boots.
 */
const Fallback = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(ellipse at center, #0a1830 0%, #050b18 60%, #02060e 100%)',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <div style={{ position: 'relative', width: 96, height: 96 }}>
          <span className="orca-ripple" style={{ animationDelay: '0s' }} />
          <span className="orca-ripple" style={{ animationDelay: '0.4s' }} />
          <span className="orca-ripple" style={{ animationDelay: '0.8s' }} />
          <div
            style={{
              position: 'absolute',
              inset: 36,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #38bdf8 0%, #0ea5e9 60%, transparent 100%)',
              boxShadow: '0 0 28px rgba(56,189,248,0.6)',
              animation: 'orca-pulse-core 1.6s ease-in-out infinite',
            }}
          />
        </div>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.45em',
            color: '#5d7090',
            textTransform: 'uppercase',
          }}
        >
          Loading Module
        </div>
      </div>

      <style>{`
        @keyframes orca-ripple {
          0% { transform: scale(0.4); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes orca-pulse-core {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.85); opacity: 0.85; }
        }
        .orca-ripple {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(56,189,248,0.5);
          animation: orca-ripple 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export const LazyShell = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<Fallback />}>{children}</Suspense>
);
