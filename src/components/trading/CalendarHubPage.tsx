import { useMemo, useState } from 'react';
import type { Trade } from '@/data/trades';
import { GlassCard } from '@/components/trading/TradingUI';
import { CalendarModal } from '@/components/trading/CalendarModal';
import { FeatureHint } from '@/components/trading/FeatureHint';
import { getCalDays } from '@/lib/trading-analytics';
import { getDayRiskColor, checkRiskLimits } from '@/lib/risk-limits';

type Props = {
  T: any; isRTL: boolean; trades: Trade[];
  t: any;
  isMobile?: boolean;
  onGenerateInsight?: () => void;
};

const monthsHe = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const monthsEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const CalendarHubPage = ({ T, isRTL, trades, t, isMobile, onGenerateInsight }: Props) => {
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calHoverDay, setCalHoverDay] = useState<number | null>(null);
  const [calModalDay, setCalModalDay] = useState<number | null>(null);

  const months = isRTL ? monthsHe : monthsEn;
  const dayNames = isRTL ? ['א','ב','ג','ד','ה','ו','ש'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const monthTrades = useMemo(() => trades.filter(tr => {
    if (!tr.date) return false;
    const d = new Date(tr.date.replace(' ', 'T'));
    return !isNaN(d.getTime()) && d.getMonth() === calMonth && d.getFullYear() === calYear;
  }), [trades, calMonth, calYear]);

  const calDayPnl = useMemo(() => {
    const m: Record<number, { pnl: number; trades: number; wins: number; details: Trade[] }> = {};
    monthTrades.forEach(tr => {
      const d = new Date(tr.date.replace(' ', 'T'));
      const day = d.getDate();
      if (!m[day]) m[day] = { pnl: 0, trades: 0, wins: 0, details: [] };
      m[day].pnl += tr.pnl; m[day].trades++; if (tr.winLoss === 'Win') m[day].wins++;
      m[day].details.push(tr);
    });
    return m;
  }, [monthTrades]);

  const calDays = useMemo(() => getCalDays(calYear, calMonth), [calYear, calMonth]);

  const weekStats = useMemo(() => {
    const w: { week: number; pnl: number; trades: number; days: number }[] = [];
    let wp = 0, wt = 0, wd = 0, wn = 1;
    calDays.forEach((d, i) => {
      if (d && calDayPnl[d]) { wp += calDayPnl[d].pnl; wt += calDayPnl[d].trades; wd++; }
      if ((i + 1) % 7 === 0 || i === calDays.length - 1) { w.push({ week: wn, pnl: wp, trades: wt, days: wd }); wp = 0; wt = 0; wd = 0; wn++; }
    });
    return w;
  }, [calDays, calDayPnl]);

  const monthStats = useMemo(() => {
    const wins = monthTrades.filter(tr => tr.winLoss === 'Win').length;
    const losses = monthTrades.filter(tr => tr.winLoss === 'Loss').length;
    const totalPnl = monthTrades.reduce((s, tr) => s + tr.pnl, 0);
    const totalR = monthTrades.reduce((s, tr) => s + tr.returnR, 0);
    const winRate = monthTrades.length ? (wins / monthTrades.length) * 100 : 0;
    return { count: monthTrades.length, wins, losses, totalPnl, totalR, winRate };
  }, [monthTrades]);

  const calRiskStatus = checkRiskLimits(trades);

  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <FeatureHint
        T={T}
        id="calendar-hub-page-fullscreen"
        text={isRTL
          ? 'מרכז לוח השנה — תצוגה מלאה ומסך-מלא של ביצועי החודש. לחץ על יום כדי לראות עסקאות ולהוסיף תובנה.'
          : 'Calendar Hub — full-screen monthly performance. Click any day to see trades and generate insights.'}
      />

      {calRiskStatus.monthlyBreached && (
        <div style={{ padding: '10px 16px', background: `${T.accent.red}15`, border: `2px solid ${T.accent.red}40`, borderRadius: T.radius.md, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.accent.red }}>{isRTL ? 'מגבלת הפסד חודשית הושגה' : 'Monthly Loss Limit Reached'}</div>
            <div style={{ fontSize: 10, color: T.text.muted }}>{isRTL ? `הפסד חודשי: ${calRiskStatus.monthlyNegR.toFixed(1)}R` : `Monthly loss: ${calRiskStatus.monthlyNegR.toFixed(1)}R`}</div>
          </div>
        </div>
      )}

      {/* Header / month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md, padding: '8px 14px', color: T.text.secondary, cursor: 'pointer', fontSize: 18 }}>‹</button>
          <select value={calYear} onChange={e => setCalYear(+e.target.value)} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, padding: '6px 10px', color: T.text.primary, fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>
            {[2024,2025,2026,2027,2028].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: T.text.primary }}>{months[calMonth]}</div>
          <button onClick={() => { setCalMonth(now.getMonth()); setCalYear(now.getFullYear()); }} style={{ background: 'transparent', border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, padding: '6px 12px', color: T.text.muted, cursor: 'pointer', fontSize: 11 }}>{isRTL ? 'היום' : 'Today'}</button>
          <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md, padding: '8px 14px', color: T.text.secondary, cursor: 'pointer', fontSize: 18 }}>›</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
            <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase' }}>{isRTL ? 'סה״כ חודש' : 'Monthly Total'}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: monthStats.totalPnl >= 0 ? T.accent.cyan : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>${monthStats.totalPnl.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
            <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase' }}>{isRTL ? 'עסקאות' : 'Trades'}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{monthStats.count}</div>
          </div>
          <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
            <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase' }}>{isRTL ? 'אחוז זכייה' : 'Win Rate'}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: monthStats.winRate >= 50 ? T.accent.green : T.accent.orange, fontFamily: "'JetBrains Mono', monospace" }}>{monthStats.winRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Big full-screen calendar grid + slim weekly summary rail */}
      <div style={{ display: 'flex', gap: isMobile ? 12 : 18, flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <GlassCard T={T} style={{ padding: isMobile ? 12 : 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 4 : 8, marginBottom: 8 }}>
              {dayNames.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: isMobile ? 10 : 12, color: T.text.muted, fontWeight: 700, padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 4 : 8 }}>
              {calDays.map((d, i) => {
                const dd = d ? calDayPnl[d] : null;
                const isHovered = d === calHoverDay;
                const intensity = dd ? Math.min(1, Math.abs(dd.pnl) / 10) : 0;
                const riskColor = d ? getDayRiskColor(trades, d, calMonth, calYear) : 'neutral';
                const isDarkRed = riskColor === 'darkred';
                const baseHeight = isMobile ? 80 : 130;
                return (
                  <div key={i}
                    onMouseEnter={() => d && setCalHoverDay(d)}
                    onMouseLeave={() => setCalHoverDay(null)}
                    onClick={() => dd && d && setCalModalDay(d)}
                    style={{
                      minHeight: isHovered && dd ? baseHeight + 30 : baseHeight,
                      borderRadius: T.radius.md,
                      border: `1px solid ${isDarkRed ? `${T.accent.red}60` : dd ? (dd.pnl > 0 ? `${T.accent.green}${Math.round(40 + intensity * 60).toString(16)}` : dd.pnl < 0 ? `${T.accent.red}${Math.round(40 + intensity * 60).toString(16)}` : `${T.accent.orange}30`) : T.border.subtle}`,
                      background: isDarkRed ? `${T.accent.red}25` : dd ? (dd.pnl > 0 ? `${T.accent.green}${Math.round(15 + intensity * 25).toString(16).padStart(2, '0')}` : dd.pnl < 0 ? `${T.accent.red}${Math.round(12 + intensity * 20).toString(16).padStart(2, '0')}` : `${T.accent.orange}12`) : 'transparent',
                      padding: isMobile ? '6px 6px' : '10px 12px',
                      transition: 'all 0.2s ease',
                      cursor: dd ? 'pointer' : 'default',
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                    {d && (
                      <>
                        <div style={{ fontSize: isMobile ? 12 : 15, color: T.text.muted, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>{d}</span>{isDarkRed && <span title="Risk limit exceeded">⚠️</span>}
                        </div>
                        {dd && (
                          <>
                            <div style={{ fontSize: isMobile ? 14 : 22, fontWeight: 800, color: isDarkRed ? T.accent.red : dd.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace", marginTop: 6 }}>
                              {dd.pnl >= 0 ? '+' : '-'}${Math.abs(dd.pnl).toFixed(0)}
                            </div>
                            <div style={{ fontSize: isMobile ? 9 : 11, color: T.text.muted, marginTop: 4 }}>
                              {dd.trades} {isRTL ? 'עסקאות' : 'tr'} · {dd.wins}/{dd.trades} W
                            </div>
                            {isHovered && (
                              <div style={{ fontSize: 10, color: T.text.secondary, marginTop: 6, lineHeight: 1.3, overflow: 'hidden' }}>
                                {dd.details.slice(0, 4).map(det => det.coin).join(', ')}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Slim weekly rail */}
        <div style={{ width: isMobile ? '100%' : 220, flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 700 }}>
            {isRTL ? 'סיכום שבועי' : 'Weekly Summary'}
          </div>
          {weekStats.map((w, i) => (
            <GlassCard T={T} key={i} style={{ marginBottom: 8, padding: 12 }}>
              <div style={{ fontSize: 9, color: T.text.muted, marginBottom: 4 }}>{isRTL ? `שבוע ${w.week}` : `Week ${w.week}`}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: w.pnl >= 0 ? T.accent.green : w.pnl < 0 ? T.accent.red : T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                {w.pnl !== 0 ? `${w.pnl >= 0 ? '+' : ''}$${w.pnl.toFixed(2)}` : '$0.00'}
              </div>
              <div style={{ fontSize: 9, color: T.text.muted, marginTop: 2 }}>{w.trades} {isRTL ? 'עסקאות' : 'trades'} · {w.days}d</div>
            </GlassCard>
          ))}
        </div>
      </div>

      {calModalDay && (
        <CalendarModal
          T={T}
          t={t}
          isRTL={isRTL}
          day={calModalDay}
          month={calMonth}
          year={calYear}
          trades={trades}
          onClose={() => setCalModalDay(null)}
          onGenerateInsight={onGenerateInsight}
        />
      )}
    </div>
  );
};

export default CalendarHubPage;
