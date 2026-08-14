import { useState, useEffect, useCallback } from 'react';
import { JC, SURF, isLightScheme } from '@/lib/neon-palette';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';
import orcaWire from '@/assets/orca-wire.png';

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
    const accent = JC.green;

    // Deterministic candlestick field (no randomness → no hydration jitter).
    const candles = Array.from({ length: 26 }, (_, i) => {
      const seed = (i * 9301 + 49297) % 233280 / 233280;
      const seed2 = ((i + 7) * 4021 + 1721) % 99991 / 99991;
      const mid = 40 + seed * 40;
      const body = 6 + seed2 * 16;
      const wick = body + 6 + seed * 14;
      return { x: 2 + i * 3.85, mid, body, wick, up: seed2 > 0.45 };
    });

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
          @keyframes orca-gate-drift { 0% { transform: translate3d(-1.5%, 0, 0); } 50% { transform: translate3d(1.5%, -1.2%, 0); } 100% { transform: translate3d(-1.5%, 0, 0); } }
          @keyframes orca-gate-draw { from { stroke-dashoffset: 1200; } to { stroke-dashoffset: 0; } }
          @keyframes orca-gate-float { 0%,100% { transform: translateY(0) rotate(-.4deg); } 50% { transform: translateY(-12px) rotate(.6deg); } }
          @keyframes orca-gate-glow { 0%,100% { opacity:.35; transform: scale(.92); } 50% { opacity:.75; transform: scale(1.06); } }
          @keyframes orca-gate-halo { 0%,100% { box-shadow:0 0 0 0 ${accent}00, 0 0 34px ${accent}30; } 50% { box-shadow:0 0 0 6px ${accent}14, 0 0 60px ${accent}55; } }
          @keyframes orca-gate-scan { 0% { transform: translateY(-20%); opacity:0; } 30% { opacity:.5; } 100% { transform: translateY(120%); opacity:0; } }
        `}</style>

        {/* Grid */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, opacity: light ? 0.06 : 0.07,
          backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '68px 68px',
          color: accent,
          maskImage: 'radial-gradient(80% 70% at 50% 45%, #000 25%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(80% 70% at 50% 45%, #000 25%, transparent 100%)',
        }} />

        {/* Market backdrop: candles + drawn wave lines */}
        <svg
          aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: light ? 0.22 : 0.3,
            animation: reduced ? undefined : 'orca-gate-drift 26s ease-in-out infinite',
          }}
        >
          {candles.map((c, i) => (
            <g key={i} stroke={c.up ? accent : JC.blue} strokeWidth={0.22} opacity={0.5}>
              <line x1={c.x} x2={c.x} y1={c.mid - c.wick / 2} y2={c.mid + c.wick / 2} />
              <rect
                x={c.x - 0.9} y={c.mid - c.body / 2} width={1.8} height={c.body}
                fill="none"
              />
            </g>
          ))}
          {[0, 1, 2].map(k => (
            <path
              key={k}
              d={`M0 ${58 + k * 7} C 18 ${40 + k * 6}, 32 ${74 - k * 4}, 50 ${56 + k * 5} S 82 ${34 + k * 8}, 100 ${52 + k * 6}`}
              fill="none" stroke={k === 1 ? accent : SURF.text3}
              strokeWidth={0.35} opacity={0.55}
              strokeDasharray="1200" 
              style={{ animation: reduced ? undefined : `orca-gate-draw ${2600 + k * 700}ms ease-out ${k * 220}ms both` }}
            />
          ))}
        </svg>

        {/* Soft scanline sweep */}
        {!reduced && (
          <div aria-hidden style={{
            position: 'absolute', left: 0, right: 0, height: '38%',
            background: `linear-gradient(180deg, transparent, ${accent}12, transparent)`,
            animation: 'orca-gate-scan 7s ease-in-out infinite',
          }} />
        )}

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
          {/* Orca wireframe mark */}
          <div aria-hidden style={{
            position: 'relative', display: 'flex', justifyContent: 'center',
            marginBottom: 18, animation: anim('orca-gate-rise', 0, 1100),
          }}>
            <div style={{
              position: 'absolute', width: 220, height: 120, borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}33, transparent 70%)`,
              filter: 'blur(18px)',
              animation: reduced ? undefined : 'orca-gate-glow 5s ease-in-out infinite',
            }} />
            <img
              src={orcaWire}
              alt=""
              width={1024}
              height={768}
              style={{
                position: 'relative', width: 'min(200px, 46vw)', height: 'auto',
                filter: light
                  ? 'grayscale(.2) brightness(.55)'
                  : `drop-shadow(0 0 14px ${accent}55)`,
                animation: reduced ? undefined : 'orca-gate-float 7s ease-in-out infinite',
              }}
            />
          </div>

          <h1 style={{
            fontSize: 'clamp(30px, 6.4vw, 52px)', margin: 0, lineHeight: 1.05, letterSpacing: '-0.02em', color: ink,
            animation: anim('orca-gate-rise', 200),
          }}>
            <span style={{ fontWeight: 800 }}>Orca</span>
            <span style={{ fontWeight: 200, marginInlineStart: 12, color: SURF.text2 }}>Investment</span>
          </h1>

          <div aria-hidden style={{
            width: 'min(300px, 62vw)', height: 1, margin: '22px auto 0',
            background: `linear-gradient(90deg, transparent, ${light ? 'rgba(55,48,163,0.35)' : `${accent}88`}, transparent)`,
            transformOrigin: 'center',
            animation: anim('orca-gate-line', 340, 1100),
          }} />

          <p style={{
            fontSize: 11.5, color: SURF.text3, letterSpacing: '0.3em', textTransform: 'uppercase',
            marginTop: 18, marginBottom: 44,
            animation: anim('orca-gate-rise', 430),
          }}>
            {isRTL ? 'מסוף מודיעין מסחרי' : 'Trading Intelligence Terminal'}
          </p>

          <div style={{ animation: anim('orca-gate-rise', 560) }}>
            <button
              onClick={handleAccess}
              disabled={requested && !ready}
              onMouseEnter={e => { if (!reduced) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
              style={{
                padding: '15px 52px',
                background: light ? JC.green : `linear-gradient(180deg, ${accent}22, ${accent}0d)`,
                border: light ? 'none' : `1px solid ${accent}99`,
                borderRadius: 999,
                color: light ? JC.onAccent : accent,
                fontSize: 13.5, fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: requested && !ready ? 'wait' : 'pointer', letterSpacing: '0.12em',
                transition: reduced ? 'none' : 'transform .25s cubic-bezier(0.22,1,0.36,1), box-shadow .25s ease',
                animation: reduced || light ? undefined : 'orca-gate-halo 3.6s ease-in-out infinite',
                boxShadow: light ? '0 12px 30px -12px rgba(79,70,229,0.55)' : undefined,
              }}
            >
              {requested && !ready ? (isRTL ? 'מכין את המסוף…' : 'Preparing terminal…') : (isRTL ? 'כניסה למערכת' : 'Access Platform')}
            </button>
          </div>

          <p style={{
            marginTop: 30, marginBottom: 0, fontSize: 11.5, color: SURF.text3,
            fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.01em',
            animation: anim('orca-gate-rise', 700),
          }}>
            {isRTL ? 'פלטפורמת ניתוח מסחר — לשימוש מקצועי בלבד.' : 'Professional trading analytics terminal.'}
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
