import { useState } from 'react';

type Props = {
  T: any;
  isRTL: boolean;
  compact?: boolean;
  /** R-eligible trades (with stop-loss). When provided, banner switches to
   *  the "Hidden Trade Count" transparency mode used on analytics pages. */
  rEligibleCount?: number;
  /** Total trades in the dataset (any mode). */
  totalCount?: number;
};

/**
 * Transparency banner. Two modes:
 *  - default: explains Calendar's Tier-3 Daily Proxy R-multiple.
 *  - count-mode (rEligibleCount + totalCount provided): shows
 *    "R metrics calculated from X/Y trades (Z without stop-loss)".
 */
export const RProxyBanner = ({ T, isRTL, compact, rEligibleCount, totalCount }: Props) => {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const isCountMode = typeof rEligibleCount === 'number' && typeof totalCount === 'number';
  const hidden = isCountMode ? Math.max(0, (totalCount as number) - (rEligibleCount as number)) : 0;
  if (isCountMode && hidden === 0) return null;

  const title = isCountMode
    ? (isRTL ? 'שקיפות נתונים — מצב R-Multiple' : 'Data transparency — R-Multiple mode')
    : (isRTL ? 'איך מחושב R בעסקאות מסונכרנות?' : 'How R is calculated for synced trades');

  const body = isCountMode
    ? (isRTL
        ? `מדדי ה-R מחושבים מתוך ${rEligibleCount}/${totalCount} עסקאות (${hidden} עסקאות יובאו ללא Stop-Loss והוסתרו מהגרפים).`
        : `R metrics calculated from ${rEligibleCount}/${totalCount} trades (${hidden} trades imported without stop-loss and hidden from charts).`)
    : (isRTL
        ? 'מכיוון שבורסת Bybit לא משמרת את ה-Stop Loss ההיסטורי לאחר סגירת פוזיציה, מערכת Orca מחשבת את ביצועי העבר באמצעות מודל "פרוקסי יומי": Daily R = רווח/הפסד יומי ÷ מגבלת הסיכון היומית שהגדרת בהגדרות. בחלק 2 תוכל לעדכן ידנית את ערך ה-R של כל עסקה בודדת.'
        : "Because Bybit's closed-PnL history endpoint does not retain the original Stop Loss after a position closes, Orca models historical performance via a Daily-Proxy: Daily R = day P&L ÷ your configured Daily Risk Limit. In Part 2 you'll be able to manually override the R value of any individual trade.");

  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: compact ? '10px 14px' : '12px 18px',
        marginBottom: 14,
        background: `linear-gradient(135deg, ${T.accent.cyan}10, ${T.accent.cyan}05)`,
        border: `1px solid ${T.accent.cyan}35`,
        borderInlineStart: `3px solid ${T.accent.cyan}`,
        borderRadius: T.radius?.md ?? 12,
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      <span aria-hidden style={{ fontSize: 18, lineHeight: 1, color: T.accent.cyan }}>ⓘ</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text.primary, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 11, lineHeight: 1.55, color: T.text.secondary }}>{body}</div>
      </div>
      <button
        onClick={() => setOpen(false)}
        aria-label={isRTL ? 'סגור' : 'Dismiss'}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: T.text.muted, fontSize: 16, lineHeight: 1, padding: 2,
        }}
      >×</button>
    </div>
  );
};

export default RProxyBanner;
