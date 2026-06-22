import { useState, useEffect, useCallback } from 'react';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';

interface EntryGateProps {
  onEnter: () => void;
  lang?: 'he' | 'en';
}

/**
 * EntryGate — premium curtain-split reveal.
 *
 * The loading indicator is the platform's canonical OrcaBootLoader —
 * the exact same spinner used across page refreshes and dimension
 * transitions. We DO NOT recreate or restyle it; we only wrap it
 * with the curtain-split overlay logic.
 *
 * Phases:
 *  - idle    : branding + Access button.
 *  - loading : full dark overlay with OrcaBootLoader centered.
 *  - split   : overlay splits horizontally at 50vh; the OrcaBootLoader
 *              remains rendered in both halves so it visually stays put
 *              while the curtains pull away around it.
 *  - done    : overlay unmounts.
 */
type Phase = 'idle' | 'loading' | 'split' | 'done';

const LOAD_MS = 2200;
const SPLIT_MS = 900;

export const EntryGate = ({ onEnter, lang = 'he' }: EntryGateProps) => {
  const isRTL = lang === 'he';
  const [phase, setPhase] = useState<Phase>('idle');

  const handleAccess = useCallback(() => setPhase('loading'), []);

  useEffect(() => {
    if (phase === 'loading') {
      const t = setTimeout(() => setPhase('split'), LOAD_MS);
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
      {/* TOP HALF curtain — the transform here creates a containing block,
          so the OrcaBootLoader's position:fixed is scoped to this half. */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '50vh',
        overflow: 'hidden',
        transform: isSplitting ? 'translateY(-100%)' : 'translateY(0)',
        transition: `transform ${SPLIT_MS}ms ${easing}`,
        willChange: 'transform',
      }}>
        <OrcaBootLoader />
      </div>

      {/* BOTTOM HALF curtain */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '50vh',
        overflow: 'hidden',
        transform: isSplitting ? 'translateY(100%)' : 'translateY(0)',
        transition: `transform ${SPLIT_MS}ms ${easing}`,
        willChange: 'transform',
      }}>
        {/* Shift the inner loader up by 50vh so its viewport-centered
            position lands exactly on this half's top edge — pairing
            seamlessly with the top half above. */}
        <div style={{ position: 'absolute', inset: 0, transform: 'translateY(-50vh)' }}>
          <OrcaBootLoader />
        </div>
      </div>
    </div>
  );
};
