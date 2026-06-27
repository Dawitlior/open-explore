/**
 * YearView — 12 mini-month grids in a 4×3 layout, each cell color-coded by daily P&L.
 * Clicking a month zooms to Month, clicking a day zooms to Day.
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Trade } from '@/data/trades';
import { useCalendarZoom } from '../CalendarZoomProvider';
import { getCalDays } from '@/lib/trading-analytics';

interface Props {
  T: any;
  isRTL: boolean;
  trades: Trade[];
  year: number;
}

const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_HE = ['ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ'];

function buildYearPnl(trades: Trade[]): Record<string, number> {
  const m: Record<string, number> = {};
  trades.forEach(tr => {
    if (!tr.date) return;
    const d = new Date(tr.date.replace(' ', 'T'));
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    m[key] = (m[key] ?? 0) + tr.pnl;
  });
  return m;
}

export function YearView({ T, isRTL, trades, year }: Props) {
  const { zoomIn, setFocusedDate, setZoomLevel } = useCalendarZoom();
  const monthLabels = isRTL ? MONTHS_HE : MONTHS_EN;

  const dayPnl = useMemo(() => buildYearPnl(trades), [trades]);

  const maxAbsPnl = useMemo(() => {
    const vals = Object.values(dayPnl).filter(v => v !== 0);
    return vals.length ? Math.max(...vals.map(Math.abs)) : 1;
  }, [dayPnl]);

  const today = new Date();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12,
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {Array.from({ length: 12 }, (_, monthIdx) => {
        const calDays = getCalDays(year, monthIdx);
        const monthDate = new Date(year, monthIdx, 1);
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIdx;

        return (
          <motion.div
            key={monthIdx}
            whileHover={{ scale: 1.02 }}
            onClick={() => {
              setFocusedDate(monthDate);
              setZoomLevel('month');
            }}
            style={{
              background: T.bg.card,
              border: `1px solid ${isCurrentMonth ? T.accent.cyan : T.border.subtle}`,
              borderRadius: T.radius.md,
              padding: '10px 8px',
              cursor: 'pointer',
              boxShadow: isCurrentMonth ? `0 0 0 1px ${T.accent.cyan}40` : 'none',
            }}
          >
            {/* Month label */}
            <div style={{
              fontSize: 11, fontWeight: 700, color: isCurrentMonth ? T.accent.cyan : T.text.secondary,
              textAlign: 'center', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {monthLabels[monthIdx]}
            </div>

            {/* Mini grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1.5 }}>
              {calDays.map((d, i) => {
                if (!d) return <div key={i} />;
                const key = `${year}-${monthIdx}-${d}`;
                const pnl = dayPnl[key];
                const isToday = isCurrentMonth && today.getDate() === d;
                const intensity = pnl !== undefined ? Math.min(0.9, Math.abs(pnl) / maxAbsPnl) : 0;
                const bg = pnl !== undefined
                  ? pnl > 0
                    ? `${T.accent.green}${Math.round(intensity * 220).toString(16).padStart(2, '0')}`
                    : `${T.accent.red}${Math.round(intensity * 220).toString(16).padStart(2, '0')}`
                  : 'transparent';
                return (
                  <motion.div
                    key={i}
                    whileHover={pnl !== undefined ? { scale: 1.3 } : {}}
                    onClick={e => {
                      if (!pnl) return;
                      e.stopPropagation();
                      const dayDate = new Date(year, monthIdx, d);
                      setFocusedDate(dayDate);
                      zoomIn(dayDate);
                    }}
                    title={pnl !== undefined ? `${d}: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)}` : undefined}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: 2,
                      background: isToday ? T.accent.cyan : bg,
                      border: isToday ? 'none' : pnl !== undefined ? `0.5px solid ${pnl >= 0 ? T.accent.green : T.accent.red}30` : 'none',
                      cursor: pnl !== undefined ? 'pointer' : 'default',
                    }}
                  />
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
