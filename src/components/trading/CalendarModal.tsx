import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { I18nStrings } from '@/lib/trading-i18n';
import { TradingBadge } from './TradingUI';

interface CalendarModalProps {
  T: TradingTheme;
  t: I18nStrings;
  isRTL: boolean;
  day: number;
  month: number;
  year: number;
  trades: Trade[];
  onClose: () => void;
  onGenerateInsight?: () => void;
}

export const CalendarModal = ({ T, t, isRTL, day, month, year, trades, onClose, onGenerateInsight }: CalendarModalProps) => {
  const dayTrades = trades.filter(tr => {
    const d = new Date(tr.date);
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
  });

  const totalPnl = dayTrades.reduce((s, tr) => s + tr.pnl, 0);
  const wins = dayTrades.filter(tr => tr.winLoss === 'Win').length;
  const totalR = dayTrades.reduce((s, tr) => s + tr.returnR, 0);
  const rulesFollowed = dayTrades.filter(tr => tr.rules).length;
  const highDeviation = dayTrades.filter(tr => tr.deviation > 0.1);
  const allRulesFollowed = rulesFollowed === dayTrades.length;

  const dateStr = new Date(year, month, day).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl,
        padding: 28, maxWidth: 560, width: '95%', maxHeight: '85vh', overflow: 'auto',
        boxShadow: T.shadow.elevated, animation: 'fadeIn 0.25s ease'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{dateStr}</div>
            <div style={{ fontSize: 11, color: T.text.muted, marginTop: 3 }}>
              {dayTrades.length} {isRTL ? 'עסקאות' : 'trades'} • {wins} {isRTL ? 'ניצחונות' : 'wins'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.text.muted, fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { l: isRTL ? 'רווח/הפסד' : 'P&L', v: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, c: totalPnl >= 0 ? T.accent.green : T.accent.red, u: '$' },
            { l: isRTL ? 'סה"כ R' : 'Total R', v: `${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`, c: totalR >= 0 ? T.accent.green : T.accent.red, u: 'R' },
            { l: isRTL ? 'אחוז הצלחה' : 'Win Rate', v: `${dayTrades.length > 0 ? ((wins / dayTrades.length) * 100).toFixed(0) : 0}%`, c: T.accent.blue, u: '%' },
            { l: isRTL ? 'משמעת' : 'Discipline', v: allRulesFollowed ? '✅' : '⚠️', c: allRulesFollowed ? T.accent.green : T.accent.orange },
          ].map((s, i) => (
            <div key={i} style={{ padding: 10, background: T.bg.tertiary, borderRadius: T.radius.md, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.c, fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>{s.v}</div>
              {s.u && <div style={{ fontSize: 7, color: T.text.dim, marginTop: 1 }}>{s.u}</div>}
            </div>
          ))}
        </div>

        {/* Behavioral flags */}
        {(highDeviation.length > 0 || !allRulesFollowed || dayTrades.length >= 3) && (
          <div style={{ padding: 10, background: `${T.accent.orange}08`, border: `1px solid ${T.accent.orange}20`, borderRadius: T.radius.md, marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: T.accent.orange, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
              {isRTL ? '🚩 דגלים התנהגותיים' : '🚩 Behavioral Flags'}
            </div>
            {dayTrades.length >= 3 && <div style={{ fontSize: 11, color: T.text.secondary, marginBottom: 3 }}>⚡ {isRTL ? 'מסחר יתר — 3+ עסקאות' : 'Overtrading — 3+ trades in one day'}</div>}
            {!allRulesFollowed && <div style={{ fontSize: 11, color: T.text.secondary, marginBottom: 3 }}>⚠️ {isRTL ? 'כללים לא נשמרו' : 'Rules not followed'} ({rulesFollowed}/{dayTrades.length})</div>}
            {highDeviation.length > 0 && <div style={{ fontSize: 11, color: T.text.secondary }}>📊 {isRTL ? 'סטייה גבוהה' : 'High deviation'} ({highDeviation.length} {isRTL ? 'עסקאות' : 'trades'})</div>}
          </div>
        )}

        {/* Trade list */}
        <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          {isRTL ? 'פירוט עסקאות' : 'Trade Details'}
        </div>
        {dayTrades.map((tr, i) => (
          <div key={tr.id} style={{
            padding: 12, background: T.bg.tertiary, borderRadius: T.radius.md, marginBottom: 6,
            border: `1px solid ${tr.winLoss === 'Win' ? T.accent.green : tr.winLoss === 'Loss' ? T.accent.red : T.accent.orange}15`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.accent.cyan }}>{tr.coin}</span>
                <TradingBadge color={tr.direction === 'Long' ? T.accent.green : T.accent.red}>
                  {tr.direction === 'Long' ? '↑' : '↓'} {tr.direction}
                </TradingBadge>
                <TradingBadge color={tr.winLoss === 'Win' ? T.accent.green : tr.winLoss === 'Loss' ? T.accent.red : T.accent.orange}>
                  {tr.winLoss}
                </TradingBadge>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: tr.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>
                {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 10 }}>
              <div><span style={{ color: T.text.dim }}>Entry: </span><span style={{ color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{tr.entry}</span></div>
              <div><span style={{ color: T.text.dim }}>SL: </span><span style={{ color: T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{tr.stopLoss}</span></div>
              <div><span style={{ color: T.text.dim }}>Exit: </span><span style={{ color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{tr.exit}</span></div>
              <div><span style={{ color: T.text.dim }}>R: </span><span style={{ color: tr.returnR >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{tr.returnR.toFixed(2)}R</span></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 10, marginTop: 4 }}>
              <div><span style={{ color: T.text.dim }}>Risk: </span><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>${tr.risk}</span></div>
              <div><span style={{ color: T.text.dim }}>Lev: </span><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{tr.leverage}x</span></div>
              <div><span style={{ color: T.text.dim }}>Rules: </span><span style={{ color: tr.rules ? T.accent.green : T.accent.red }}>{tr.rules ? '✓' : '✗'}</span></div>
              <div><span style={{ color: T.text.dim }}>Dev: </span><span style={{ color: tr.deviation > 0.1 ? T.accent.red : T.accent.green, fontFamily: "'JetBrains Mono', monospace" }}>{tr.deviation.toFixed(3)}R</span></div>
            </div>
            {tr.comments && <div style={{ marginTop: 6, fontSize: 11, color: T.text.muted, fontStyle: 'italic' }}>"{tr.comments}"</div>}
          </div>
        ))}

        {/* AI Analysis button */}
        {onGenerateInsight && (
          <button onClick={onGenerateInsight} style={{
            width: '100%', padding: '10px', marginTop: 12,
            background: `linear-gradient(135deg, ${T.accent.purple}20, ${T.accent.blue}20)`,
            border: `1px solid ${T.accent.purple}30`, borderRadius: T.radius.md,
            color: T.accent.purple, cursor: 'pointer', fontSize: 12, fontWeight: 600
          }}>
            🧠 {isRTL ? 'ניתוח AI ליום זה' : 'AI Analysis for this Day'}
          </button>
        )}
      </div>
    </div>
  );
};
