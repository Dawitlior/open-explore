import { useMemo, useState, memo, useRef, Fragment } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { Trade } from '@/data/trades';
import { GlassCard } from '@/components/trading/TradingUI';
import { CalendarModal } from '@/components/trading/CalendarModal';
import { FeatureHint } from '@/components/trading/FeatureHint';
import { getCalDays } from '@/lib/trading-analytics';
import { getDayRiskColor, checkRiskLimits } from '@/lib/risk-limits';
import { sumR, formatR } from '@/lib/r-multiple';
import { useEffectiveDisplayMode } from '@/lib/display-mode';
import { useMonthEconomicEvents } from '@/hooks/use-month-economic-events';
import { MacroEventStrip, MacroDot, MacroSideDots } from '@/components/economic/MacroEventStrip';
import {
  CalendarZoomProvider,
  useCalendarZoom,
  useCalendarGestures,
  type ZoomLevel,
} from '@/components/calendar/CalendarZoomProvider';
import { YearView } from '@/components/calendar/views/YearView';

type Props = {
  T: any; isRTL: boolean; trades: Trade[];
  t: any;
  isMobile?: boolean;
  onGenerateInsight?: () => void;
  onSetManualR?: (tradeId: number, value: number | null) => Promise<void> | void;
};

const monthsHe = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const monthsEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ── transition variants ──────────────────────────────────────── */
const variants = {
  enter: { opacity: 0, scale: 0.94 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.04 },
};
const transition = { duration: 0.22, ease: 'easeOut' as const };

/* ── Zoom toggle ──────────────────────────────────────────────── */
function ZoomToggle({ T }: { T: any }) {
  const { zoomLevel, setZoomLevel } = useCalendarZoom();
  return (
    <ToggleButtonGroup
      value={zoomLevel}
      exclusive
      size="small"
      onChange={(_, v) => v && setZoomLevel(v as ZoomLevel)}
      aria-label="calendar zoom level"
      sx={{
        '& .MuiToggleButton-root': {
          color: T.text.muted,
          borderColor: T.border.subtle,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          padding: '4px 10px',
          fontFamily: "'JetBrains Mono', monospace",
          '&.Mui-selected': {
            color: T.accent.cyan,
            background: `${T.accent.cyan}18`,
            borderColor: `${T.accent.cyan}50`,
          },
        },
      }}
    >
      <ToggleButton value="month">M</ToggleButton>
      <ToggleButton value="year">Y</ToggleButton>
    </ToggleButtonGroup>
  );
}

