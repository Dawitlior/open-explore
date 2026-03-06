import { useState, useEffect, useCallback } from 'react';

const INIT_MESSAGES = [
  { en: 'Initializing Environment...', he: 'מאתחל סביבה...' },
  { en: 'Loading Portfolio Engine...', he: 'טוען מנוע תיקים...' },
  { en: 'Syncing Local Data...', he: 'מסנכרן נתונים מקומיים...' },
  { en: 'Ready.', he: 'מוכן.' },
];

interface EntryGateProps {
  onEnter: () => void;
  lang?: 'he' | 'en';
}

export const EntryGate = ({ onEnter, lang = 'he' }: EntryGateProps) => {
  const isRTL = lang === 'he';
  const [phase, setPhase] = useState<'idle' | 'loading' | 'cinematic' | 'done'>('idle');
  const [msgIdx, setMsgIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [cinematicStep, setCinematicStep] = useState(0);

  const handleAccess = useCallback(() => {
    setPhase('loading');
    setMsgIdx(0);
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;
    if (msgIdx < INIT_MESSAGES.length - 1) {
      const timer = setTimeout(() => setMsgIdx(i => i + 1), 800);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setPhase('cinematic');
        setCinematicStep(0);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, msgIdx]);

  // Cinematic sequence
  useEffect(() => {
    if (phase !== 'cinematic') return;
    
    const steps = [
      // Step 0: fade to dark (0ms)
      () => setCinematicStep(1),
      // Step 1: show grid (400ms)
      () => setCinematicStep(2),
      // Step 2: chart lines animate (800ms)
      () => setCinematicStep(3),
      // Step 3: fade out and enter (1400ms)
      () => {
        setOpacity(0);
        setTimeout(() => {
          sessionStorage.setItem('orca-entered', '1');
          onEnter();
        }, 500);
      },
    ];

    const timers = steps.map((step, i) =>
      setTimeout(step, i === 0 ? 0 : i === 1 ? 400 : i === 2 ? 800 : 1400)
    );

    return () => timers.forEach(clearTimeout);
  }, [phase, onEnter]);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: cinematicStep >= 1
          ? '#020408'
          : 'radial-gradient(ellipse at 50% 30%, #0f1528 0%, #070b14 50%, #030508 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'JetBrains Mono', 'Inter', monospace",
        opacity, transition: 'opacity 0.5s ease, background 0.6s ease',
        overflow: 'hidden',
      }}
    >
      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: cinematicStep >= 1 ? 0.08 : 0.03,
        backgroundImage: 'linear-gradient(rgba(6,214,160,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,214,160,0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        transition: 'opacity 0.8s ease',
      }} />

      {/* Cinematic chart lines */}
      {cinematicStep >= 2 && (
        <svg
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: cinematicStep >= 3 ? 0 : 0.15,
            transition: 'opacity 0.6s ease',
          }}
          viewBox="0 0 1000 500"
          preserveAspectRatio="none"
        >
          <polyline
            points="0,350 100,320 200,340 300,280 400,300 500,220 600,240 700,180 800,200 900,150 1000,170"
            fill="none"
            stroke="#06d6a0"
            strokeWidth="2"
            style={{
              strokeDasharray: 2000,
              strokeDashoffset: 0,
              animation: 'chartDraw 1s ease forwards',
            }}
          />
          <polyline
            points="0,380 100,370 200,390 300,350 400,360 500,310 600,330 700,290 800,300 900,260 1000,280"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            opacity="0.5"
            style={{
              strokeDasharray: 2000,
              strokeDashoffset: 0,
              animation: 'chartDraw 1.2s ease forwards',
            }}
          />
          {/* Candle-like vertical bars */}
          {[150, 300, 450, 600, 750, 900].map((x, i) => (
            <rect
              key={i}
              x={x - 3}
              y={200 + Math.sin(i * 1.5) * 60}
              width={6}
              height={40 + Math.cos(i * 2) * 20}
              fill={i % 2 === 0 ? '#06d6a0' : '#ef4444'}
              opacity={0.2}
              style={{
                animation: `candleFade 0.4s ease ${0.1 * i}s forwards`,
                opacity: 0,
              }}
            />
          ))}
        </svg>
      )}

      {/* Main content - hidden during cinematic finale */}
      <div style={{
        position: 'relative', zIndex: 1, textAlign: 'center',
        opacity: cinematicStep >= 1 ? 0 : 1,
        transform: cinematicStep >= 1 ? 'scale(0.95)' : 'scale(1)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        <h1 style={{
          fontSize: 42, margin: 0, lineHeight: 1.1, letterSpacing: '-0.03em',
          color: '#f1f5f9',
        }}>
          <span style={{ fontWeight: 800 }}>Orca</span>
          <span style={{ fontWeight: 300, marginInlineStart: 10, color: '#94a3b8' }}>Investment</span>
        </h1>
        <p style={{
          fontSize: 12, color: '#64748b', letterSpacing: '0.2em',
          textTransform: 'uppercase', marginTop: 10, marginBottom: 48,
        }}>
          {isRTL ? 'מסוף מודיעין מסחרי' : 'Trading Intelligence Terminal'}
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
            {isRTL ? 'כניסה למערכת' : 'Access Platform'}
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
                  background: i <= msgIdx ? '#06d6a0' : '#475569',
                  display: 'inline-block',
                  boxShadow: i === msgIdx ? '0 0 8px rgba(6,214,160,0.5)' : 'none',
                }} />
                {isRTL ? msg.he : msg.en}
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

      {/* Cinematic center element */}
      {cinematicStep >= 1 && cinematicStep < 3 && (
        <div style={{
          position: 'absolute', zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          animation: 'fadeIn 0.5s ease',
        }}>
          <div style={{
            fontSize: 28, fontWeight: 800, color: '#06d6a0',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '-0.02em',
            textShadow: '0 0 30px rgba(6,214,160,0.4)',
          }}>
            ORCA
          </div>
          <div style={{
            fontSize: 9, color: '#475569', letterSpacing: '0.3em',
            textTransform: 'uppercase', marginTop: 6,
          }}>
            {isRTL ? 'טוען מערכת...' : 'Loading System...'}
          </div>
        </div>
      )}

      <style>{`
        @keyframes chartDraw {
          from { stroke-dashoffset: 2000; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes candleFade {
          from { opacity: 0; transform: scaleY(0); }
          to { opacity: 0.2; transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};
