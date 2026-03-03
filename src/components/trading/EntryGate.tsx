import { useState, useEffect } from 'react';

const INIT_MESSAGES = [
  { en: 'Initializing Environment...', he: 'מאתחל סביבה...' },
  { en: 'Loading Portfolio Engine...', he: 'טוען מנוע תיקים...' },
  { en: 'Syncing Local Data...', he: 'מסנכרן נתונים מקומיים...' },
  { en: 'Ready.', he: 'מוכן.' },
];

interface EntryGateProps {
  onEnter: () => void;
}

export const EntryGate = ({ onEnter }: EntryGateProps) => {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle');
  const [msgIdx, setMsgIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);

  const handleAccess = () => {
    setPhase('loading');
    setMsgIdx(0);
  };

  useEffect(() => {
    if (phase !== 'loading') return;
    if (msgIdx < INIT_MESSAGES.length - 1) {
      const timer = setTimeout(() => setMsgIdx(i => i + 1), 800);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setOpacity(0);
        setTimeout(() => {
          sessionStorage.setItem('orca-entered', '1');
          onEnter();
        }, 500);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, msgIdx, onEnter]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(ellipse at 50% 30%, #0f1528 0%, #070b14 50%, #030508 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'JetBrains Mono', 'Inter', monospace",
      opacity, transition: 'opacity 0.5s ease',
    }}>
      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(6,214,160,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,214,160,0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Orca logo */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <svg width="72" height="72" viewBox="0 0 32 32" fill="none" style={{ marginBottom: 24, filter: 'drop-shadow(0 0 30px rgba(6,214,160,0.3))' }}>
          <ellipse cx="16" cy="16" rx="14" ry="12" fill="#06d6a0" opacity="0.08" />
          <path d="M8 20c2-6 6-10 8-10s6 4 8 10" stroke="#06d6a0" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="12" cy="16" r="1.5" fill="#06d6a0" />
          <circle cx="20" cy="16" r="1.5" fill="#06d6a0" />
          <path d="M10 22c2 2 4 3 6 3s4-1 6-3" stroke="#06d6a0" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <h1 style={{
          fontSize: 36, fontWeight: 700, color: '#f1f5f9',
          letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1,
        }}>
          Orca Investment
        </h1>
        <p style={{
          fontSize: 12, color: '#64748b', letterSpacing: '0.2em',
          textTransform: 'uppercase', marginTop: 10, marginBottom: 48,
        }}>
          Trading Intelligence Terminal
        </p>

        {phase === 'idle' && (
          <button
            onClick={handleAccess}
            style={{
              padding: '14px 48px',
              background: 'linear-gradient(135deg, #06d6a0, #0d9488)',
              border: 'none', borderRadius: 10,
              color: '#0a0e1a', fontSize: 14, fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer', letterSpacing: '0.05em',
              boxShadow: '0 0 40px rgba(6,214,160,0.2), 0 4px 20px rgba(0,0,0,0.4)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 0 60px rgba(6,214,160,0.3), 0 8px 30px rgba(0,0,0,0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(6,214,160,0.2), 0 4px 20px rgba(0,0,0,0.4)';
            }}
          >
            Access Platform
          </button>
        )}

        {phase === 'loading' && (
          <div style={{ minHeight: 80 }}>
            {INIT_MESSAGES.slice(0, msgIdx + 1).map((msg, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12, color: i === msgIdx ? '#06d6a0' : '#475569',
                  marginBottom: 8, transition: 'color 0.3s ease',
                  display: 'flex', alignItems: 'center', gap: 8,
                  justifyContent: 'center',
                  animation: i === msgIdx ? 'fadeIn 0.3s ease' : undefined,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: i < msgIdx ? '#06d6a0' : i === msgIdx ? '#06d6a0' : '#475569',
                  display: 'inline-block',
                  boxShadow: i === msgIdx ? '0 0 8px rgba(6,214,160,0.5)' : 'none',
                }} />
                {msg.en}
              </div>
            ))}
            {msgIdx < INIT_MESSAGES.length - 1 && (
              <div style={{ marginTop: 16 }}>
                <div style={{
                  width: 200, height: 2, background: '#1e293b', borderRadius: 1,
                  margin: '0 auto', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${((msgIdx + 1) / INIT_MESSAGES.length) * 100}%`,
                    height: '100%', background: '#06d6a0', borderRadius: 1,
                    transition: 'width 0.5s ease',
                    boxShadow: '0 0 8px rgba(6,214,160,0.4)',
                  }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
