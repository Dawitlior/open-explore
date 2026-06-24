import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';

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
const PANEL_BG = '#0B0E11';
const LOADER_ICON_CENTER_OFFSET_PX = 48;
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
  const loaderSliceStyle = (half: 'top' | 'bottom'): CSSProperties => ({
    position: 'absolute',
    left: 0,
    width: '100vw',
    height: '100dvh',
    overflow: 'hidden',
    transform: `translateY(${LOADER_ICON_CENTER_OFFSET_PX}px) translateZ(0)`,
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
        background: PANEL_BG,
        overflow: 'hidden',
        transform: isSplitting ? 'translateY(-100%)' : 'translateY(0)',
        transition: `transform ${SPLIT_MS}ms ${SPLIT_EASING}`,
        willChange: 'transform',
      }}>
        <div ref={topLoaderRef} style={loaderSliceStyle('top')}>
          <OrcaBootLoader />
        </div>
      </div>

      {/* BOTTOM PANEL — animates DOWN, shows bottom half of icon */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100vw', height: '50dvh',
        background: PANEL_BG,
        overflow: 'hidden',
        transform: isSplitting ? 'translateY(100%)' : 'translateY(0)',
        transition: `transform ${SPLIT_MS}ms ${SPLIT_EASING}`,
        willChange: 'transform',
      }}>
        <div ref={bottomLoaderRef} style={loaderSliceStyle('bottom')}>
          <OrcaBootLoader />
        </div>
      </div>

    </div>
  );
};
