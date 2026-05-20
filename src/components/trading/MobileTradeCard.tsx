import type { Trade } from '@/data/trades';
import { SwipeableRow } from './SwipeableRow';
import { PrivacyMask } from './PrivacyMask';

interface MobileTradeCardProps {
  T: any;
  isRTL: boolean;
  trade: Trade;
  effectiveR: number;
  privacyMode: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * MobileTradeCard — replaces the desktop table row on mobile.
 * Card-stack pattern with swipe-to-edit (right) and swipe-to-delete (left).
 */
export const MobileTradeCard = ({
  T, isRTL, trade, effectiveR, privacyMode, onOpen, onEdit, onDelete,
}: MobileTradeCardProps) => {
  const PV = ({ children }: { children: React.ReactNode }) => (
    <PrivacyMask enabled={privacyMode} type="dollar">{children}</PrivacyMask>
  );
  const isWin = trade.pnl >= 0;
  const pnlColor = isWin ? T.accent.green : T.accent.red;
  const dirColor = trade.direction === 'Long' ? T.accent.green : T.accent.red;

  const date = new Date(trade.date);
  const dateLabel = date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
    month: 'short', day: 'numeric',
  });
  const timeLabel = date.toLocaleTimeString(isRTL ? 'he-IL' : 'en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={{ marginBottom: 8, borderRadius: T.radius.lg, overflow: 'hidden', background: T.bg.card }}>
      <SwipeableRow
        isRTL={isRTL}
        leftActions={[{
          label: isRTL ? 'ערוך' : 'Edit',
          icon: '✏️',
          color: T.bg.primary,
          bg: T.accent.cyan,
          onAction: onEdit,
        }]}
        rightActions={[{
          label: isRTL ? 'מחק' : 'Delete',
          icon: '🗑',
          color: '#fff',
          bg: T.accent.red,
          onAction: onDelete,
        }]}
      >
        <button
          onClick={onOpen}
          style={{
            width: '100%',
            padding: 14,
            background: `linear-gradient(135deg, ${T.bg.card}, ${T.bg.secondary})`,
            border: `1px solid ${T.border.subtle}`,
            borderInlineStart: `3px solid ${dirColor}`,
            borderRadius: T.radius.lg,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            textAlign: isRTL ? 'right' : 'left',
            cursor: 'pointer',
            fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* Top row: symbol + direction · P&L */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{
                fontSize: 15, fontWeight: 800,
                color: T.accent.cyan,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '-0.01em',
              }}>{trade.coin}</span>
              <span style={{
                fontSize: 9, fontWeight: 700,
                padding: '2px 7px', borderRadius: 4,
                background: `${dirColor}18`, color: dirColor,
                border: `1px solid ${dirColor}40`,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {trade.direction === 'Long' ? '↑' : '↓'} {trade.direction}
              </span>
            </div>
            <PV>
              <span style={{
                fontSize: 15, fontWeight: 800,
                color: pnlColor,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {isWin ? '+' : ''}{trade.pnl.toFixed(2)}
              </span>
            </PV>
          </div>

          {/* Bottom row: R-Multiple · date · result chip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.text.muted }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: effectiveR >= 0 ? T.accent.green : T.accent.red,
                fontWeight: 700,
                padding: '2px 6px',
                background: `${effectiveR >= 0 ? T.accent.green : T.accent.red}12`,
                borderRadius: 4,
              }}>
                {effectiveR >= 0 ? '+' : ''}{effectiveR.toFixed(2)}R
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {dateLabel} · {timeLabel}
              </span>
            </div>
            <span style={{
              fontSize: 9, fontWeight: 700,
              padding: '2px 7px', borderRadius: 4,
              background: trade.winLoss === 'Win'
                ? `${T.accent.green}18`
                : trade.winLoss === 'Loss'
                  ? `${T.accent.red}18`
                  : `${T.accent.orange}18`,
              color: trade.winLoss === 'Win'
                ? T.accent.green
                : trade.winLoss === 'Loss'
                  ? T.accent.red
                  : T.accent.orange,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {trade.winLoss}
            </span>
          </div>

          {trade.comments && (
            <div style={{
              fontSize: 11, color: T.text.muted,
              lineHeight: 1.4,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              borderTop: `1px dashed ${T.border.subtle}`,
              paddingTop: 6, marginTop: 2,
            }}>
              {trade.comments}
            </div>
          )}
        </button>
      </SwipeableRow>
    </div>
  );
};
