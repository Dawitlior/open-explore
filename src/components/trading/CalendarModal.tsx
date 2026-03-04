import { useState, useCallback } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { I18nStrings } from '@/lib/trading-i18n';
import { TradingBadge } from './TradingUI';
import { generateDayInsights, generateDaySummary } from '@/lib/ai-engine';

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

interface DayAIInsight {
  type: string;
  icon: string;
  title: string;
  text: string;
  severity: string;
}

export const CalendarModal = ({ T, t, isRTL, day, month, year, trades, onClose }: CalendarModalProps) => {
  const [dayInsights, setDayInsights] = useState<DayAIInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const dayTrades = trades.filter(tr => {
    if (!tr.date) return false;
    const dateStr = tr.date.replace(' ', 'T');
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
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

  const handleDayAI = useCallback(() => {
    if (dayTrades.length === 0) return;
    setAiLoading(true);
    setShowAI(true);
    setTimeout(() => {
      try {
        // Use day-specific AI analysis that works directly from the day's trades
        const insights = generateDayInsights(dayTrades, isRTL);
        setDayInsights(insights);
      } catch {
        setDayInsights([{
          type: 'alert', icon: '⚠️', title: isRTL ? 'שגיאה' : 'Error',
          text: isRTL ? 'לא ניתן לנתח יום זה' : 'Unable to analyze this day',
          severity: 'medium'
        }]);
      }
      setAiLoading(false);
    }, 600);
  }, [dayTrades, isRTL]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: `linear-gradient(165deg, ${T.bg.card} 0%, ${T.bg.secondary} 100%)`,
        border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl,
        padding: 0, maxWidth: 600, width: '95%', maxHeight: '88vh', overflow: 'hidden',
        boxShadow: `${T.shadow.elevated}, 0 0 60px rgba(0,0,0,0.3)`,
        animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Premium header */}
        <div style={{
          padding: '22px 28px 18px',
          background: `linear-gradient(135deg, ${totalPnl >= 0 ? T.accent.green : T.accent.red}08, transparent)`,
          borderBottom: `1px solid ${T.border.subtle}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: T.text.primary }}>{dateStr}</div>
              <div style={{ fontSize: 11, color: T.text.muted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{dayTrades.length} {isRTL ? 'עסקאות' : 'trades'}</span>
                <span>•</span>
                <span>{wins} {isRTL ? 'ניצחונות' : 'wins'}</span>
                <span>•</span>
                <TradingBadge color={totalPnl >= 0 ? T.accent.green : T.accent.red}>
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                </TradingBadge>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: '50%', border: `1px solid ${T.border.medium}`,
              background: T.bg.tertiary, color: T.text.muted, fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
            }}>×</button>
          </div>
        </div>

        <div style={{ padding: '18px 28px 24px', overflowY: 'auto', maxHeight: 'calc(88vh - 90px)' }}>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
            {[
              { l: isRTL ? 'רווח/הפסד' : 'P&L', v: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, c: totalPnl >= 0 ? T.accent.green : T.accent.red, u: '$' },
              { l: isRTL ? 'סה"כ R' : 'Total R', v: `${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`, c: totalR >= 0 ? T.accent.green : T.accent.red, u: 'R' },
              { l: isRTL ? 'אחוז הצלחה' : 'Win Rate', v: `${dayTrades.length > 0 ? ((wins / dayTrades.length) * 100).toFixed(0) : 0}%`, c: T.accent.blue, u: '%' },
              { l: isRTL ? 'משמעת' : 'Discipline', v: allRulesFollowed ? '✅' : '⚠️', c: allRulesFollowed ? T.accent.green : T.accent.orange },
            ].map((s, i) => (
              <div key={i} style={{
                padding: 12, background: T.bg.tertiary, borderRadius: T.radius.md, textAlign: 'center',
                border: `1px solid ${T.border.subtle}`, transition: 'all 0.2s'
              }}>
                <div style={{ fontSize: 8, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.l}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.c, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{s.v}</div>
                {s.u && <div style={{ fontSize: 7, color: T.text.dim, marginTop: 1 }}>{s.u}</div>}
              </div>
            ))}
          </div>

          {/* Behavioral flags */}
          {(highDeviation.length > 0 || !allRulesFollowed || dayTrades.length >= 3) && (
            <div style={{
              padding: 12, background: `${T.accent.orange}08`, border: `1px solid ${T.accent.orange}20`,
              borderRadius: T.radius.md, marginBottom: 16
            }}>
              <div style={{ fontSize: 9, color: T.accent.orange, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.06em' }}>
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
          {dayTrades.map((tr) => (
            <div key={tr.id} style={{
              padding: 14, background: T.bg.tertiary, borderRadius: T.radius.md, marginBottom: 6,
              border: `1px solid ${tr.winLoss === 'Win' ? T.accent.green : tr.winLoss === 'Loss' ? T.accent.red : T.accent.orange}15`,
              transition: 'all 0.15s'
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

          {/* AI Analysis Section */}
          <div style={{ marginTop: 16 }}>
            {!showAI ? (
              <button onClick={handleDayAI} disabled={dayTrades.length === 0} style={{
                width: '100%', padding: '12px', marginTop: 0,
                background: `linear-gradient(135deg, ${T.accent.purple}15, ${T.accent.blue}15)`,
                border: `1px solid ${T.accent.purple}30`, borderRadius: T.radius.md,
                color: T.accent.purple, cursor: dayTrades.length === 0 ? 'default' : 'pointer',
                fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                opacity: dayTrades.length === 0 ? 0.5 : 1
              }}>
                🧠 {isRTL ? 'ניתוח AI ליום זה' : 'AI Analysis for this Day'}
              </button>
            ) : (
              <div style={{
                background: `linear-gradient(135deg, ${T.accent.purple}06, ${T.accent.blue}06)`,
                border: `1px solid ${T.accent.purple}20`, borderRadius: T.radius.md,
                padding: 16, animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{ fontSize: 10, color: T.accent.purple, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  🧠 {isRTL ? 'ניתוח AI' : 'AI Day Analysis'}
                </div>
                <div style={{ fontSize: 9, color: T.text.dim, marginBottom: 12 }}>
                  {isRTL
                    ? `ניתוח דינמי מבוסס ${dayTrades.length} עסקאות ביום זה • ${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`
                    : `Dynamic analysis based on ${dayTrades.length} trades this day • ${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`}
                </div>
                {aiLoading ? (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <div style={{ fontSize: 28, marginBottom: 8, animation: 'pulse 1.2s ease infinite' }}>🧠</div>
                    <div style={{ fontSize: 12, color: T.text.muted }}>{isRTL ? 'מנתח את היום...' : 'Analyzing this day...'}</div>
                  </div>
                ) : dayInsights.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 16, color: T.text.dim, fontSize: 12 }}>
                    {isRTL ? 'אין תובנות ליום זה' : 'No insights for this day'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dayInsights.map((ins, i) => {
                      const c = ins.type === 'strength' ? T.accent.green : ins.type === 'weakness' ? T.accent.red : ins.type === 'alert' ? T.accent.orange : ins.type === 'momentum' ? T.accent.purple : T.accent.cyan;
                      return (
                        <div key={i} style={{
                          padding: 10, borderRadius: T.radius.md, background: `${c}08`,
                          borderInlineStart: `3px solid ${c}`, animation: `fadeIn ${0.2 + i * 0.1}s ease`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14 }}>{ins.icon}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{ins.title}</span>
                            {ins.severity === 'high' && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: `${T.accent.red}20`, color: T.accent.red, fontWeight: 700 }}>HIGH</span>}
                          </div>
                          <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 4, lineHeight: 1.5 }}>{ins.text}</div>
                        </div>
                      );
                    })}
                    {/* Day summary */}
                    <div style={{ marginTop: 4, padding: 10, background: T.bg.tertiary, borderRadius: T.radius.md, fontSize: 11, color: T.text.muted, lineHeight: 1.6 }}>
                      {generateDaySummary(dayTrades, isRTL)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
