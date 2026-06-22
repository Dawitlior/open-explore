import { useState, useEffect, useCallback } from 'react';

interface EntryGateProps {
  onEnter: () => void;
  lang?: 'he' | 'en';
}

/**
 * EntryGate — premium curtain-split reveal.
 *
 * Phases:
 *  - idle      : platform branding + Access button.
 *  - spinning  : full dark overlay, OI spinner rotating at full speed.
 *  - slowing   : spinner decelerates smoothly to a complete halt (1.5s).
 *  - split     : two stacked halves (top + bottom) of the dark overlay slide
 *                vertically apart, cleanly cutting the static OI in half.
 *  - done      : overlay unmounts, platform becomes interactive.
 */
type Phase = 'idle' | 'spinning' | 'slowing' | 'split' | 'done';

const SPIN_FULL_MS = 2400;
const SPIN_DECEL_MS = 1500;
const SPLIT_MS = 850;

export const EntryGate = ({ onEnter, lang = 'he' }: EntryGateProps) => {
  const isRTL = lang === 'he';
  const [phase, setPhase] = useState<Phase>('idle');

  const handleAccess = useCallback(() => setPhase('spinning'), []);

  useEffect(() => {
    if (phase === 'spinning') {
      const t = setTimeout(() => setPhase('slowing'), SPIN_FULL_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'slowing') {
      const t = setTimeout(() => setPhase('split'), SPIN_DECEL_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'split') {
      const t = setTimeout(() => {
        setPhase('done');
        sessionStorage.setItem('orca-entered', '1');
        onEnter();
      }, SPLIT_MS);
      return () => clearTimeout(t);
    }
  }, [phase, onEnter]);

  // Idle splash — branding + Access button
  if (phase === 'idle') {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'radial-gradient(ellipse at 50% 30%, #0f1528 0%, #070b14 50%, #030508 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'JetBrains Mono', 'Inter', monospace",
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(6,214,160,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,214,160,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <h1 style={{ fontSize: 42, margin: 0, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#f1f5f9' }}>
            <span style={{ fontWeight: 800 }}>Orca</span>
            <span style={{ fontWeight: 300, marginInlineStart: 10, color: '#94a3b8' }}>Investment</span>
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 10, marginBottom: 48 }}>
            {isRTL ? 'מסוף מודיעין מסחרי' : 'Trading Intelligence Terminal'}
          </p>
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
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {isRTL ? 'כניסה למערכת' : 'Access Platform'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'done') return null;

  const isSplitting = phase === 'split';
  const spinnerAnim =
    phase === 'spinning'
      ? 'oi-spin 0.9s linear infinite'
      : phase === 'slowing'
        ? `oi-spin-decel ${SPIN_DECEL_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`
        : 'none';

  // Shared inner content (spinner + halo) — rendered identically in both halves
  // so they line up pixel-perfectly when the curtains split.
  const innerContent = (
    <div style={{
      position: 'absolute', top: '50vh', left: '50vw',
      transform: 'translate(-50%, -50%)',
      width: 'clamp(96px, 22vmin, 168px)',
      height: 'clamp(96px, 22vmin, 168px)',
      pointerEvents: 'none',
    }}>
      {/* Outer ring */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '2px solid rgba(6,214,160,0.13)',
        borderTopColor: '#06d6a0',
        animation: spinnerAnim,
        boxShadow: '0 0 24px rgba(6,214,160,0.15)',
      }} />
      {/* Inner counter-ring */}
      <div style={{
        position: 'absolute', inset: '12%', borderRadius: '50%',
        border: '2px solid rgba(6,214,160,0.13)',
        borderBottomColor: '#06d6a0',
        opacity: 0.75,
        animation: phase === 'spinning'
          ? 'oi-spin-rev 1.3s linear infinite'
          : phase === 'slowing'
            ? `oi-spin-rev-decel ${SPIN_DECEL_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`
            : 'none',
      }} />
      {/* OI mark */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#06d6a0',
        filter: 'drop-shadow(0 0 14px rgba(6,214,160,0.55))',
        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
        fontSize: 'clamp(18px, 4.2vmin, 30px)',
        fontWeight: 800, letterSpacing: '0.15em',
      }}>
        OI
      </div>
    </div>
  );

  const halfBg = '#020408';
  const easing = 'cubic-bezier(0.77, 0, 0.175, 1)';

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        overflow: 'hidden',
        pointerEvents: phase === 'split' ? 'none' : 'auto',
      }}
    >
      {/* TOP HALF curtain — clips the inner content to the upper 50vh */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '50vh',
        background: halfBg,
        overflow: 'hidden',
        transform: isSplitting ? 'translateY(-100%)' : 'translateY(0)',
        transition: `transform ${SPLIT_MS}ms ${easing}`,
        willChange: 'transform',
      }}>
        {innerContent}
      </div>

      {/* BOTTOM HALF curtain — clips the inner content to the lower 50vh */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '50vh',
        background: halfBg,
        overflow: 'hidden',
        transform: isSplitting ? 'translateY(100%)' : 'translateY(0)',
        transition: `transform ${SPLIT_MS}ms ${easing}`,
        willChange: 'transform',
      }}>
        {/* Shift the inner content up by 50vh so its absolute top:50vh lands
            exactly on this half's top edge — pairing perfectly with the top
            half above for a seamless cut. */}
        <div style={{ position: 'absolute', inset: 0, transform: 'translateY(-50vh)' }}>
          {innerContent}
        </div>
      </div>

      <style>{`
        @keyframes oi-spin { to { transform: rotate(360deg); } }
        @keyframes oi-spin-rev { to { transform: rotate(-360deg); } }
        @keyframes oi-spin-decel {
          from { transform: rotate(0deg); }
          to   { transform: rotate(540deg); }
        }
        @keyframes oi-spin-rev-decel {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-420deg); }
        }
      `}</style>
    </div>
  );
};
