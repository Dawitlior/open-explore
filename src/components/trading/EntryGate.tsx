import { useState, useEffect, useCallback } from 'react';
import { JC, SURF, isLightScheme } from '@/lib/neon-palette';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';

interface EntryGateProps {
  onEnter: () => void;
  lang?: 'he' | 'en';
  ready?: boolean;
}

/**
 * EntryGate — premium horizontal-seam curtain split.
 *
 * Two absolute 50vh panels meet exactly at the horizontal seam. Each
 * panel clips the exact canonical OrcaBootLoader (untouched), with the
 * OI orbit aligned to the seam so the icon is physically sliced in half.
 *
 * On reveal the top panel translates -100% and the bottom +100%
 * simultaneously, carrying their halves of the icon off-screen.
 */
type Phase = 'idle' | 'loading' | 'split' | 'done';
const MIN_LOADER_MS = 900;
const SPLIT_MS = 620;
const panelBg = () => SURF.bg1;
const gateBg = () => SURF.panelGradient;
const SPLIT_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';

export const EntryGate = ({ onEnter, lang = 'he', ready = true }: EntryGateProps) => {
  const isRTL = lang === 'he';
  const [phase, setPhase] = useState<Phase>('idle');
  const [requested, setRequested] = useState(false);
  const [armed, setArmed] = useState(false);
  const handleAccess = useCallback(() => {
    setRequested(true);
    setPhase('loading');
  }, []);

  useEffect(() => {
    if (phase === 'loading') {
      // Keep the canonical Orca loader on screen for a beat (and until the
      // dashboard signals readiness) before the curtain splits open.
      let t = 0;
      const start = performance.now();
      const tryGo = () => {
        const wait = Math.max(0, MIN_LOADER_MS - (performance.now() - start));
        t = window.setTimeout(() => setPhase('split'), wait);
      };
      if (ready) tryGo(); else t = window.setTimeout(() => setPhase('split'), 4000);
      return () => window.clearTimeout(t);
    }
    if (phase === 'split') {
      // Mount the curtain at its start position first, then arm the transform on
      // the next frame so the browser actually interpolates the reveal.
      const raf1 = requestAnimationFrame(() => requestAnimationFrame(() => setArmed(true)));
      const t = setTimeout(() => {
        setPhase('done');
        sessionStorage.setItem('orca-entered', '1');
        onEnter();
      }, SPLIT_MS + 60);
      return () => { clearTimeout(t); cancelAnimationFrame(raf1); };
    }
  }, [phase, onEnter, ready]);

  if (phase === 'idle') {
    const light = isLightScheme();
    const ink = SURF.text1;
    const reduced = typeof window !== 'undefined'
      && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        || document.body?.getAttribute('data-reduce-motion') === '1');
    const anim = (name: string, delay: number, dur = 900) =>
      reduced ? undefined : `${name} ${dur}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both`;

    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed', inset: 0, zIndex: 2147483647,
          width: '100vw', height: '100dvh',
          background: gateBg(),
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'JetBrains Mono', 'Inter', monospace",
          overflow: 'hidden',
        }}
      >
        <style>{`
          @keyframes orca-gate-rise { from { opacity:0; transform: translateY(18px); } to { opacity:1; transform:none; } }
          @keyframes orca-gate-line { from { transform: scaleX(0); opacity:0; } to { transform: scaleX(1); opacity:1; } }
          @keyframes orca-gate-breathe { 0%,100% { transform: scale(1); opacity:.55; } 50% { transform: scale(1.12); opacity:.9; } }
          @keyframes orca-gate-drift { 0% { transform: translate3d(-2%, 0, 0); } 50% { transform: translate3d(2%, -1.5%, 0); } 100% { transform: translate3d(-2%, 0, 0); } }
        `}</style>

        <div aria-hidden style={{
          position: 'absolute', inset: 0, opacity: light ? 0.05 : 0.045,
          backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          color: JC.blue,
          maskImage: 'radial-gradient(70% 60% at 50% 45%, #000 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(70% 60% at 50% 45%, #000 30%, transparent 100%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
          {/* breathing mark */}
          <div aria-hidden style={{ display: 'flex', justifyContent: 'center', marginBottom: 30, animation: anim('orca-gate-rise', 0, 700) }}>
            <span style={{
              width: 12, height: 12, borderRadius: 999,
              background: JC.green,
              boxShadow: light ? `0 0 0 10px ${SURF.border}` : `0 0 34px ${JC.green}66`,
              animation: reduced ? undefined : 'orca-gate-breathe 3.4s ease-in-out infinite',
            }} />
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 7vw, 54px)', margin: 0, lineHeight: 1.05, letterSpacing: '-0.045em', color: ink,
            animation: anim('orca-gate-rise', 90),
          }}>
            <span style={{ fontWeight: 800 }}>Orca</span>
            <span style={{ fontWeight: 200, marginInlineStart: 12, color: SURF.text2 }}>Investment</span>
          </h1>

          <div aria-hidden style={{
            width: 'min(280px, 60vw)', height: 1, margin: '22px auto 0',
            background: `linear-gradient(90deg, transparent, ${light ? 'rgba(55,48,163,0.35)' : 'rgba(6,214,160,0.5)'}, transparent)`,
            transformOrigin: 'center',
            animation: anim('orca-gate-line', 220, 1000),
          }} />

          <p style={{
            fontSize: 11.5, color: SURF.text3, letterSpacing: '0.28em', textTransform: 'uppercase',
            marginTop: 18, marginBottom: 46,
            animation: anim('orca-gate-rise', 300),
          }}>
            {isRTL ? 'מסוף מודיעין מסחרי' : 'Trading Intelligence Terminal'}
          </p>

          <div style={{ animation: anim('orca-gate-rise', 420) }}>
            <button
              onClick={handleAccess}
              disabled={requested && !ready}
              onMouseEnter={e => { if (!reduced) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
              style={{
                padding: '15px 52px',
                background: JC.green,
                border: 'none', borderRadius: 999,
                color: JC.onAccent, fontSize: 13.5, fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: requested && !ready ? 'wait' : 'pointer', letterSpacing: '0.08em',
                transition: reduced ? 'none' : 'transform .25s cubic-bezier(0.22,1,0.36,1), box-shadow .25s ease',
                boxShadow: light
                  ? '0 12px 30px -12px rgba(79,70,229,0.55)'
                  : '0 0 44px rgba(6,214,160,0.22), 0 10px 26px -12px rgba(0,0,0,0.6)',
              }}
            >
              {requested && !ready ? (isRTL ? 'מכין את המסוף…' : 'Preparing terminal…') : (isRTL ? 'כניסה למערכת' : 'Access Platform')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done') return null;

  const isSplitting = phase === 'split' && armed;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483647,
        width: '100vw', height: '100dvh',
        overflow: 'hidden',
        pointerEvents: 'auto',
        background: 'transparent',
        contain: 'strict',
      }}
    >
      {/* Curtain halves, each clipping one half of the canonical Orca loader
          so the mark is physically sliced at the seam and carried off-screen. */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100vw', height: '50dvh',
        background: panelBg(),
        overflow: 'hidden',
        transform: isSplitting ? 'translateY(-100%)' : 'translateY(0)',
        transition: `transform ${SPLIT_MS}ms ${SPLIT_EASING}`,
        willChange: 'transform',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100dvh' }}>
          <OrcaBootLoader frame="absolute" />
        </div>
      </div>

      {/* BOTTOM PANEL — animates DOWN, shows bottom half of loader */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100vw', height: '50dvh',
        background: panelBg(),
        overflow: 'hidden',
        transform: isSplitting ? 'translateY(100%)' : 'translateY(0)',
        transition: `transform ${SPLIT_MS}ms ${SPLIT_EASING}`,
        willChange: 'transform',
      }}>
        <div style={{ position: 'absolute', top: '-50dvh', left: 0, width: '100vw', height: '100dvh' }}>
          <OrcaBootLoader frame="absolute" />
        </div>
      </div>

    </div>
  );
};
