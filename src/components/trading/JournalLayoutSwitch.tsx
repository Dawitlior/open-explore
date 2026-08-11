import type { TradingTheme } from '@/lib/trading-theme';
import { infoColor, neutralRamp } from '@/lib/semantic-color';

export type JournalLayout = 'table' | 'gallery';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  value: JournalLayout;
  onChange: (v: JournalLayout) => void;
}

const ICONS: Record<JournalLayout, JSX.Element> = {
  table: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M3 15h18M9 4v16" />
    </svg>
  ),
  gallery: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  ),
};

/**
 * Segmented switch for the ORCA trade-journal layout:
 * classic data TABLE  ⇄  GALLERY of trade tiles.
 */
export function JournalLayoutSwitch({ T, isRTL, value, onChange }: Props) {
  const opts: Array<{ id: JournalLayout; label: string }> = [
    { id: 'table', label: isRTL ? 'טבלה' : 'Table' },
    { id: 'gallery', label: isRTL ? 'גלריה' : 'Gallery' },
  ];

  return (
    <div
      role="tablist"
      aria-label={isRTL ? 'פריסת יומן' : 'Journal layout'}
      style={{
        display: 'inline-flex',
        gap: 2,
        padding: 3,
        borderRadius: T.radius.md,
        background: T.bg.tertiary,
        border: `1px solid ${T.border.subtle}`,
      }}
    >
      {opts.map(o => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className="orca-focus"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 11px',
              borderRadius: T.radius.sm,
              border: `1px solid ${active ? `${infoColor(T)}55` : 'transparent'}`,
              background: active ? `${infoColor(T)}18` : 'transparent',
              color: active ? infoColor(T) : T.text.muted,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all .18s ease',
            }}
          >
            {ICONS[o.id]}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
