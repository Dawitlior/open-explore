import { useState, useEffect, useCallback } from 'react';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';

interface EntryGateProps {
  onEnter: () => void;
  lang?: 'he' | 'en';
}

/**
 * EntryGate — premium horizontal-seam curtain split.
 *
 * Two 50vh black panels sit flush against each other, each containing
 * the EXACT canonical OrcaBootLoader (untouched). Each panel pins a
 * full-viewport wrapper to its own edge, so the loader's centered icon
 * is physically sliced by the seam at 50vh — the top panel shows the
 * upper half, the bottom panel shows the lower half. They appear as
 * one continuous, perfectly centered icon.
 *
 * On reveal the top panel translates -100% and the bottom +100%
 * simultaneously, carrying their halves of the icon off-screen.
 */
type Phase = 'idle' | 'spin' | 'settle' | 'split' | 'done';

const SPIN_MS = 2000;
const SETTLE_MS = 1200;
const SPLIT_MS = 800;

export const EntryGate = ({ onEnter, lang = 'he' }: EntryGateProps) => {
  const isRTL = lang === 'he';
  const [phase, setPhase] = useState<Phase>('idle');

  const handleAccess = useCallback(() => setPhase('spin'), []);

  useEffect(() => {
    if (phase === 'spin') {
      const t = setTimeout(() => setPhase('settle'), SPIN_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'settle') {
      const t = setTimeout(() => setPhase('split'), SETTLE_MS);
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
            }}
          >
            {isRTL ? 'כניסה למערכת' : 'Access Platform'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'done') return null;

  const isSplitting = phase === 'split';
  const easing = 'cubic-bezier(0.65, 0, 0.35, 1)';

  // Decelerate-to-halt: during the "settle" phase we layer a backdrop
  // that fades in nothing visible — the loader keeps spinning untouched
  // (per the rule that OrcaBootLoader must not be modified). The visual
  // halt is implicit: the split begins exactly when the user expects it.

  // Each panel hosts a transformed wrapper. Because the wrapper has its
  // own transform, the OrcaBootLoader's `position: fixed` is scoped to
  // that wrapper (not the panel), so it lays out across a full viewport
  // box pinned to the seam edge — giving us a perfect anatomical slice.
  const fullViewportWrapper = (edge: 'top' | 'bottom'): React.CSSProperties => ({
    position: 'absolute',
    left: 0,
    width: '100vw',
    height: '100vh',
    transform: 'translateZ(0)', // creates containing block for fixed children
    ...(edge === 'top' ? { bottom: 0 } : { top: 0 }),
  });

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* TOP PANEL — animates UP, shows top half of icon */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '50vh',
        background: '#000',
        overflow: 'hidden',
        transform: isSplitting ? 'translateY(-100%)' : 'translateY(0)',
        transition: `transform ${SPLIT_MS}ms ${easing}`,
        willChange: 'transform',
      }}>
        <div style={fullViewportWrapper('top')}>
          <OrcaBootLoader />
        </div>
      </div>

      {/* BOTTOM PANEL — animates DOWN, shows bottom half of icon */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '50vh',
        background: '#000',
        overflow: 'hidden',
        transform: isSplitting ? 'translateY(100%)' : 'translateY(0)',
        transition: `transform ${SPLIT_MS}ms ${easing}`,
        willChange: 'transform',
      }}>
        <div style={fullViewportWrapper('bottom')}>
          <OrcaBootLoader />
        </div>
      </div>
    </div>
  );
};
