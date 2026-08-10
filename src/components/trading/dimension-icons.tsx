// Custom line icons for the sidebar dimension portals.
// All strokes use currentColor so they inherit each button's theme color.

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/** Trader Journey — an open ledger with a rising trade line across the pages. */
export const JournalPortalIcon = ({ size = 18, className, style }: IconProps) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M3 5.4c2.6-.9 5.1-.9 7.6.3v13c-2.5-1.2-5-1.2-7.6-.3V5.4Z" />
    <path d="M21 5.4c-2.6-.9-5.1-.9-7.6.3v13c2.5-1.2 5-1.2 7.6-.3V5.4Z" />
    <path d="M12 5.7v13" opacity="0.5" />
    <path d="M5.6 12.6 7.4 10.8 9 12l1.1-2.4" />
    <path d="M14.4 13.4 16 11l1.3 1.2 1.3-2.6" />
  </svg>
);

/** Backtest Journal — a candlestick series inside a replay frame with a rewind arrow. */
export const BacktestPortalIcon = ({ size = 18, className, style }: IconProps) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <rect x="3" y="3.5" width="18" height="14" rx="2.4" />
    <path d="M8 7v7M8 8.4h0" />
    <rect x="6.9" y="8.2" width="2.2" height="4.2" rx="0.6" />
    <path d="M14 6.4v8.2" />
    <rect x="12.9" y="8" width="2.2" height="5" rx="0.6" />
    <path d="M6.2 21c1.9-1.4 3.9-2.1 5.8-2.1s3.9.7 5.8 2.1" opacity="0.55" />
  </svg>
);

/** Trader Mind — a profile head with a focus reticle for the behavioral diagnostic. */
export const TraderMindIcon = ({ size = 18, className, style }: IconProps) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M15.6 20.4v-2.2c2.2-1.1 3.7-3.4 3.7-6a7.3 7.3 0 1 0-14.6 0c0 1.7.6 3.2 1.6 4.4v3.8" />
    <circle cx="12" cy="11.6" r="2.6" />
    <path d="M12 5.4v3.4M12 14.4v3M8.4 11.6H6M18 11.6h-2.4" opacity="0.7" />
  </svg>
);
