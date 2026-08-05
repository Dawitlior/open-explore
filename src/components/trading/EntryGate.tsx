import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';
import { SURF, isLightScheme } from '@/lib/neon-palette';

interface EntryGateProps {
  onEnter: () => void;
  lang?: 'he' | 'en';
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
type Phase = 'idle' | 'spin' | 'settle' | 'split' | 'done';

const SPIN_MS = 2000;
const SETTLE_MS = 1200;
const SPLIT_MS = 800;
const PANEL_BG = "#0B0E11";
const panelBg = () => (isLightScheme() ? "#FFFFFF" : PANEL_BG);
const gateBg = () => (isLightScheme()
  ? 'radial-gradient(ellipse at 50% 30%, #FFFFFF 0%, #F4F6FB 55%, #E8ECF5 100%)'
  : 'radial-gradient(ellipse at 50% 30%, #0f1528 0%, #070b14 50%, #030508 100%)');
const SPLIT_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';

function rotationFromMatrix(transform: string): number {
  if (!transform || transform === 'none') return 0;
  const values = transform.match(/matrix\(([^)]+)\)/)?.[1]?.split(',').map(Number);
  if (!values || values.length < 2) return 0;
  return Math.round(Math.atan2(values[1], values[0]) * (180 / Math.PI));
}

function decelerateCanonicalLoader(topRoot: HTMLDivElement | null, bottomRoot: HTMLDivElement | null) {
  const roots = [topRoot, bottomRoot].filter(Boolean) as HTMLDivElement[];
  if (!roots.length) return;

  const ringsByRoot = roots.map((root) =>
    Array.from(root.querySelectorAll<HTMLElement>('[style*="orca-bl-spin"]'))
  );

  ringsByRoot[0]?.forEach((sourceRing, ringIndex) => {
    const sourceStyle = window.getComputedStyle(sourceRing);
    const start = rotationFromMatrix(sourceStyle.transform);
    const isReverse = (sourceRing.getAttribute('style') || '').includes('orca-bl-spin-rev');
    const normalized = ((start % 360) + 360) % 360;
    const end = isReverse
      ? start - (normalized || 360) - 360
      : start + (360 - normalized || 360) + 360;

    ringsByRoot.forEach((rings) => {
      const ring = rings[ringIndex];
      if (!ring) return;
      ring.getAnimations().forEach((animation) => animation.cancel());
      ring.style.animation = 'none';
      ring.style.transform = `rotate(${start}deg)`;
      const decel = ring.animate(
        [{ transform: `rotate(${start}deg)` }, { transform: `rotate(${end}deg)` }],
        { duration: SETTLE_MS, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
      );
      decel.onfinish = () => {
        ring.style.transform = `rotate(${end}deg)`;
      };
    });
  });

  roots.forEach((root) => {
    root.querySelectorAll<HTMLElement>('[style*="orca-bl-pulse"]').forEach((dot) => {
      dot.style.animationPlayState = 'paused';
    });
  });
}

export const EntryGate = ({ onEnter, lang = 'he' }: EntryGateProps) => {
  const isRTL = lang === 'he';
  const [phase, setPhase] = useState<Phase>('idle');
  const topLoaderRef = useRef<HTMLDivElement | null>(null);
  const bottomLoaderRef = useRef<HTMLDivElement | null>(null);

  const handleAccess = useCallback(() => setPhase('spin'), []);

  useEffect(() => {
    if (phase === 'spin') {
      const t = setTimeout(() => {
        decelerateCanonicalLoader(topLoaderRef.current, bottomLoaderRef.current);
        setPhase('settle');
      }, SPIN_MS);
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

        {/* soft drifting aurora — intensity adapts to scheme */}
        <div aria-hidden style={{
          position: 'absolute', inset: '-15%',
          background: light
            ? 'radial-gradient(38% 42% at 32% 34%, rgba(99,102,241,0.14), transparent 70%), radial-gradient(34% 38% at 68% 62%, rgba(6,214,160,0.13), transparent 70%)'
            : 'radial-gradient(38% 42% at 32% 34%, rgba(6,214,160,0.16), transparent 70%), radial-gradient(34% 38% at 68% 62%, rgba(99,102,241,0.18), transparent 70%)',
          filter: 'blur(20px)',
          animation: reduced ? undefined : 'orca-gate-drift 18s ease-in-out infinite',
        }} />
        <div aria-hidden style={{
          position: 'absolute', inset: 0, opacity: light ? 0.05 : 0.045,
          backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          color: light ? '#3730a3' : '#06d6a0',
          maskImage: 'radial-gradient(70% 60% at 50% 45%, #000 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(70% 60% at 50% 45%, #000 30%, transparent 100%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
          {/* breathing mark */}
          <div aria-hidden style={{ display: 'flex', justifyContent: 'center', marginBottom: 30, animation: anim('orca-gate-rise', 0, 700) }}>
            <span style={{
              width: 12, height: 12, borderRadius: 999,
              background: 'linear-gradient(135deg,#06d6a0,#6366f1)',
              boxShadow: light ? '0 0 0 10px rgba(99,102,241,0.07)' : '0 0 34px rgba(6,214,160,0.45)',
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
              onMouseEnter={e => { if (!reduced) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
              style={{
                padding: '15px 52px',
                background: light ? 'linear-gradient(135deg,#4f46e5,#06d6a0)' : 'linear-gradient(135deg, #06d6a0, #0d9488)',
                border: 'none', borderRadius: 999,
                color: light ? '#ffffff' : '#0a0e1a', fontSize: 13.5, fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: 'pointer', letterSpacing: '0.08em',
                transition: reduced ? 'none' : 'transform .25s cubic-bezier(0.22,1,0.36,1), box-shadow .25s ease',
                boxShadow: light
                  ? '0 12px 30px -12px rgba(79,70,229,0.55)'
                  : '0 0 44px rgba(6,214,160,0.22), 0 10px 26px -12px rgba(0,0,0,0.6)',
              }}
            >
              {isRTL ? 'כניסה למערכת' : 'Access Platform'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done') return null;

  const isSplitting = phase === 'split';
  const loaderSliceStyle = (half: 'top' | 'bottom'): CSSProperties => ({
    position: 'absolute',
    left: 0,
    width: '100vw',
    height: '100dvh',
    overflow: 'hidden',
    ...(half === 'top' ? { top: 0 } : { bottom: 0 }),
  });

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483647,
        width: '100vw', height: '100dvh',
        overflow: 'hidden',
        pointerEvents: 'none',
        background: 'transparent',
        contain: 'strict',
      }}
    >
      {/* TOP PANEL — animates UP, shows top half of icon */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100vw', height: '50dvh',
        background: panelBg(),
        overflow: 'hidden',
        transform: isSplitting ? 'translateY(-100%)' : 'translateY(0)',
        transition: `transform ${SPLIT_MS}ms ${SPLIT_EASING}`,
        willChange: 'transform',
      }}>
        <div ref={topLoaderRef} style={loaderSliceStyle('top')}>
          <OrcaBootLoader frame="absolute" />
        </div>
      </div>

      {/* BOTTOM PANEL — animates DOWN, shows bottom half of icon */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100vw', height: '50dvh',
        background: panelBg(),
        overflow: 'hidden',
        transform: isSplitting ? 'translateY(100%)' : 'translateY(0)',
        transition: `transform ${SPLIT_MS}ms ${SPLIT_EASING}`,
        willChange: 'transform',
      }}>
        <div ref={bottomLoaderRef} style={loaderSliceStyle('bottom')}>
          <OrcaBootLoader frame="absolute" />
        </div>
      </div>

    </div>
  );
};
