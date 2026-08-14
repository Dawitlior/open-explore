import { useState, useEffect, useCallback } from 'react';
import { SURF } from '@/lib/neon-palette';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';
import orcaLowPoly from '@/assets/orca-lowpoly.png';


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

    /* Bright deep-navy terminal with mint topography */
    const MINT = '#3FE0BE';
    const TEXT = '#EAF4FF';
    const MUTED = '#9FB4CC';
    const LINE = 'rgba(120,190,215,0.20)';

    // Flowing topographic contours (deterministic layered sine bands).
    const CW = 1200, CH = 800;
    const contours = Array.from({ length: 22 }, (_, k) => {
      const base = 60 + k * 34;
      const pts = Array.from({ length: 41 }, (_, i) => {
        const x = (i / 40) * CW;
        const y =
          base +
          Math.sin(i * 0.34 + k * 0.42) * (26 + k * 1.4) +
          Math.sin(i * 0.11 + k * 0.9) * 34 +
          Math.cos(i * 0.63 + k * 0.2) * 8;
        return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return pts.join(' ');
    });

    // Faint background candle tape.
    const NC = 46;
    const candles = (() => {
      let px = 420;
      return Array.from({ length: NC }, (_, i) => {
        const o = px;
        const c = px + Math.sin(i * 0.71) * 22 + Math.cos(i * 0.23) * 14;
        px = c;
        const amp = 8 + Math.abs(Math.sin(i * 1.7)) * 18;
        return { o, c, h: Math.max(o, c) + amp, l: Math.min(o, c) - amp };
      });
    })();

    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed', inset: 0, zIndex: 2147483647,
          width: '100vw', height: '100dvh',
          background: 'linear-gradient(165deg, #16304A 0%, #12283E 28%, #0E2033 58%, #142C4A 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: isRTL
            ? "'Heebo', 'Assistant', 'Poppins', system-ui, sans-serif"
            : "'Poppins', 'Heebo', system-ui, sans-serif",
          overflow: 'hidden',
        }}
      >
        <style>{`
          @keyframes orca-hud-rise { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform:none; } }
          @keyframes orca-hud-fade { from { opacity:0; } to { opacity:1; } }
          @keyframes orca-hud-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          @keyframes orca-hud-draw { from { stroke-dashoffset: 3000; } to { stroke-dashoffset: 0; } }
          @keyframes orca-hud-glow { 0%,100% { box-shadow: 0 0 22px rgba(63,224,190,0.22), inset 0 0 18px rgba(63,224,190,0.06); } 50% { box-shadow: 0 0 40px rgba(63,224,190,0.38), inset 0 0 22px rgba(63,224,190,0.10); } }
          .orca-hud-btn { transition: background .2s ease, border-color .2s ease, transform .12s ease, color .2s ease; }
          .orca-hud-btn:hover:not(:disabled) { background: rgba(63,224,190,0.14); border-color: rgba(63,224,190,0.95); color: #FFFFFF; }
          .orca-hud-btn:active:not(:disabled) { transform: translateY(1px); }
        `}</style>

        {/* Topographic contour field */}
        <svg
          aria-hidden
          viewBox={`0 0 ${CW} ${CH}`}
          preserveAspectRatio="xMidYMid slice"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}
        >
          {contours.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={LINE}
              strokeWidth={1}
              strokeDasharray={3000}
              style={{ animation: reduced ? undefined : `orca-hud-draw 2600ms cubic-bezier(0.22,1,0.36,1) ${i * 45}ms both` }}
            />
          ))}
        </svg>

        {/* Faint candle tape */}
        <svg
          aria-hidden
          viewBox={`0 0 ${CW} ${CH}`}
          preserveAspectRatio="xMidYMid slice"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.14 }}
        >
          {candles.map((s, i) => {
            const x = (i + 0.5) * (CW / NC);
            const yT = Math.min(s.o, s.c), yB = Math.max(s.o, s.c);
            return (
              <g key={i} stroke="#CFE6F5" fill="none" strokeWidth={1}>
                <line x1={x} x2={x} y1={s.l} y2={s.h} />
                <rect x={x - 5} y={yT} width={10} height={Math.max(1.5, yB - yT)} />
              </g>
            );
          })}
        </svg>

        {/* Soft grid */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, opacity: 0.35,
          backgroundImage: `
            linear-gradient(rgba(180,215,235,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(180,215,235,0.06) 1px, transparent 1px)`,
          backgroundSize: '96px 96px, 96px 96px',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
          <img
            src={orcaLowPoly}
            alt=""
            width={1024}
            height={768}
            style={{
              display: 'block', width: 'min(240px, 52vw)', height: 'auto', margin: '0 auto 18px',
              filter: 'drop-shadow(0 0 26px rgba(63,224,190,0.35))',
              animation: reduced
                ? undefined
                : `orca-hud-rise 900ms cubic-bezier(0.22,1,0.36,1) both, orca-hud-float 9s ease-in-out 900ms infinite`,
            }}
          />

          <h1 style={{
            fontSize: 'clamp(26px, 5.2vw, 42px)', margin: 0, lineHeight: 1.1,
            color: TEXT, fontWeight: 500, letterSpacing: '0.02em',
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            animation: anim('orca-hud-rise', 160),
          }}>
            <span style={{ fontWeight: 700, color: MINT }}>Orca</span>
            <span style={{ fontWeight: 300, marginInlineStart: 12, color: '#DCE8F5' }}>Investment</span>
          </h1>

          <div aria-hidden style={{
            width: 'min(300px, 64vw)', height: 1, margin: '22px auto 0',
            background: 'linear-gradient(90deg, transparent, rgba(190,220,240,0.35), transparent)',
            animation: anim('orca-hud-fade', 320, 700),
          }} />

          <p style={{
            fontSize: 11.5, color: '#C3D6E8', fontWeight: 500, letterSpacing: '0.34em', textTransform: 'uppercase',
            marginTop: 18, marginBottom: 40,
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            animation: anim('orca-hud-rise', 380),
          }}>
            {isRTL ? 'מסוף מודיעין מסחרי' : 'Trading Intelligence Terminal'}
          </p>

          <div style={{ animation: anim('orca-hud-rise', 520) }}>
            <button
              className="orca-hud-btn"
              onClick={handleAccess}
              disabled={requested && !ready}
              style={{
                padding: '16px 46px',
                background: 'rgba(63,224,190,0.07)',
                border: `1px solid rgba(63,224,190,0.65)`,
                borderRadius: 999,
                color: MINT,
                fontSize: 14, fontWeight: 600,
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                cursor: requested && !ready ? 'wait' : 'pointer',
                letterSpacing: '0.12em',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                animation: reduced ? undefined : 'orca-hud-glow 3.4s ease-in-out infinite',
              }}
            >
              {requested && !ready ? (isRTL ? 'מכין את המסוף…' : 'Preparing terminal…') : (isRTL ? 'כניסה למערכת' : 'Access Platform')}
            </button>
          </div>

          <p style={{
            marginTop: 26, marginBottom: 0, fontSize: 11, color: MUTED, fontWeight: 500,
            letterSpacing: '0.04em',
            animation: anim('orca-hud-fade', 680, 700),
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
