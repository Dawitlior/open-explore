/**
 * YearView — Apple-style year grid: 12 mini-month calendars (4×3),
 * each one a full mini month with weekday headers + day numbers.
 * Days with trades get a tinted background + small color dot.
 * Today is highlighted with the accent ring. Click a month to zoom in.
 * Desktop: small quarters side panel beside the grid. Mobile: below.
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Trade } from '@/data/trades';
import { useCalendarZoom } from '../CalendarZoomProvider';
import { getCalDays } from '@/lib/trading-analytics';
import { useIsMobile } from '@/hooks/use-mobile';
import { sumR } from '@/lib/r-multiple';
import { useEffectiveDisplayMode } from '@/lib/display-mode';

interface Props {
  T: any;
  isRTL: boolean;
  trades: Trade[];
  year: number;
}

const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const DOW_EN = ['S','M','T','W','T','F','S'];
const DOW_HE = ['א','ב','ג','ד','ה','ו','ש'];

interface DayAgg { pnl: number; rTotal: number; rValid: number; trades: number; rows: Trade[]; }

function buildYearPnl(trades: Trade[], year: number): Record<string, DayAgg> {
  const m: Record<string, DayAgg> = {};
  trades.forEach(tr => {
    if (!tr.date) return;
    const d = new Date(tr.date.replace(' ', 'T'));
    if (isNaN(d.getTime()) || d.getFullYear() !== year) return;
    const key = `${d.getMonth()}-${d.getDate()}`;
    if (!m[key]) m[key] = { pnl: 0, rTotal: 0, rValid: 0, trades: 0, rows: [] };
    m[key].pnl += tr.pnl; m[key].trades++; m[key].rows.push(tr);
  });
  Object.keys(m).forEach(k => {
    const agg = sumR(m[k].rows);
    m[k].rTotal = agg.total; m[k].rValid = agg.validCount;
  });
  return m;
}

function MiniMonth({
  T, isRTL, year, monthIdx, dayPnl, onMonthClick, onDayClick, compact, isR,
}: {
  T: any; isRTL: boolean; year: number; monthIdx: number;
  dayPnl: Record<string, DayAgg>;
  onMonthClick: () => void;
  onDayClick: (d: number) => void;
  compact?: boolean;
  isR: boolean;
}) {
  const monthLabels = isRTL ? MONTHS_HE : MONTHS_EN;
  const dowLabels = isRTL ? DOW_HE : DOW_EN;
  const calDays = getCalDays(year, monthIdx);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIdx;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onMonthClick}
      style={{
        background: T.bg.card,
        border: `1px solid ${isCurrentMonth ? T.accent.cyan : T.border.subtle}`,
        borderRadius: T.radius.md,
        padding: compact ? '6px 6px 8px' : '10px 10px 12px',
        cursor: 'pointer',
        boxShadow: isCurrentMonth ? `0 0 0 1px ${T.accent.cyan}40` : 'none',
        display: 'flex', flexDirection: 'column', gap: compact ? 4 : 6,
        minWidth: 0, overflow: 'hidden',
      }}
    >
      {/* Title */}
      <div style={{
        fontSize: compact ? 11 : 12, fontWeight: 700,
        color: isCurrentMonth ? T.accent.cyan : T.text.primary,
        letterSpacing: '0.04em',
        paddingBottom: 4,
        borderBottom: `1px solid ${T.border.subtle}`,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {monthLabels[monthIdx]}
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {dowLabels.map((d, i) => (
          <div key={i} style={{
            textAlign: 'center', fontSize: compact ? 8 : 9, fontWeight: 600,
            color: T.text.muted, letterSpacing: '0.02em',
          }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {calDays.map((d, i) => {
          if (!d) return <div key={i} style={{ aspectRatio: '1' }} />;
          const agg = dayPnl[`${monthIdx}-${d}`];
          const isToday = isCurrentMonth && today.getDate() === d;
          const hasTrades = !!agg;
          const isPos = agg ? agg.pnl >= 0 : false;
          const dotColor = hasTrades ? (isPos ? T.accent.green : T.accent.red) : 'transparent';
          const color = isToday
            ? '#001023'
            : hasTrades
              ? (isPos ? T.accent.green : T.accent.red)
              : T.text.muted;
          const dotSize = compact ? 3 : 4;
          return (
            <button
              key={i}
              onClick={(e) => { if (hasTrades) { e.stopPropagation(); onDayClick(d); } }}
              title={hasTrades ? `${d}: ${isPos ? '+' : '-'}$${Math.abs(agg!.pnl).toFixed(0)} · ${agg!.trades}` : undefined}
              style={{
                position: 'relative',
                aspectRatio: '1',
                width: '100%', minWidth: 0, height: 'auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: compact ? 9 : 10, fontWeight: isToday || hasTrades ? 700 : 500,
                color,
                background: isToday ? T.accent.cyan : 'transparent',
                border: 'none', borderRadius: '50%',
                cursor: hasTrades ? 'pointer' : 'default',
                padding: 0, lineHeight: 1, overflow: 'hidden',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>{d}</span>
              {hasTrades && !isToday && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    bottom: compact ? 1 : 2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: dotSize, height: dotSize, borderRadius: '50%',
                    background: dotColor,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

export function YearView({ T, isRTL, trades, year }: Props) {
  const { setFocusedDate, setZoomLevel } = useCalendarZoom();
  const isMobile = useIsMobile();
  const dayPnl = useMemo(() => buildYearPnl(trades, year), [trades, year]);

  // Quarter totals
  const quarters = useMemo(() => {
    const q = [0, 0, 0, 0];
    const t = [0, 0, 0, 0];
    Object.entries(dayPnl).forEach(([key, v]) => {
      const m = +key.split('-')[0];
      const qi = Math.floor(m / 3);
      q[qi] += v.pnl;
      t[qi] += v.trades;
    });
    return q.map((pnl, i) => ({ q: i + 1, pnl, trades: t[i] }));
  }, [dayPnl]);

  const yearTotal = quarters.reduce((s, q) => s + q.pnl, 0);
  const yearTrades = quarters.reduce((s, q) => s + q.trades, 0);

  const goMonth = (m: number) => { setFocusedDate(new Date(year, m, 1)); setZoomLevel('month'); };
  // Clicking a specific day: jump into Month view focused on that date (day modal opens from there).
  const goDay = (m: number, d: number) => { setFocusedDate(new Date(year, m, d)); setZoomLevel('month'); };

  const grid = (
    <div style={{
      display: 'grid',
      // Mobile: auto-fit so cells gracefully drop to 1 column when viewport
      // can't fit 2 mini-months side-by-side (no clipping at 390px).
      gridTemplateColumns: isMobile
        ? 'repeat(auto-fit, minmax(160px, 1fr))'
        : 'repeat(4, minmax(0, 1fr))',
      gap: isMobile ? 8 : 12,
      direction: isRTL ? 'rtl' : 'ltr',
      flex: 1, minWidth: 0, width: '100%',
    }}>
      {Array.from({ length: 12 }, (_, m) => (
        <MiniMonth
          key={m} T={T} isRTL={isRTL} year={year} monthIdx={m}
          dayPnl={dayPnl}
          compact={isMobile}
          onMonthClick={() => goMonth(m)}
          onDayClick={(d) => goDay(m, d)}
        />
      ))}
    </div>
  );

  const quartersPanel = (
    <div style={{
      width: isMobile ? '100%' : 200,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      marginTop: isMobile ? 12 : 0,
    }}>
      <div style={{
        fontSize: 10, color: T.text.muted, textTransform: 'uppercase',
        letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2,
      }}>
        {isRTL ? `סיכום ${year}` : `${year} Summary`}
      </div>

      <div style={{
        background: T.bg.card, border: `1px solid ${T.border.subtle}`,
        borderRadius: T.radius.md, padding: '10px 12px',
      }}>
        <div style={{ fontSize: 9, color: T.text.muted }}>{isRTL ? 'סה״כ שנתי' : 'Year Total'}</div>
        <div style={{
          fontSize: 18, fontWeight: 800,
          color: yearTotal >= 0 ? T.accent.green : T.accent.red,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {yearTotal >= 0 ? '+' : '-'}${Math.abs(yearTotal).toFixed(0)}
        </div>
        <div style={{ fontSize: 9, color: T.text.muted, marginTop: 2 }}>
          {yearTrades} {isRTL ? 'עסקאות' : 'trades'}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : '1fr',
        gap: 6,
      }}>
        {quarters.map(q => {
          const pos = q.pnl >= 0;
          return (
            <div key={q.q} style={{
              background: T.bg.card,
              border: `1px solid ${q.trades ? (pos ? `${T.accent.green}40` : `${T.accent.red}40`) : T.border.subtle}`,
              borderRadius: T.radius.sm, padding: '8px 10px',
            }}>
              <div style={{ fontSize: 9, color: T.text.muted, fontWeight: 700 }}>Q{q.q}</div>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: q.trades === 0 ? T.text.muted : pos ? T.accent.green : T.accent.red,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {q.trades === 0 ? '—' : `${pos ? '+' : '-'}$${Math.abs(q.pnl).toFixed(0)}`}
              </div>
              <div style={{ fontSize: 8, color: T.text.muted }}>{q.trades} {isRTL ? 'עס׳' : 'tr'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 0 : 16,
      direction: isRTL ? 'rtl' : 'ltr',
      width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden',
    }}>
      {grid}
      {quartersPanel}
    </div>
  );
}
