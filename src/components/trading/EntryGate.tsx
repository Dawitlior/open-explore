import { useState, useEffect, useCallback } from 'react';
import { SURF } from '@/lib/neon-palette';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';
import orcaClay from '@/assets/orca-clay.png';


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
    const reduced = typeof window !== 'undefined'
      && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        || document.body?.getAttribute('data-reduce-motion') === '1');
    const anim = (name: string, delay: number, dur = 900) =>
      reduced ? undefined : `${name} ${dur}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both`;

    /* Claymorphism palette — charcoal clay canvas, mint + deep teal accents */
    const CLAY_BG = '#22282b';
    const CLAY_BG_2 = '#1a1f22';
    const CLAY_SURF = '#2b3236';
    const MINT = '#8fe3c2';
    const MINT_DEEP = '#57bd9a';
    const TEAL = '#175f63';
    const CLAY_TEXT = '#f2f6f5';
    const CLAY_MUTED = '#9aa8a6';
    const clayUp = (r: number) =>
      `${r}px ${r}px ${r * 2}px rgba(0,0,0,0.55), -${r}px -${r}px ${r * 2}px rgba(255,255,255,0.045), inset 2px 2px 4px rgba(255,255,255,0.05), inset -3px -3px 6px rgba(0,0,0,0.35)`;

    // Deterministic sculpted candle field (no randomness → no hydration jitter).
    const candles = Array.from({ length: 22 }, (_, i) => {
      const s = (i * 9301 + 49297) % 233280 / 233280;
      const s2 = ((i + 7) * 4021 + 1721) % 99991 / 99991;
      return {
        h: 34 + s * 120,
        lift: Math.sin(i * 0.7) * 26 + s2 * 20,
        up: s2 > 0.45,
        d: i * 70,
      };
    });

    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed', inset: 0, zIndex: 2147483647,
          width: '100vw', height: '100dvh',
          background: `radial-gradient(120% 90% at 50% 115%, #2f4d4a 0%, ${CLAY_BG} 45%, ${CLAY_BG_2} 100%)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: isRTL
            ? "'Heebo', 'Assistant', 'Poppins', system-ui, sans-serif"
            : "'Poppins', 'Heebo', system-ui, sans-serif",
          overflow: 'hidden',
        }}
      >
        <style>{`
          @keyframes orca-clay-rise { from { opacity:0; transform: translateY(26px) scale(.97); } to { opacity:1; transform:none; } }
          @keyframes orca-clay-float { 0%,100% { transform: translateY(0) rotate(-1.2deg); } 50% { transform: translateY(-16px) rotate(1.4deg); } }
          @keyframes orca-clay-grow { from { transform: scaleY(0.15); opacity:0; } to { transform: scaleY(1); opacity:1; } }
          @keyframes orca-clay-breathe { 0%,100% { opacity:.5; transform: scale(.95); } 50% { opacity:.85; transform: scale(1.05); } }
          .orca-clay-btn { transition: transform .22s cubic-bezier(0.22,1,0.36,1), box-shadow .22s ease; }
          .orca-clay-btn:hover:not(:disabled) { transform: translateY(-3px); }
          .orca-clay-btn:active:not(:disabled) { transform: translateY(2px); box-shadow: inset 6px 6px 14px rgba(0,0,0,0.45), inset -6px -6px 14px rgba(255,255,255,0.12) !important; }
        `}</style>

        {/* Soft-sculpted clay grid */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, opacity: 0.5,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.035) 2px, transparent 2px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 2px, transparent 2px),
            linear-gradient(rgba(0,0,0,0.45) 4px, transparent 4px),
            linear-gradient(90deg, rgba(0,0,0,0.45) 4px, transparent 4px)`,
          backgroundSize: '82px 82px, 82px 82px, 82px 82px, 82px 82px',
          backgroundPosition: '0 0, 0 0, 0 2px, 2px 0',
          maskImage: 'radial-gradient(90% 80% at 50% 45%, #000 20%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(90% 80% at 50% 45%, #000 20%, transparent 100%)',
        }} />

        {/* Sculpted 3D candlestick wave across the lower half */}
        <div aria-hidden style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          gap: 'clamp(6px, 1.4vw, 18px)', padding: '0 3vw',
          maskImage: 'linear-gradient(180deg, transparent, #000 45%, #000)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 45%, #000)',
        }}>
          {candles.map((c, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              marginBottom: c.lift,
              transformOrigin: 'bottom',
              animation: reduced ? undefined : `orca-clay-grow 900ms cubic-bezier(0.22,1,0.36,1) ${c.d}ms both`,
            }}>
              {/* upper wick */}
              <div style={{
                width: 4, height: 12 + (c.h % 17), borderRadius: 999,
                background: c.up ? MINT_DEEP : TEAL, opacity: 0.7,
                boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.25), 2px 3px 6px rgba(0,0,0,0.45)',
              }} />
              {/* body */}
              <div style={{
                width: 'clamp(10px, 2.2vw, 26px)',
                height: c.h,
                borderRadius: 8,
                background: c.up
                  ? `linear-gradient(160deg, ${MINT} 0%, ${MINT_DEEP} 100%)`
                  : `linear-gradient(160deg, #2b7c7f 0%, ${TEAL} 100%)`,
                boxShadow: '10px 12px 22px rgba(0,0,0,0.5), inset 2px 2px 5px rgba(255,255,255,0.35), inset -3px -4px 8px rgba(0,0,0,0.3)',
                opacity: 0.75,
              }} />
              {/* lower wick */}
              <div style={{
                width: 4, height: 9 + (c.h % 13), borderRadius: 999,
                background: c.up ? MINT_DEEP : TEAL, opacity: 0.7,
                boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.25), 2px 3px 6px rgba(0,0,0,0.45)',
              }} />
            </div>
          ))}
        </div>

        {/* Perimeter clay chrome — top-left tactile chips */}
        <div aria-hidden style={{
          position: 'absolute', top: 20, insetInlineStart: 20, display: 'flex', gap: 10,
          animation: anim('orca-clay-rise', 820),
        }}>
          {['⚙', '👤'].map(g => (
            <div key={g} style={{
              width: 42, height: 42, borderRadius: 16, display: 'grid', placeItems: 'center',
              background: CLAY_SURF, color: CLAY_MUTED, fontSize: 16,
              boxShadow: clayUp(6),
            }}>{g}</div>
          ))}
        </div>

        {/* Perimeter clay chrome — top-right minimal sculpted chip */}
        <div aria-hidden style={{
          position: 'absolute', top: 20, insetInlineEnd: 20,
          width: 42, height: 42, borderRadius: 16, display: 'grid', placeItems: 'center',
          background: CLAY_SURF, boxShadow: clayUp(6), color: CLAY_MUTED, fontSize: 16,
          animation: anim('orca-clay-rise', 860),
        }}>
          ◎
        </div>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
          {/* Sculpted clay orca */}
          <div aria-hidden style={{
            position: 'relative', display: 'flex', justifyContent: 'center',
            marginBottom: 10, animation: anim('orca-clay-rise', 0, 1100),
          }}>
            <div style={{
              position: 'absolute', bottom: 6, width: '52%', height: 26, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,0,0,0.55), transparent 70%)',
              filter: 'blur(12px)',
              animation: reduced ? undefined : 'orca-clay-breathe 7s ease-in-out infinite',
            }} />
            <img
              src={orcaClay}
              alt=""
              width={1024}
              height={768}
              style={{
                position: 'relative', width: 'min(262px, 50vw)', height: 'auto',
                filter: 'drop-shadow(0 24px 34px rgba(0,0,0,0.55))',
                animation: reduced ? undefined : 'orca-clay-float 8s ease-in-out infinite',
              }}
            />
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 6.6vw, 56px)', margin: 0, lineHeight: 1.05,
            letterSpacing: '-0.02em', color: CLAY_TEXT, fontWeight: 700,
            textShadow: '0 3px 0 rgba(0,0,0,0.35), 0 10px 22px rgba(0,0,0,0.45), 0 -1px 0 rgba(255,255,255,0.25)',
            animation: anim('orca-clay-rise', 200),
          }}>
            <span style={{ fontWeight: 800 }}>Orca</span>
            <span style={{ fontWeight: 300, marginInlineStart: 12, color: '#cfe0dc' }}>Investment</span>
          </h1>

          <p style={{
            fontSize: 12, color: '#d3e0dd', fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase',
            marginTop: 16, marginBottom: 40, textShadow: '0 1px 2px rgba(0,0,0,0.65)',
            animation: anim('orca-clay-rise', 430),
          }}>
            {isRTL ? 'מסוף מודיעין מסחרי' : 'Trading Intelligence Terminal'}
          </p>

          <div style={{ animation: anim('orca-clay-rise', 560) }}>
            <button
              className="orca-clay-btn"
              onClick={handleAccess}
              disabled={requested && !ready}
              style={{
                padding: '18px 56px',
                background: `linear-gradient(160deg, ${MINT} 0%, ${MINT_DEEP} 100%)`,
                border: 'none',
                borderRadius: 26,
                color: '#0f2b25',
                fontSize: 15, fontWeight: 700,
                fontFamily: "'Poppins', system-ui, sans-serif",
                cursor: requested && !ready ? 'wait' : 'pointer', letterSpacing: '0.06em',
                textShadow: '0 1px 0 rgba(255,255,255,0.45)',
                boxShadow: '12px 14px 28px rgba(0,0,0,0.55), -6px -6px 18px rgba(255,255,255,0.06), inset 3px 3px 6px rgba(255,255,255,0.45), inset -4px -6px 12px rgba(0,0,0,0.22)',
              }}
            >
              {requested && !ready ? (isRTL ? 'מכין את המסוף…' : 'Preparing terminal…') : (isRTL ? 'כניסה למערכת' : 'Access Platform')}
            </button>
          </div>

          <p style={{
            marginTop: 26, marginBottom: 0, fontSize: 12, color: '#c8d6d3', fontWeight: 500,
            textShadow: '0 1px 0 rgba(0,0,0,0.5)',
            animation: anim('orca-clay-rise', 700),
          }}>
            {isRTL ? 'לשימוש מקצועי בלבד' : 'Professional use only'}
          </p>
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
