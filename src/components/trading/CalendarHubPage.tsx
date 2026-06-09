import { useMemo, useState, memo } from 'react';
import type { Trade } from '@/data/trades';
import { GlassCard } from '@/components/trading/TradingUI';
import { CalendarModal } from '@/components/trading/CalendarModal';
import { FeatureHint } from '@/components/trading/FeatureHint';
import { getCalDays } from '@/lib/trading-analytics';
import { getDayRiskColor, checkRiskLimits } from '@/lib/risk-limits';
import { sumR, formatR } from '@/lib/r-multiple';

import { useMonthEconomicEvents } from '@/hooks/use-month-economic-events';
import { MacroEventStrip, MacroDot } from '@/components/economic/MacroEventStrip';



type Props = {
  T: any; isRTL: boolean; trades: Trade[];
  t: any;
  isMobile?: boolean;
  onGenerateInsight?: () => void;
  onSetManualR?: (tradeId: number, value: number | null) => Promise<void> | void;
};

const monthsHe = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const monthsEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const CalendarHubPage_Impl = ({ T, isRTL, trades, t, isMobile, onGenerateInsight, onSetManualR }: Props) => {
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calModalDay, setCalModalDay] = useState<number | null>(null);


  const months = isRTL ? monthsHe : monthsEn;
  const dayNames = isRTL ? ['א','ב','ג','ד','ה','ו','ש'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const monthTrades = useMemo(() => trades.filter(tr => {
    if (!tr.date) return false;
    const d = new Date(tr.date.replace(' ', 'T'));
    return !isNaN(d.getTime()) && d.getMonth() === calMonth && d.getFullYear() === calYear;
  }), [trades, calMonth, calYear]);

  const calDayPnl = useMemo(() => {
    const m: Record<number, { pnl: number; trades: number; wins: number; details: Trade[]; rTotal: number; rValid: number; rMissing: number }> = {};
    monthTrades.forEach(tr => {
      const d = new Date(tr.date.replace(' ', 'T'));
      const day = d.getDate();
      if (!m[day]) m[day] = { pnl: 0, trades: 0, wins: 0, details: [], rTotal: 0, rValid: 0, rMissing: 0 };
      m[day].pnl += tr.pnl; m[day].trades++; if (tr.winLoss === 'Win') m[day].wins++;
      m[day].details.push(tr);
    });
    // Aggregate R per day via the centralized engine (ignores N/A).
    Object.keys(m).forEach(k => {
      const day = +k;
      const agg = sumR(m[day].details);
      m[day].rTotal = agg.total;
      m[day].rValid = agg.validCount;
      m[day].rMissing = agg.missingCount;
    });
    return m;
  }, [monthTrades]);

  const calDays = useMemo(() => getCalDays(calYear, calMonth), [calYear, calMonth]);

  // Strategic Calendar overlay — T1 only, USA + China only (zero noise).
  const { byDay: macroByDayRaw } = useMonthEconomicEvents({ year: calYear, month: calMonth, impacts: ['t1'] });
  const macroByDay = useMemo(() => {
    const m = new Map<number, typeof macroByDayRaw extends Map<number, infer V> ? V : never>();
    macroByDayRaw.forEach((list, day) => {
      const filtered = list.filter((e) => {
        const c = (e.currency || '').toUpperCase();
        return c === 'USD' || c === 'CNY';
      });
      if (filtered.length) m.set(day, filtered);
    });
    return m;
  }, [macroByDayRaw]);



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
    const rAgg = sumR(monthTrades);
    const winRate = monthTrades.length ? (wins / monthTrades.length) * 100 : 0;
    return { count: monthTrades.length, wins, losses, totalPnl, totalR: rAgg.total, rValid: rAgg.validCount, rMissing: rAgg.missingCount, winRate };
  }, [monthTrades]);

  const calRiskStatus = checkRiskLimits(trades);
  const todayN = now.getDate();
  const isCurrentMonth = now.getMonth() === calMonth && now.getFullYear() === calYear;

  /* =========================================================
     MOBILE — iOS-style compact calendar
     ========================================================= */
  if (isMobile) {
    return (
      <div style={{ direction: isRTL ? 'rtl' : 'ltr', padding: '4px 2px 24px' }}>
        {calRiskStatus.monthlyBreached && (
          <div style={{ padding: '10px 14px', background: `${T.accent.red}15`, border: `1px solid ${T.accent.red}40`, borderRadius: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🚨</span>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.accent.red }}>
              {isRTL ? `מגבלת הפסד חודשית: ${calRiskStatus.monthlyNegR.toFixed(1)}R` : `Monthly loss limit: ${calRiskStatus.monthlyNegR.toFixed(1)}R`}
            </div>
          </div>
        )}

        {/* iOS-style month header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 6px 14px' }}>
          <button
            onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}
            style={{ background: 'transparent', border: 'none', color: T.accent.cyan, fontSize: 22, cursor: 'pointer', padding: 4, fontWeight: 300 }}
            aria-label="previous month"
          >{isRTL ? '›' : '‹'}</button>

          <button
            onClick={() => { setCalMonth(now.getMonth()); setCalYear(now.getFullYear()); }}
            style={{ background: 'transparent', border: 'none', color: T.text.primary, fontSize: 22, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.02em' }}
          >
            {months[calMonth]} <span style={{ color: T.accent.cyan, fontWeight: 400 }}>{calYear}</span>
          </button>

          <button
            onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}
            style={{ background: 'transparent', border: 'none', color: T.accent.cyan, fontSize: 22, cursor: 'pointer', padding: 4, fontWeight: 300 }}
            aria-label="next month"
          >{isRTL ? '‹' : '›'}</button>
        </div>

        {/* Compact monthly summary chip row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
          {[
            { l: isRTL ? 'P&L' : 'P&L', v: `${monthStats.totalPnl >= 0 ? '+' : '-'}$${Math.abs(monthStats.totalPnl).toFixed(0)}`, c: monthStats.totalPnl >= 0 ? T.accent.green : T.accent.red },
            { l: isRTL ? 'עסקאות' : 'Trades', v: `${monthStats.count}`, c: T.text.primary },
            { l: isRTL ? 'WR' : 'Win%', v: `${monthStats.winRate.toFixed(0)}%`, c: monthStats.winRate >= 50 ? T.accent.green : T.accent.orange },
          ].map((s, i) => (
            <div key={i} style={{ padding: '8px 6px', background: T.bg.card, borderRadius: 12, border: `1px solid ${T.border.subtle}`, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.l}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.c, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Weekday labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {dayNames.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: T.text.muted, fontWeight: 600, padding: '4px 0', letterSpacing: '0.06em' }}>{d}</div>
          ))}
        </div>

        {/* iOS-style compact grid: square cells, dot indicator */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {calDays.map((d, i) => {
            const dd = d ? calDayPnl[d] : null;
            const isToday = isCurrentMonth && d === todayN;
            const riskColor = d ? getDayRiskColor(trades, d, calMonth, calYear) : 'neutral';
            const isDarkRed = riskColor === 'darkred';
            const dotColor = dd ? (isDarkRed ? T.accent.red : dd.pnl > 0 ? T.accent.green : dd.pnl < 0 ? T.accent.red : T.accent.orange) : null;
            const macros = d ? macroByDay.get(d) ?? [] : [];
            const dayPast = !!d && new Date(calYear, calMonth, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const hasContent = !!dd || macros.length > 0;

            return (
              <button
                key={i}
                disabled={!d}
                onClick={() => hasContent && d && setCalModalDay(d)}
                style={{
                  aspectRatio: '1',
                  border: 'none',
                  background: 'transparent',
                  cursor: hasContent ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  padding: 0,
                  position: 'relative',
                }}
              >
                {d && (
                  <>
                    <span style={{
                      width: 30, height: 30, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15,
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? '#001023' : T.text.primary,
                      background: isToday ? T.accent.cyan : 'transparent',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}>{d}</span>
                    {dotColor && (
                      <span style={{
                        position: 'absolute', bottom: 4,
                        width: 5, height: 5, borderRadius: '50%',
                        background: dotColor,
                        boxShadow: `0 0 6px ${dotColor}80`,
                      }} />
                    )}
                    <MacroDot events={macros} isPast={dayPast} />
                  </>
                )}
              </button>
            );
          })}

        </div>

        {/* Active-day list (mini chips below grid) */}
        {monthTrades.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 700, padding: '0 4px' }}>
              {isRTL ? 'ימי מסחר החודש' : 'Active Days'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(calDayPnl)
                .sort(([a], [b]) => +a - +b)
                .map(([day, info]) => {
                  const dayN = +day;
                  const pnl = info.pnl;
                  const isPos = pnl >= 0;
                  return (
                    <button
                      key={dayN}
                      onClick={() => setCalModalDay(dayN)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: T.bg.card,
                        border: `1px solid ${isPos ? T.accent.green : T.accent.red}25`,
                        borderRadius: 12, cursor: 'pointer',
                        borderInlineStart: `3px solid ${isPos ? T.accent.green : T.accent.red}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: T.text.primary, minWidth: 24, textAlign: 'center' }}>{dayN}</div>
                        <div style={{ fontSize: 10, color: T.text.muted }}>
                          {info.trades} {isRTL ? 'עסקאות' : 'tr'} · {info.wins}/{info.trades} W
                        </div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: isPos ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>
                        {isPos ? '+' : '-'}${Math.abs(pnl).toFixed(0)}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {calModalDay && (
          <CalendarModal
            T={T} t={t} isRTL={isRTL}
            day={calModalDay} month={calMonth} year={calYear}
            trades={trades}
            isMobile
            onClose={() => setCalModalDay(null)}
            onGenerateInsight={onGenerateInsight}
            onSetManualR={onSetManualR}
          />
        )}
      </div>
    );
  }

  /* =========================================================
     DESKTOP — Immersive premium calendar (unchanged behavior)
     ========================================================= */
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md, padding: '8px 14px', color: T.text.secondary, cursor: 'pointer', fontSize: 18 }}>‹</button>
          <select value={calYear} onChange={e => setCalYear(+e.target.value)} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, padding: '6px 10px', color: T.text.primary, fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>
            {[2024,2025,2026,2027,2028].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: T.text.primary }}>{months[calMonth]}</div>
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

      <div style={{ display: 'flex', gap: 18 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <GlassCard T={T} style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
              {dayNames.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 12, color: T.text.muted, fontWeight: 700, padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
              {calDays.map((d, i) => {
                const dd = d ? calDayPnl[d] : null;
                const intensity = dd ? Math.min(1, Math.abs(dd.pnl) / 10) : 0;
                const riskColor = d ? getDayRiskColor(trades, d, calMonth, calYear) : 'neutral';
                const isDarkRed = riskColor === 'darkred';
                const isToday = isCurrentMonth && d === todayN;
                const macros = d ? macroByDay.get(d) ?? [] : [];
                const dayPast = !!d && new Date(calYear, calMonth, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const hasContent = !!dd || macros.length > 0;
                return (
                  <div key={i}
                    onClick={() => hasContent && d && setCalModalDay(d)}
                    style={{
                      minHeight: 130,
                      borderRadius: T.radius.md,
                      border: `1px solid ${isToday ? T.accent.cyan : isDarkRed ? `${T.accent.red}60` : dd ? (dd.pnl > 0 ? `${T.accent.green}${Math.round(40 + intensity * 60).toString(16)}` : dd.pnl < 0 ? `${T.accent.red}${Math.round(40 + intensity * 60).toString(16)}` : `${T.accent.orange}30`) : T.border.subtle}`,
                      background: isDarkRed ? `${T.accent.red}25` : dd ? (dd.pnl > 0 ? `${T.accent.green}${Math.round(15 + intensity * 25).toString(16).padStart(2, '0')}` : dd.pnl < 0 ? `${T.accent.red}${Math.round(12 + intensity * 20).toString(16).padStart(2, '0')}` : `${T.accent.orange}12`) : 'transparent',
                      padding: '10px 12px',
                      cursor: hasContent ? 'pointer' : 'default',
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                    {d && (
                      <>
                        <div style={{ fontSize: 15, color: isToday ? T.accent.cyan : T.text.muted, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>{d}</span>{isDarkRed && <span title="Risk limit exceeded">⚠️</span>}
                        </div>
                        {dd && (
                          <>
                            <div style={{ fontSize: 22, fontWeight: 800, color: isDarkRed ? T.accent.red : dd.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace", marginTop: 6 }}>
                              {dd.pnl >= 0 ? '+' : '-'}${Math.abs(dd.pnl).toFixed(0)}
                            </div>
                            <div style={{ fontSize: 11, color: T.text.muted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{dd.trades} {isRTL ? 'עסקאות' : 'tr'} · {dd.wins}/{dd.trades} W</span>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: dd.rValid === 0 ? T.text.muted : dd.rTotal >= 0 ? T.accent.green : T.accent.red }}>
                                {dd.rValid === 0 ? 'N/A' : `${dd.rTotal >= 0 ? '+' : ''}${dd.rTotal.toFixed(1)}R`}
                              </span>
                            </div>
                          </>
                        )}
                        {/* Macro economic events strip — bottom of cell */}
                        <div style={{ marginTop: 'auto', paddingTop: dd ? 6 : 4 }}>
                          <MacroEventStrip events={macros} isPast={dayPast} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

            </div>
          </GlassCard>
        </div>

        <div style={{ width: 220, flexShrink: 0 }}>
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
          T={T} t={t} isRTL={isRTL}
          day={calModalDay} month={calMonth} year={calYear}
          trades={trades}
          onClose={() => setCalModalDay(null)}
          onGenerateInsight={onGenerateInsight}
          onSetManualR={onSetManualR}
        />
      )}
    </div>
  );
};


export const CalendarHubPage = memo(CalendarHubPage_Impl);
export default CalendarHubPage;
