import { useMemo, useState, memo, useRef } from 'react';
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
import { MacroEventStrip, MacroDot } from '@/components/economic/MacroEventStrip';
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
          {zoomLevel === 'month' && (
            <div style={{ display: 'flex', gap: 18 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <GlassCard T={T} style={{ padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
                    {dayNames.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 12, color: T.text.muted, fontWeight: 700, padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d}</div>)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                    {calDays.map((d, i) => {
                      const dd = d ? calDayPnl[d] : null;
                      // Active-mode driven lead value (controls color + dominant figure).
                      const ddR = dd && dd.rValid > 0;
                      const ddLead = dd ? (isR && ddR ? dd.rTotal : dd.pnl) : 0;
                      const leadPos = ddLead >= 0;
                      const intensity = dd ? Math.min(1, Math.abs(isR && ddR ? dd.rTotal : dd.pnl) / (isR && ddR ? 2 : 10)) : 0;
                      const riskColor = d ? getDayRiskColor(trades, d, calMonth, calYear) : 'neutral';
                      const isDarkRed = riskColor === 'darkred';
                      const isToday = isCurrentMonth && d === todayN;
                      const macros = d ? macroByDay.get(d) ?? [] : [];
                      const dayPast = !!d && new Date(calYear, calMonth, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const hasContent = !!dd || macros.length > 0;
                      const tintGreen = `${T.accent.green}${Math.round(15 + intensity * 25).toString(16).padStart(2, '0')}`;
                      const tintRed = `${T.accent.red}${Math.round(12 + intensity * 20).toString(16).padStart(2, '0')}`;
                      const borderGreen = `${T.accent.green}${Math.round(40 + intensity * 60).toString(16)}`;
                      const borderRed = `${T.accent.red}${Math.round(40 + intensity * 60).toString(16)}`;
                      const moneyStr = dd ? `${dd.pnl >= 0 ? '+' : '-'}$${Math.abs(dd.pnl).toFixed(0)}` : '';
                      const rStr = dd ? (dd.rValid === 0 ? 'N/A' : `${dd.rTotal >= 0 ? '+' : ''}${dd.rTotal.toFixed(1)}R`) : '';
                      const bigStr = isR ? rStr : moneyStr;
                      const sideStr = isR ? moneyStr : rStr;
                      const bigColor = isDarkRed
                        ? T.accent.red
                        : !dd
                          ? T.text.muted
                          : isR
                            ? (dd.rValid === 0 ? T.text.muted : dd.rTotal >= 0 ? T.accent.green : T.accent.red)
                            : (dd.pnl >= 0 ? T.accent.green : T.accent.red);
                      const sideColor = isR
                        ? (dd && dd.pnl >= 0 ? T.accent.green : T.accent.red)
                        : (!dd || dd.rValid === 0 ? T.text.muted : dd.rTotal >= 0 ? T.accent.green : T.accent.red);
                      return (
                        <motion.div key={i} whileHover={hasContent ? { scale: 1.03 } : {}}
                          onClick={() => { if (hasContent && d) setCalModalDay(d); }}
                          style={{
                            minHeight: 130, borderRadius: T.radius.md,
                            border: `1px solid ${isToday ? T.accent.cyan : isDarkRed ? `${T.accent.red}60` : dd ? (leadPos && ddLead !== 0 ? borderGreen : ddLead < 0 ? borderRed : `${T.accent.orange}30`) : T.border.subtle}`,
                            background: isDarkRed ? `${T.accent.red}25` : dd ? (leadPos && ddLead !== 0 ? tintGreen : ddLead < 0 ? tintRed : `${T.accent.orange}12`) : 'transparent',
                            padding: '10px 12px', cursor: hasContent ? 'pointer' : 'default', display: 'flex', flexDirection: 'column',
                          }}>
                          {d && (<>
                            <div style={{ fontSize: 15, color: isToday ? T.accent.cyan : T.text.muted, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>{d}</span>{isDarkRed && <span>⚠️</span>}
                            </div>
                            {dd && (<>
                              <div style={{ fontSize: 22, fontWeight: 800, color: bigColor, fontFamily: "'JetBrains Mono', monospace", marginTop: 6 }}>
                                {bigStr}
                              </div>
                              <div style={{ fontSize: 11, color: T.text.muted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{dd.trades} {isRTL ? 'עסקאות' : 'tr'} · {dd.wins}/{dd.trades} W</span>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: sideColor }}>
                                  {sideStr}
                                </span>
                              </div>
                            </>)}
                            <div style={{ marginTop: 'auto', paddingTop: dd ? 6 : 4 }}>
                              <MacroEventStrip events={macros} isPast={dayPast} />
                            </div>
                          </>)}
                        </motion.div>
                      );
                    })}
                  </div>
                </GlassCard>
              </div>

              <div style={{ width: 220, flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 700 }}>
                  {isRTL ? 'סיכום שבועי' : 'Weekly Summary'}
                </div>
                {weekStats.map((w, i) => {
                  const lead = isR && w.rValid > 0 ? w.rTotal : w.pnl;
                  const leadColor = lead > 0 ? T.accent.green : lead < 0 ? T.accent.red : T.text.muted;
                  const leadStr = isR
                    ? (w.rValid === 0 ? '—' : `${w.rTotal >= 0 ? '+' : ''}${w.rTotal.toFixed(1)}R`)
                    : (w.pnl !== 0 ? `${w.pnl >= 0 ? '+' : ''}$${w.pnl.toFixed(2)}` : '$0.00');
                  const sideStr = isR
                    ? (w.pnl !== 0 ? `${w.pnl >= 0 ? '+' : ''}$${w.pnl.toFixed(0)}` : '$0')
                    : (w.rValid === 0 ? '' : `${w.rTotal >= 0 ? '+' : ''}${w.rTotal.toFixed(1)}R`);
                  return (
                    <GlassCard T={T} key={i} style={{ marginBottom: 8, padding: 12 }}>
                      <div style={{ fontSize: 9, color: T.text.muted, marginBottom: 4 }}>{isRTL ? `שבוע ${w.week}` : `Week ${w.week}`}</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: leadColor, fontFamily: "'JetBrains Mono', monospace" }}>
                        {leadStr}
                      </div>
                      <div style={{ fontSize: 9, color: T.text.muted, marginTop: 2, display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                        <span>{w.trades} {isRTL ? 'עסקאות' : 'trades'} · {w.days}d</span>
                        {sideStr && <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sideStr}</span>}
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          )}
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
