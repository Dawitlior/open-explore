// src/components/trading/HeaderModeToggle.tsx
// Compact desktop $/R toggle. All mutations go through useDisplayMode().setDisplayMode,
// which handles persistence AND the 'orca:displayMode-changed' event bus.
// DisplayModeToggle.tsx (with its mobile variant) is intentionally left untouched.

import { useLayoutEffect, useRef } from 'react';
import { useDisplayMode, type DisplayMode } from '@/lib/display-mode';

// Pre-approved identity exceptions (match legacy DisplayModeToggle):
const MONEY_COLOR = '#10b981';
const R_COLOR = '#22d3ee';

const EASE = 'cubic-bezier(.22,1,.36,1)';

export function HeaderModeToggle({ isRTL }: { isRTL: boolean }) {
  const { displayMode, setDisplayMode, locked, recommendation } = useDisplayMode();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLSpanElement | null>(null);
  const readyRef = useRef(false);
  const showRescue = recommendation.shouldPrompt;

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const thumb = thumbRef.current;
    if (!wrap || !thumb) return;
    const place = () => {
      const active = wrap.querySelector<HTMLButtonElement>(`[data-mode="${displayMode}"]`);
      if (!active) return;
      thumb.style.left = active.offsetLeft + 'px';
      thumb.style.width = active.offsetWidth + 'px';
      if (!readyRef.current) {
        requestAnimationFrame(() => {
          thumb.style.transition = `left .25s ${EASE}, width .25s ${EASE}`;
          readyRef.current = true;
        });
      }
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [displayMode, isRTL]);

  const opts: { mode: DisplayMode; label: string; color: string; disabled: boolean }[] = [
    { mode: 'MONEY', label: '$', color: MONEY_COLOR, disabled: false },
    { mode: 'R_MULTIPLE', label: 'R', color: R_COLOR, disabled: locked },
  ];

  return (
    <div
      ref={wrapRef}
      role="tablist"
      aria-label={isRTL ? 'מצב תצוגה' : 'Display mode'}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        height: 34,
        borderRadius: 9,
        background: 'hsl(var(--trading-bg-primary) / 0.55)',
        border: '1px solid hsl(var(--border))',
        boxShadow: showRescue ? '0 0 0 1px hsl(var(--trading-cyan) / .42), 0 0 22px -8px hsl(var(--trading-cyan) / .9)' : undefined,
      }}
    >
      {showRescue && (
        <>
          <style>{`
            @keyframes orcaModeRescuePulse {
              0%, 100% { transform: scale(.82); opacity: .42; }
              50% { transform: scale(1.28); opacity: 1; }
            }
          `}</style>
          <span
            role="button"
            tabIndex={0}
            aria-label={isRTL ? 'החלף למצב המתאים לגרפים' : 'Switch to the chart-compatible mode'}
            onClick={() => setDisplayMode(recommendation.recommendedMode)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setDisplayMode(recommendation.recommendedMode);
              }
            }}
            style={{
              position: 'absolute',
              insetInlineStart: isRTL ? 'auto' : -7,
              insetInlineEnd: isRTL ? -7 : 'auto',
              top: -7,
              width: 13,
              height: 13,
              borderRadius: '50%',
              background: R_COLOR,
              boxShadow: `0 0 0 5px ${R_COLOR}22, 0 0 18px ${R_COLOR}`,
              animation: 'orcaModeRescuePulse 1.35s ease-in-out infinite',
              zIndex: 3,
              cursor: 'pointer',
            }}
          />
        </>
      )}
      <span
        ref={thumbRef}
        aria-hidden
        style={{
          position: 'absolute',
          top: 3,
          bottom: 3,
          left: 0,
          width: 0,
          borderRadius: 6,
          background: 'hsl(var(--trading-bg-surface) / 0.9)',
          border: '1px solid hsl(var(--border))',
          boxShadow: 'inset 0 1px 0 hsl(var(--foreground) / 0.04)',
          zIndex: 0,
        }}
      />
      {opts.map(o => {
        const active = displayMode === o.mode;
        return (
          <button
            key={o.mode}
            type="button"
            role="tab"
            aria-selected={active}
            aria-disabled={o.disabled}
            data-mode={o.mode}
            title={showRescue ? (isRTL ? 'בעיה בגרפים? לחץ על המצב המומלץ' : 'Charts issue? Click the recommended mode') : o.disabled ? (isRTL ? 'אין עסקאות עם סטופ/R תקין' : 'No trades with valid stop/R data') : undefined}
            onClick={() => { if (!o.disabled) setDisplayMode(o.mode); }}
            style={{
              position: 'relative', zIndex: 1, minWidth: 34, height: 28,
              display: 'grid', placeItems: 'center', border: 0, background: 'none',
              borderRadius: 6, cursor: o.disabled ? 'not-allowed' : 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12.5,
              color: active ? o.color : 'hsl(var(--muted-foreground))',
              opacity: o.disabled ? 0.45 : 1, transition: 'color .2s',
              padding: '0 8px',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
