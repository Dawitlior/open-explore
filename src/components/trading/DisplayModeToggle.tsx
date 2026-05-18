import { useDisplayMode, buildHiddenHint } from '@/lib/display-mode';
import type { TradingTheme } from '@/lib/trading-theme';
import { Lock } from 'lucide-react';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  /** Compact = no hint line under the toggle (use in tight headers) */
  compact?: boolean;
}

/**
 * DisplayModeToggle — premium glass pill that switches the whole dashboard
 * between fiat-money ($) and R-Multiple expectancy mode. Locked to MONEY
 * when no trade has a real stop-loss.
 */
export function DisplayModeToggle({ T, isRTL, compact }: Props) {
  const { displayMode, setDisplayMode, locked, hiddenCount, totalCount } = useDisplayMode();
  const sans = "'Poppins', sans-serif";
  const mono = "'IBM Plex Mono', monospace";
  const isMoney = displayMode === 'MONEY';

  const hint = buildHiddenHint(hiddenCount, totalCount, isRTL);

  const PILL_W = 196;
  const PILL_H = 34;
  const PADDING = 3;

  // We render two labels side-by-side; thumb slides under the active one.
  // In RTL the order flips so the visual labels stay logical (כסף on right side, R on left).
  const labels: Array<{ id: 'MONEY' | 'R_MULTIPLE'; he: string; en: string; sub: string }> = [
    { id: 'MONEY',      he: 'כסף',   en: 'Money', sub: '$' },
    { id: 'R_MULTIPLE', he: 'תוחלת', en: 'R',     sub: 'R' },
  ];

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: isRTL ? 'flex-end' : 'flex-start', gap: 4 }}>
      <div
        role="tablist"
        aria-label={isRTL ? 'מצב תצוגה' : 'Display mode'}
        style={{
          position: 'relative',
          width: PILL_W,
          height: PILL_H,
          padding: PADDING,
          borderRadius: 999,
          background: `
            linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)),
            rgba(6,12,24,0.6)
          `,
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 22px -16px rgba(0,0,0,0.8)',
          display: 'flex',
          direction: 'ltr', // stable thumb math regardless of RTL parent
        }}
      >
        {/* sliding thumb */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: PADDING,
            bottom: PADDING,
            left: PADDING,
            width: `calc(50% - ${PADDING}px)`,
            borderRadius: 999,
            transform: isMoney ? 'translateX(0%)' : 'translateX(100%)',
            transition: 'transform .35s cubic-bezier(.16,1,.3,1), background .25s ease, box-shadow .25s ease',
            background: isMoney
              ? 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.85))'
              : 'linear-gradient(135deg, rgba(0,242,255,0.95), rgba(59,130,246,0.85))',
            boxShadow: isMoney
              ? '0 0 18px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.25)'
              : '0 0 18px rgba(0,242,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}
        />
        {labels.map(l => {
          const active = l.id === displayMode;
          const lockThis = locked && l.id === 'R_MULTIPLE';
          return (
            <button
              key={l.id}
              role="tab"
              aria-selected={active}
              aria-disabled={lockThis}
              onClick={() => !lockThis && setDisplayMode(l.id)}
              title={lockThis ? (isRTL ? 'אין עסקאות עם סטופ מוגדר' : 'No trades with a defined stop-loss') : undefined}
              style={{
                position: 'relative',
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: active ? '#06121f' : 'rgba(240,245,255,0.65)',
                fontFamily: sans,
                fontWeight: 700,
                fontSize: 11.5,
                letterSpacing: 0.3,
                cursor: lockThis ? 'not-allowed' : 'pointer',
                opacity: lockThis ? 0.45 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                transition: 'color .25s ease, opacity .25s ease',
                padding: 0,
                zIndex: 1,
              }}
            >
              {lockThis && <Lock size={10} />}
              <span>{isRTL ? l.he : l.en}</span>
              <span style={{
                fontFamily: mono, fontSize: 9.5, fontWeight: 800,
                opacity: active ? 0.55 : 0.45,
                padding: '1px 5px', borderRadius: 4,
                background: active ? 'rgba(6,18,31,0.18)' : 'rgba(255,255,255,0.05)',
              }}>{l.sub}</span>
            </button>
          );
        })}
      </div>
      {!compact && hint && displayMode === 'R_MULTIPLE' && (
        <div style={{
          fontFamily: mono, fontSize: 10, color: T.text.muted,
          letterSpacing: 0.3, lineHeight: 1.3,
          maxWidth: 320, textAlign: isRTL ? 'right' : 'left',
          direction: isRTL ? 'rtl' : 'ltr',
        }}>
          {hint}
        </div>
      )}
    </div>
  );
}
