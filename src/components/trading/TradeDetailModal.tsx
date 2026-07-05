import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { getEffectiveR } from '@/lib/r-multiple';
import { TradingBadge } from '@/components/trading/TradingUI';

interface Props {
  T: TradingTheme;
  t: any;
  trade: Trade;
  isRTL: boolean;
  isMobile: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  tradeHeadline: (tr: Trade) => { v: number; unit: 'R' | '$' };
  fmtHeadline: (v: number, unit: 'R' | '$', signed?: boolean) => string;
}

const PV = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export function TradeDetailModal({ T, t, trade, isRTL, isMobile, onClose, onEdit, onDelete, tradeHeadline, fmtHeadline }: Props) {
  const headline = tradeHeadline(trade);
  const r = getEffectiveR(trade);
  const sideColor = trade.direction === 'Long' ? T.accent.green : T.accent.red;
  const outcomeColor = headline.v >= 0 ? T.accent.green : T.accent.red;
  const resultColor = trade.winLoss === 'Win' ? T.accent.green : trade.winLoss === 'Loss' ? T.accent.red : T.accent.orange;
  const dateLabel = new Date(trade.date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const dir = isRTL ? 'rtl' : 'ltr';

  const metric = (label: string, value: React.ReactNode, color = T.text.primary, emphasis = false) => (
    <div style={{
      minWidth: 0,
      padding: isMobile ? '10px 0' : '10px 12px',
      borderBottom: isMobile ? `1px solid ${T.border.subtle}` : 'none',
    }}>
      <div style={{ fontSize: isMobile ? 10 : 11, color: T.text.muted, marginBottom: 4 }}>{label}</div>
      <PV><div style={{
        fontSize: emphasis ? (isMobile ? 24 : 27) : (isMobile ? 17 : 20),
        lineHeight: 1.05,
        fontWeight: 800,
        color,
        fontFamily: "'JetBrains Mono', monospace",
        overflowWrap: 'anywhere',
      }}>{value}</div></PV>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      dir={dir}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: isMobile ? 'rgba(0,0,0,0.72)' : 'rgba(1,7,18,0.72)',
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
        padding: isMobile ? '12px 10px 0' : 24,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: isMobile ? '100%' : 900,
          maxHeight: isMobile ? '88dvh' : '86vh', overflow: 'auto',
          borderRadius: isMobile ? '22px 22px 0 0' : 28,
          border: `1px solid ${T.border.medium}`,
          background: isMobile
            ? `linear-gradient(180deg, ${T.bg.secondary}, ${T.bg.card})`
            : `radial-gradient(circle at ${isRTL ? '92%' : '8%'} 0%, ${sideColor}18, transparent 34%), linear-gradient(135deg, ${T.bg.card}, ${T.bg.secondary})`,
          boxShadow: isMobile ? '0 -28px 70px rgba(0,0,0,0.55)' : T.shadow.elevated,
          padding: isMobile ? '16px 18px calc(18px + env(safe-area-inset-bottom))' : 32,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: isMobile ? 16 : 24 }}>
          <button
            onClick={onClose}
            aria-label={isRTL ? 'סגור' : 'Close'}
            style={{
              order: isRTL ? 0 : 2,
              width: isMobile ? 34 : 40, height: isMobile ? 34 : 40,
              borderRadius: isMobile ? 12 : 14,
              border: `1px solid ${T.border.subtle}`,
              background: T.bg.tertiary,
              color: T.text.muted,
              cursor: 'pointer', fontSize: isMobile ? 24 : 26, lineHeight: 1,
            }}
          >×</button>

          <div style={{ minWidth: 0, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: isRTL ? 'flex-start' : 'flex-start' }}>
              <TradingBadge color={sideColor}>{trade.direction}</TradingBadge>
              <span style={{
                fontSize: isMobile ? 34 : 42,
                lineHeight: 1,
                fontWeight: 900,
                letterSpacing: 0,
                color: T.text.primary,
                fontFamily: "'JetBrains Mono', monospace",
              }}>{trade.coin}</span>
            </div>
            <div style={{ marginTop: 8, color: T.text.muted, fontSize: isMobile ? 12 : 14 }}>
              {isRTL ? 'עסקה' : 'Trade'} #{trade.id} • {dateLabel}
            </div>
          </div>
        </div>

        {isMobile ? (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
              padding: '14px 0', borderBlock: `1px solid ${T.border.subtle}`, marginBottom: 8,
            }}>
              {metric(`${t.pnl} (${headline.unit})`, fmtHeadline(headline.v, headline.unit), outcomeColor, true)}
              {metric(`${t.riskR} (R)`, `${r.toFixed(2)}R`, outcomeColor, true)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>
              {metric(t.entry, trade.entry)}
              {metric(t.stopLoss, trade.stopLoss == null ? '—' : trade.stopLoss, T.accent.red)}
              {metric(t.exit, trade.exit)}
              {metric(t.deviation, trade.deviation ? `${trade.deviation.toFixed(4)}R` : '0', trade.deviation > 0 ? T.accent.orange : T.accent.green)}
              {metric(t.leverage, `${trade.leverage}x`)}
              {metric(`${t.balance} ($)`, `$${trade.balance.toFixed(2)}`)}
            </div>
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isRTL ? '1fr 1.1fr' : '1.1fr 1fr', gap: 30, alignItems: 'start' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18,
              padding: '6px 0',
            }}>
              {metric(t.entry, trade.entry)}
              {metric(t.stopLoss, trade.stopLoss == null ? '—' : trade.stopLoss, T.accent.red)}
              {metric(t.exit, trade.exit)}
              {metric(`${t.pnl} (${headline.unit})`, fmtHeadline(headline.v, headline.unit), outcomeColor, true)}
              {metric(`${t.riskR} (R)`, `${r.toFixed(2)}R`, outcomeColor)}
              {metric(t.deviation, trade.deviation ? `${trade.deviation.toFixed(4)}R` : '0', trade.deviation > 0 ? T.accent.orange : T.accent.green)}
              {metric(t.leverage, `${trade.leverage}x`)}
              {metric(`${t.balance} ($)`, `$${trade.balance.toFixed(2)}`)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                padding: 18, borderRadius: 18,
                border: `1px solid ${resultColor}44`,
                background: `${resultColor}12`,
              }}>
                <div style={{ color: T.text.muted, fontSize: 11, marginBottom: 8 }}>{isRTL ? 'תוצאה' : 'Outcome'}</div>
                <TradingBadge color={resultColor}>{trade.winLoss}</TradingBadge>
                <div style={{ marginTop: 16, color: outcomeColor, fontSize: 32, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmtHeadline(headline.v, headline.unit)}
                </div>
              </div>
              {trade.comments && (
                <div style={{ padding: 16, background: T.bg.tertiary, borderRadius: 16, border: `1px solid ${T.border.subtle}` }}>
                  <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', marginBottom: 6 }}>{t.comments}</div>
                  <div style={{ fontSize: 14, color: T.text.secondary, lineHeight: 1.6 }}>{trade.comments}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {isMobile && trade.comments && (
          <div style={{ marginTop: 14, padding: 14, background: T.bg.tertiary, borderRadius: 14, border: `1px solid ${T.border.subtle}` }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', marginBottom: 6 }}>{t.comments}</div>
            <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.55 }}>{trade.comments}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: isMobile ? 18 : 24, justifyContent: isRTL ? 'flex-start' : 'flex-end', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
          <button onClick={onDelete} style={{
            padding: isMobile ? '13px 16px' : '10px 18px',
            background: `${T.accent.red}16`, border: `1px solid ${T.accent.red}40`, borderRadius: 12,
            color: T.accent.red, cursor: 'pointer', fontSize: 13, fontWeight: 800,
          }}>{t.deleteTrade}</button>
          <button onClick={onEdit} style={{
            padding: isMobile ? '14px 16px' : '10px 22px',
            background: `linear-gradient(135deg, ${T.accent.blue}, ${T.accent.cyan})`, border: 'none', borderRadius: 12,
            color: T.bg.primary, cursor: 'pointer', fontSize: 13, fontWeight: 900,
          }}>{t.editTrade}</button>
        </div>
      </div>
    </div>
  );
}

export default TradeDetailModal;