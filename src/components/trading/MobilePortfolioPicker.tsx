// src/components/trading/MobilePortfolioPicker.tsx
// Apple-style grouped "inset list" portfolio switcher for the mobile More sheet.

import { useActivePortfolio } from '@/hooks/use-active-portfolio';
import { haptics } from '@/lib/haptics';
import { infoColor } from '@/lib/semantic-color';

interface Props {
  T: any;
  isRTL: boolean;
  onSwitched?: () => void;
}

export function MobilePortfolioPicker({ T, isRTL, onSwitched }: Props) {
  const { portfolios, activePortfolioId, setActivePortfolioId, isPortfolioLocked, loading } = useActivePortfolio();
  const accent = infoColor(T);

  if (loading && portfolios.length === 0) {
    return (
      <div style={{ padding: '14px 16px', fontSize: 13, color: T.text.muted }}>
        {isRTL ? 'טוען תיקים…' : 'Loading portfolios…'}
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <div style={{ padding: '14px 16px', fontSize: 13, color: T.text.muted }}>
        {isRTL ? 'אין תיקים עדיין' : 'No portfolios yet'}
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        background: T.bg.tertiary || T.bg.secondary,
        border: `1px solid ${T.border.subtle}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <style>{`
        .mpp-row{display:flex;align-items:center;gap:12px;width:100%;
          padding:13px 14px;min-height:56px;background:transparent;border:none;
          cursor:pointer;text-align:${isRTL ? 'right' : 'left'};
          -webkit-tap-highlight-color:transparent;
          transition:background .18s ease, transform .12s ease}
        .mpp-row:active{transform:scale(.98)}
        .mpp-row + .mpp-row{border-top:1px solid ${T.border.subtle}}
        .mpp-row[data-locked="true"]{opacity:.45;cursor:not-allowed}
      `}</style>

      {portfolios.map((p) => {
        const isActive = p.id === activePortfolioId;
        const locked = isPortfolioLocked(p.id);
        const dot = p.color || accent;
        return (
          <button
            key={p.id}
            type="button"
            className="mpp-row"
            data-locked={locked ? 'true' : 'false'}
            disabled={locked}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => {
              if (locked || isActive) return;
              haptics.selection();
              setActivePortfolioId(p.id);
              onSwitched?.();
            }}
            style={isActive ? { background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${accent}1c, ${accent}06 85%, transparent)` } : undefined}
          >
            <span
              aria-hidden
              style={{
                width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                background: dot,
                boxShadow: `0 0 12px -2px ${dot}`,
              }}
            />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: 'block', fontSize: 15,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? accent : T.text.primary,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  letterSpacing: '0.01em',
                }}
              >
                {p.name}
              </span>
              <span style={{ display: 'block', fontSize: 11, color: T.text.muted, marginTop: 2, letterSpacing: '0.06em' }}>
                {p.currency}
                {p.is_default ? ` · ${isRTL ? 'ברירת מחדל' : 'Default'}` : ''}
              </span>
            </span>

            {locked ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.text.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            ) : isActive ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
