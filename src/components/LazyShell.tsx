import type { ReactNode } from 'react';
import { Suspense, useEffect, useState } from 'react';

/**
 * Premium loading shell — a calm orca-style ripple while a lazy chunk loads.
 * Hidden for the first ~120ms to avoid flash on instant loads.
 */
const Fallback = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 120);
    return () => clearTimeout(t);
  }, []);
  if (!show) return <div style={{ minHeight: 200 }} />;

  return (
    <div
      style={{
        minHeight: 320,
        display: 'grid',
        placeItems: 'center',
        padding: 32,
        animation: 'orca-fade-in 0.35s ease-out',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {/* Concentric ripples */}
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
        @keyframes orca-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
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