/* ── Inner calendar — reads zoom from context ─────────────────── */
function CalendarInner({ T, isRTL, trades, t, isMobile, onGenerateInsight, onSetManualR }: Props) {
  const { zoomLevel, focusedDate, setFocusedDate, setZoomLevel } = useCalendarZoom();
  const { isR } = useEffectiveDisplayMode(trades);
  const containerRef = useRef<HTMLDivElement>(null!);
  useCalendarGestures(containerRef);

  const calMonth = focusedDate.getMonth();
  const calYear = focusedDate.getFullYear();

  const [calModalDay, setCalModalDay] = useState<number | null>(null);

  const now = new Date();
  const months = isRTL ? monthsHe : monthsEn;
  const dayNames = isRTL ? ['א','ב','ג','ד','ה','ו','ש'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const navPrev = () => {
    const d = new Date(focusedDate);
    if (zoomLevel === 'year') d.setFullYear(d.getFullYear() - 1);
    else if (zoomLevel === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 1);
    setFocusedDate(d);
  };
  const navNext = () => {
    const d = new Date(focusedDate);
    if (zoomLevel === 'year') d.setFullYear(d.getFullYear() + 1);
    else if (zoomLevel === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 1);
    setFocusedDate(d);
  };

  // Week start: Sunday of the week containing focusedDate
  const weekStart = useMemo(() => {
    const d = new Date(focusedDate);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [focusedDate]);

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
    Object.keys(m).forEach(k => {
      const agg = sumR(m[+k].details);
      m[+k].rTotal = agg.total; m[+k].rValid = agg.validCount; m[+k].rMissing = agg.missingCount;
    });
    return m;
  }, [monthTrades]);

  const calDays = useMemo(() => getCalDays(calYear, calMonth), [calYear, calMonth]);

  const { byDay: macroByDayRaw } = useMonthEconomicEvents({ year: calYear, month: calMonth, impacts: ['t1'] });
  const macroByDay = useMemo(() => {
    const m = new Map<number, any[]>();
    macroByDayRaw.forEach((list, day) => {
      const filtered = list.filter((e: any) => ['USD','CNY'].includes((e.currency||'').toUpperCase()));
      if (filtered.length) m.set(day, filtered);
    });
    return m;
  }, [macroByDayRaw]);

  const weekStats = useMemo(() => {
    const w: { week: number; pnl: number; rTotal: number; rValid: number; trades: number; days: number }[] = [];
    let wp = 0, wr = 0, wrv = 0, wt = 0, wd = 0, wn = 1;
    calDays.forEach((d, i) => {
      if (d && calDayPnl[d]) {
        wp += calDayPnl[d].pnl; wr += calDayPnl[d].rTotal; wrv += calDayPnl[d].rValid;
        wt += calDayPnl[d].trades; wd++;
      }
      if ((i + 1) % 7 === 0 || i === calDays.length - 1) {
        w.push({ week: wn, pnl: wp, rTotal: wr, rValid: wrv, trades: wt, days: wd });
        wp = 0; wr = 0; wrv = 0; wt = 0; wd = 0; wn++;
      }
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

  /* ── title for header ── */
  const headerTitle = useMemo(() => {
    if (zoomLevel === 'year') return String(calYear);
    if (zoomLevel === 'month') return `${months[calMonth]} ${calYear}`;
    return focusedDate.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [zoomLevel, calYear, calMonth, months, focusedDate, isRTL]);

  /* ── Mobile ── */
  if (isMobile) {
    return (
      <div ref={containerRef} style={{ direction: isRTL ? 'rtl' : 'ltr', padding: '4px 2px 24px', touchAction: 'pan-y' }}>
        {/* Mobile header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 6px 10px' }}>
          <button onClick={navPrev} style={{ background: 'transparent', border: 'none', color: T.accent.cyan, fontSize: 22, cursor: 'pointer' }}>{isRTL ? '›' : '‹'}</button>
          <button onClick={() => setFocusedDate(new Date())} style={{ background: 'transparent', border: 'none', color: T.text.primary, fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>{headerTitle}</button>
          <button onClick={navNext} style={{ background: 'transparent', border: 'none', color: T.accent.cyan, fontSize: 22, cursor: 'pointer' }}>{isRTL ? '‹' : '›'}</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <ZoomToggle T={T} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={zoomLevel} variants={variants} initial="enter" animate="center" exit="exit" transition={transition}>
            {zoomLevel === 'year' && (
              <YearView T={T} isRTL={isRTL} trades={trades} year={calYear} />
            )}
            {zoomLevel === 'month' && (
              <>
                {/* compact month grid for mobile */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                  {dayNames.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 10, color: T.text.muted, fontWeight: 600, padding: '4px 0' }}>{d}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                  {calDays.map((d, i) => {
                    const dd = d ? calDayPnl[d] : null;
                    const isToday = isCurrentMonth && d === todayN;
                    const ddLead = dd ? (isR && dd.rValid > 0 ? dd.rTotal : dd.pnl) : 0;
                    const dotColor = dd ? (ddLead > 0 ? T.accent.green : ddLead < 0 ? T.accent.red : T.accent.orange) : null;
                    const macros = d ? macroByDay.get(d) ?? [] : [];
                    const dayPast = !!d && new Date(calYear, calMonth, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const hasContent = !!dd || macros.length > 0;
                    return (
                      <button key={i} disabled={!d} onClick={() => { if (hasContent && d) setCalModalDay(d); }}
                        style={{ aspectRatio: '1', border: 'none', background: 'transparent', cursor: hasContent ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: 0, position: 'relative' }}>
                        {d && (<>
                          <span style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: isToday ? 700 : 500, color: isToday ? '#001023' : T.text.primary, background: isToday ? T.accent.cyan : 'transparent' }}>{d}</span>
                          {dotColor && <span style={{ position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: '50%', background: dotColor }} />}
                          <MacroDot events={macros} isPast={dayPast} />
                        </>)}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {calModalDay && (
          <CalendarModal T={T} t={t} isRTL={isRTL} day={calModalDay} month={calMonth} year={calYear} trades={trades} isMobile onClose={() => setCalModalDay(null)} onGenerateInsight={onGenerateInsight} onSetManualR={onSetManualR} />
        )}
      </div>
    );
  }

  /* ── Desktop ── */
  return (
    <div ref={containerRef} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      {calRiskStatus.monthlyBreached && (
        <div style={{ padding: '10px 16px', background: `${T.accent.red}15`, border: `2px solid ${T.accent.red}40`, borderRadius: T.radius.md, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.accent.red }}>{isRTL ? 'מגבלת הפסד חודשית הושגה' : 'Monthly Loss Limit Reached'}</div>
            <div style={{ fontSize: 10, color: T.text.muted }}>{isRTL ? `הפסד חודשי: ${calRiskStatus.monthlyNegR.toFixed(1)}R` : `Monthly loss: ${calRiskStatus.monthlyNegR.toFixed(1)}R`}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={navPrev} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md, padding: '8px 14px', color: T.text.secondary, cursor: 'pointer', fontSize: 18 }}>{isRTL ? '›' : '‹'}</button>
          {zoomLevel !== 'year' && (
            <select value={calYear} onChange={e => setFocusedDate(new Date(+e.target.value, calMonth, 1))} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, padding: '6px 10px', color: T.text.primary, fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>
              {[2024,2025,2026,2027,2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: T.text.primary }}>{headerTitle}</div>
          <button onClick={() => setFocusedDate(new Date())} style={{ background: 'transparent', border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, padding: '6px 12px', color: T.text.muted, cursor: 'pointer', fontSize: 11 }}>{isRTL ? 'היום' : 'Today'}</button>
          <button onClick={navNext} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md, padding: '8px 14px', color: T.text.secondary, cursor: 'pointer', fontSize: 18 }}>{isRTL ? '‹' : '›'}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {zoomLevel !== 'year' && (
            <>
              <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase' }}>{isRTL ? 'סה״כ חודש' : 'Monthly Total'}</div>
                {(() => {
                  const useR = isR && monthStats.rValid > 0;
                  const lead = useR ? monthStats.totalR : monthStats.totalPnl;
                  const leadStr = useR ? `${lead >= 0 ? '+' : ''}${lead.toFixed(1)}R` : `${lead < 0 ? '-' : ''}$${Math.abs(lead).toFixed(2)}`;
                  return <div style={{ fontSize: 22, fontWeight: 700, color: lead >= 0 ? T.accent.cyan : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{leadStr}</div>;
                })()}
              </div>
              <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase' }}>{isRTL ? 'עסקאות' : 'Trades'}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{monthStats.count}</div>
              </div>
              <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase' }}>{isRTL ? 'אחוז זכייה' : 'Win Rate'}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: monthStats.winRate >= 50 ? T.accent.green : T.accent.orange, fontFamily: "'JetBrains Mono', monospace" }}>{monthStats.winRate.toFixed(1)}%</div>
              </div>
            </>
          )}
          <ZoomToggle T={T} />
        </div>
      </div>

      {/* Animated view switcher */}
      <AnimatePresence mode="wait">
        <motion.div key={zoomLevel} variants={variants} initial="enter" animate="center" exit="exit" transition={transition}>
          {zoomLevel === 'year' && (
            <YearView T={T} isRTL={isRTL} trades={trades} year={calYear} />
          )}
          {zoomLevel === 'month' && (() => {
            // Desktop MonthView — flat, editorial day grid inspired by the
            // approved reference. 8-column grid: 7 weekday columns + 1
            // integrated weekly-summary column. Mobile untouched (returned
            // above), YearView untouched. Macro red side-dots preserved.
            const dayNamesFull = isRTL
              ? ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת']
              : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
            const weeklyHeader = isRTL ? 'סיכום שבועי' : 'Weekly Summary';
            // Split the flat 42-day array into weekly rows so we can place the
            // week-summary cell as the 8th column of each row.
            const weeks: (typeof calDays)[] = [];
            for (let r = 0; r < calDays.length; r += 7) weeks.push(calDays.slice(r, r + 7));
            return (
              <GlassCard T={T} style={{ padding: 20 }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr)) 1.1fr',
                  gap: 10, marginBottom: 10,
                }}>
                  {dayNamesFull.map((d, i) => (
                    <div key={i} style={{
                      textAlign: 'center', fontSize: 12,
                      color: T.text.muted, fontWeight: 600, padding: '6px 0',
                      letterSpacing: isRTL ? '0.02em' : '0.05em',
                    }}>{d}</div>
                  ))}
                  <div style={{
                    textAlign: 'center', fontSize: 12,
                    color: T.text.muted, fontWeight: 700, padding: '6px 0',
                    letterSpacing: '0.02em',
                  }}>{weeklyHeader}</div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr)) 1.1fr',
                  gridAutoRows: '112px', gap: 10,
                }}>
                  {weeks.map((row, rowIdx) => (
                    <Fragment key={`wk-${rowIdx}`}>
                      {row.map((d, colIdx) => {
                        const i = rowIdx * 7 + colIdx;
                        const dd = d ? calDayPnl[d] : null;
                        const ddR = dd && dd.rValid > 0;
                        const ddLead = dd ? (isR && ddR ? dd.rTotal : dd.pnl) : 0;
                        const leadPos = ddLead >= 0;
                        const riskColor = d ? getDayRiskColor(trades, d, calMonth, calYear) : 'neutral';
                        const isDarkRed = riskColor === 'darkred';
                        const isToday = isCurrentMonth && d === todayN;
                        const macros = d ? macroByDay.get(d) ?? [] : [];
                        const dayPast = !!d && new Date(calYear, calMonth, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const hasContent = !!dd || macros.length > 0;
                        // Solid tinted fill (no gradient) — matches the flat
                        // reference. Loss cells lean deeper than win cells to
                        // preserve the emotional weight of red days.
                        const bg = isDarkRed
                          ? `${T.accent.red}33`
                          : dd
                            ? (leadPos && ddLead !== 0
                                ? `${T.accent.green}22`
                                : ddLead < 0
                                  ? `${T.accent.red}2e`
                                  : `${T.accent.orange}18`)
                            : 'rgba(255,255,255,0.02)';
                        const borderColor = isToday
                          ? T.accent.cyan
                          : isDarkRed
                            ? `${T.accent.red}66`
                            : dd
                              ? (leadPos && ddLead !== 0
                                  ? `${T.accent.green}3a`
                                  : ddLead < 0
                                    ? `${T.accent.red}55`
                                    : `${T.accent.orange}33`)
                              : T.border.subtle;
                        const moneyStr = dd ? `${dd.pnl >= 0 ? '+' : '-'}$${Math.abs(dd.pnl).toFixed(0)}` : '';
                        const rStr = dd ? (dd.rValid === 0 ? 'N/A' : `${dd.rTotal >= 0 ? '+' : ''}${dd.rTotal.toFixed(1)}R`) : '';
                        const bigStr = isR ? rStr : moneyStr;
                        const bigColor = !dd
                          ? T.text.muted
                          : isR
                            ? (dd.rValid === 0 ? T.text.muted : dd.rTotal >= 0 ? T.accent.green : T.accent.red)
                            : (dd.pnl >= 0 ? T.accent.green : T.accent.red);
                        return (
                          <motion.div key={`d-${i}`}
                            whileHover={hasContent ? { y: -1 } : {}}
                            onClick={() => { if (hasContent && d) setCalModalDay(d); }}
                            style={{
                              position: 'relative',
                              borderRadius: 14,
                              border: `1px solid ${borderColor}`,
                              background: bg,
                              boxShadow: isToday ? `0 0 0 1px ${T.accent.cyan}55` : 'none',
                              padding: '10px 12px',
                              paddingInlineEnd: macros.length ? 18 : 12,
                              cursor: hasContent ? 'pointer' : 'default',
                              display: 'flex', flexDirection: 'column',
                              overflow: 'hidden',
                              transition: 'transform 140ms ease, border-color 140ms ease',
                            }}>
                            {d && (
                              <>
                                {/* Day number — small, top-inline-end corner
                                    (visually top-right in RTL, top-left in LTR
                                    per the reference). */}
                                <div style={{
                                  position: 'absolute',
                                  top: 8,
                                  insetInlineEnd: macros.length ? 16 : 10,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: isToday ? T.accent.cyan : T.text.muted,
                                  fontFamily: "'JetBrains Mono', monospace",
                                  lineHeight: 1,
                                }}>
                                  {d}{isDarkRed && <span style={{ marginInlineStart: 4 }}>⚠️</span>}
                                </div>

                                {dd && (
                                  <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    paddingTop: 6,
                                  }}>
                                    <div style={{
                                      fontSize: 20,
                                      fontWeight: 700,
                                      color: bigColor,
                                      fontFamily: "'JetBrains Mono', monospace",
                                      letterSpacing: '-0.01em',
                                      lineHeight: 1.1,
                                    }}>
                                      {bigStr}
                                    </div>
                                    <div style={{
                                      fontSize: 11,
                                      color: T.text.muted,
                                      fontFamily: "'JetBrains Mono', monospace",
                                    }}>
                                      ({dd.trades})
                                    </div>
                                  </div>
                                )}

                                <MacroSideDots events={macros} isPast={dayPast} />
                              </>
                            )}
                          </motion.div>
                        );
                      })}
                      {/* Weekly summary cell — same visual language as the day
                          cells, integrated as the row's 8th column. */}
                      {(() => {
                        const w = weekStats[rowIdx];
                        if (!w) return <div key={`w-${rowIdx}`} />;
                        const lead = isR && w.rValid > 0 ? w.rTotal : w.pnl;
                        const leadColor = lead > 0 ? T.accent.green : lead < 0 ? T.accent.red : T.text.muted;
                        const leadStr = w.trades === 0
                          ? '$0'
                          : isR
                            ? (w.rValid === 0 ? '—' : `${w.rTotal >= 0 ? '+' : ''}${w.rTotal.toFixed(1)}R`)
                            : `${w.pnl >= 0 ? '+' : '-'}$${Math.abs(w.pnl).toFixed(0)}`;
                        return (
                          <div key={`w-${rowIdx}`} style={{
                            borderRadius: 14,
                            border: `1px solid ${T.border.subtle}`,
                            background: 'rgba(255,255,255,0.02)',
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                          }}>
                            <div style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: leadColor,
                              fontFamily: "'JetBrains Mono', monospace",
                              letterSpacing: '-0.01em',
                              lineHeight: 1.1,
                            }}>
                              {leadStr}
                            </div>
                            <div style={{
                              fontSize: 11,
                              color: T.text.muted,
                            }}>
                              {w.trades} {isRTL ? 'עסקאות' : 'trades'}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  ))}
                </div>
              </GlassCard>
            );
          })()}
        </motion.div>
      </AnimatePresence>

      {calModalDay && (
        <CalendarModal T={T} t={t} isRTL={isRTL} day={calModalDay} month={calMonth} year={calYear} trades={trades} onClose={() => setCalModalDay(null)} onGenerateInsight={onGenerateInsight} onSetManualR={onSetManualR} />
      )}
    </div>
  );
}

/* ── Public export — wraps with provider ─────────────────────── */
const CalendarHubPage_Impl = (props: Props) => (
  <CalendarZoomProvider defaultZoom="month">
    <CalendarInner {...props} />
  </CalendarZoomProvider>
);

export const CalendarHubPage = memo(CalendarHubPage_Impl);
export default CalendarHubPage;
