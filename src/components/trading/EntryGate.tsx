import { useState, useEffect, useCallback } from 'react';
import { SURF } from '@/lib/neon-palette';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';
import orcaHud from '@/assets/orca-hud.png';


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

    /* Institutional dark-glass terminal palette — sharp, high contrast */
    const BG_0 = '#04070C';
    const BG_1 = '#070B12';
    const GLASS = 'rgba(255,255,255,0.035)';
    const HAIRLINE = 'rgba(148,180,255,0.14)';
    const CYAN = '#22D3EE';
    const TEXT = '#EAF2FF';
    const MUTED = '#93A4BC';
    const UP = '#2FBF87';
    const DOWN = '#E0556B';

    // Deterministic OHLC series (real candle geometry: wick + body, thin strokes).
    const N = 54;
    const series = (() => {
      let px = 52;
      return Array.from({ length: N }, (_, i) => {
        const w1 = Math.sin(i * 0.62) * 5.2 + Math.sin(i * 0.17) * 8 + Math.cos(i * 1.31) * 2.6;
        const o = px;
        const c = px + w1;
        px = c;
        const amp = 2 + Math.abs(Math.sin(i * 2.1)) * 4;
        return { o, c, h: Math.max(o, c) + amp, l: Math.min(o, c) - amp };
      });
    })();
    const lo = Math.min(...series.map(s => s.l));
    const hi = Math.max(...series.map(s => s.h));
    const CW = 1000, CH = 200, PAD = 8;
    const yOf = (v: number) => CH - PAD - ((v - lo) / (hi - lo || 1)) * (CH - PAD * 2);
    const step = CW / N;
    const bodyW = Math.max(3, step * 0.5);
    const closePath = series
      .map((s, i) => `${i ? 'L' : 'M'}${(i + 0.5) * step},${yOf(s.c)}`)
      .join(' ');

    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed', inset: 0, zIndex: 2147483647,
          width: '100vw', height: '100dvh',
          background: `radial-gradient(90% 70% at 50% 30%, #0B1522 0%, ${BG_1} 45%, ${BG_0} 100%)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: isRTL
            ? "'Heebo', 'Assistant', 'Poppins', system-ui, sans-serif"
            : "'Poppins', 'Heebo', system-ui, sans-serif",
          overflow: 'hidden',
        }}
      >
        <style>{`
          @keyframes orca-hud-rise { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform:none; } }
          @keyframes orca-hud-fade { from { opacity:0; } to { opacity:1; } }
          @keyframes orca-hud-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
          @keyframes orca-hud-scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(1200%); } }
          @keyframes orca-hud-draw { from { stroke-dashoffset: 2400; } to { stroke-dashoffset: 0; } }
          @keyframes orca-hud-pulse { 0%,100% { opacity:.35; } 50% { opacity:1; } }
          .orca-hud-btn { transition: border-color .2s ease, background .2s ease, box-shadow .2s ease, transform .12s ease; }
          .orca-hud-btn:hover:not(:disabled) { background: rgba(34,211,238,0.12); border-color: rgba(34,211,238,0.75); box-shadow: 0 0 0 1px rgba(34,211,238,0.25), 0 10px 40px rgba(34,211,238,0.18); }
          .orca-hud-btn:active:not(:disabled) { transform: translateY(1px); }
        `}</style>

        {/* Fine technical grid */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, opacity: 0.55,
          backgroundImage: `
            linear-gradient(rgba(148,180,255,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,180,255,0.055) 1px, transparent 1px)`,
          backgroundSize: '44px 44px, 44px 44px',
          maskImage: 'radial-gradient(85% 70% at 50% 42%, #000 10%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(85% 70% at 50% 42%, #000 10%, transparent 100%)',
        }} />

        {/* Real candlestick tape across the lower band */}
        <div aria-hidden style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 'min(30vh, 240px)',
          opacity: 0.5,
          maskImage: 'linear-gradient(180deg, transparent, #000 55%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 55%)',
        }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none">
            {series.map((s, i) => {
              const x = (i + 0.5) * step;
              const up = s.c >= s.o;
              const col = up ? UP : DOWN;
              const yT = yOf(Math.max(s.o, s.c));
              const yB = yOf(Math.min(s.o, s.c));
              return (
                <g key={i} style={{ animation: reduced ? undefined : `orca-hud-fade 500ms linear ${i * 22}ms both` }}>
                  <line x1={x} x2={x} y1={yOf(s.h)} y2={yOf(s.l)} stroke={col} strokeWidth={1} />
                  <rect
                    x={x - bodyW / 2} y={yT} width={bodyW} height={Math.max(1.2, yB - yT)}
                    fill={up ? 'none' : col} stroke={col} strokeWidth={1}
                  />
                </g>
              );
            })}
            <path
              d={closePath} fill="none" stroke={CYAN} strokeWidth={1} opacity={0.5}
              strokeDasharray={2400}
              style={{ animation: reduced ? undefined : 'orca-hud-draw 2400ms cubic-bezier(0.22,1,0.36,1) 200ms both' }}
            />
          </svg>
        </div>

        {/* Top hairline status bar */}
        <div aria-hidden style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 18px', borderBottom: `1px solid ${HAIRLINE}`,
          background: 'rgba(6,10,17,0.6)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: MUTED,
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          animation: anim('orca-hud-fade', 120, 700),
        }}>
          <span>ORCA · TERMINAL</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 6, height: 6, borderRadius: 999, background: CYAN,
              boxShadow: `0 0 8px ${CYAN}`,
              animation: reduced ? undefined : 'orca-hud-pulse 2.4s ease-in-out infinite',
            }} />
            SECURE LINK
          </span>
        </div>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
          {/* HUD orca mark inside a glass plate with corner brackets */}
          <div style={{
            position: 'relative', width: 'min(300px, 62vw)', margin: '0 auto 26px',
            padding: '18px 20px', borderRadius: 4,
            border: `1px solid ${HAIRLINE}`, background: GLASS,
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            animation: anim('orca-hud-rise', 0, 900),
            overflow: 'hidden',
          }}>
            {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h]) => (
              <span key={`${v}${h}`} aria-hidden style={{
                position: 'absolute', [v]: -1, [h]: -1, width: 12, height: 12,
                [`border${v === 'top' ? 'Top' : 'Bottom'}`]: `1px solid ${CYAN}`,
                [`border${h === 'left' ? 'Left' : 'Right'}`]: `1px solid ${CYAN}`,
                opacity: 0.75,
              } as React.CSSProperties} />
            ))}
            <div aria-hidden style={{
              position: 'absolute', left: 0, right: 0, top: 0, height: 2,
              background: `linear-gradient(90deg, transparent, ${CYAN}, transparent)`,
              opacity: 0.35,
              animation: reduced ? undefined : 'orca-hud-scan 5.5s linear infinite',
            }} />
            <img
              src={orcaHud}
              alt=""
              width={1024}
              height={768}
              style={{
                display: 'block', width: '100%', height: 'auto',
                filter: `drop-shadow(0 0 18px rgba(34,211,238,0.35))`,
                animation: reduced ? undefined : 'orca-hud-float 9s ease-in-out infinite',
              }}
            />
          </div>

          <h1 style={{
            fontSize: 'clamp(28px, 5.6vw, 46px)', margin: 0, lineHeight: 1.05,
            letterSpacing: '-0.015em', color: TEXT, fontWeight: 600,
            animation: anim('orca-hud-rise', 160),
          }}>
            <span style={{ fontWeight: 700 }}>Orca</span>
            <span style={{ fontWeight: 300, marginInlineStart: 10, color: '#AFC2DA' }}>Investment</span>
          </h1>

          <div aria-hidden style={{
            width: 'min(280px, 60vw)', height: 1, margin: '18px auto 0',
            background: `linear-gradient(90deg, transparent, ${HAIRLINE}, transparent)`,
            animation: anim('orca-hud-fade', 320, 700),
          }} />

          <p style={{
            fontSize: 11, color: MUTED, fontWeight: 500, letterSpacing: '0.34em', textTransform: 'uppercase',
            marginTop: 16, marginBottom: 38,
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
                padding: '15px 52px',
                background: 'rgba(34,211,238,0.06)',
                border: `1px solid rgba(34,211,238,0.45)`,
                borderRadius: 3,
                color: TEXT,
                fontSize: 13, fontWeight: 600,
                fontFamily: 'inherit',
                cursor: requested && !ready ? 'wait' : 'pointer',
                letterSpacing: '0.16em', textTransform: 'uppercase',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.55)',
              }}
            >
              {requested && !ready ? (isRTL ? 'מכין את המסוף…' : 'Preparing terminal…') : (isRTL ? 'כניסה למערכת' : 'Access Platform')}
            </button>
          </div>

          <p style={{
            marginTop: 24, marginBottom: 0, fontSize: 10, color: '#7E8FA8', fontWeight: 500,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
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
