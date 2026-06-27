/**
 * WeekStripView — 7-column week strip with P&L per day.
 * Clicking a day zooms into Day level.
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Trade } from '@/data/trades';
import { useCalendarZoom } from '../CalendarZoomProvider';

interface Props {
  T: any;
  isRTL: boolean;
  trades: Trade[];
  /** ISO week start date (Monday or Sunday based on locale) */
  weekStart: Date;
}

const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function WeekStripView({ T, isRTL, trades, weekStart }: Props) {
  const { zoomIn, setFocusedDate } = useCalendarZoom();

  // Build array of 7 days starting from weekStart
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Aggregate P&L per day
  const dayPnl = useMemo(() => {
    const m: Record<string, { pnl: number; trades: number; wins: number }> = {};
    trades.forEach(tr => {
      if (!tr.date) return;
      const d = new Date(tr.date.replace(' ', 'T'));
      if (isNaN(d.getTime())) return;
      const key = isoDate(d);
      if (!m[key]) m[key] = { pnl: 0, trades: 0, wins: 0 };
      m[key].pnl += tr.pnl;
      m[key].trades++;
      if (tr.winLoss === 'Win') m[key].wins++;
    });
    return m;
  }, [trades]);

  const maxAbsPnl = useMemo(() => {
    return Math.max(1, ...Object.values(dayPnl).map(d => Math.abs(d.pnl)));
  }, [dayPnl]);

  const dayNames = isRTL ? DAY_NAMES_HE : DAY_NAMES_EN;
  const today = isoDate(new Date());

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 8,
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      {days.map((day, i) => {
        const key = isoDate(day);
        const dd = dayPnl[key];
        const isToday = key === today;
        const isPos = dd ? dd.pnl >= 0 : null;
        const intensity = dd ? Math.min(0.85, Math.abs(dd.pnl) / maxAbsPnl) : 0;
        const bgColor = dd
          ? isPos
            ? `${T.accent.green}${Math.round(intensity * 220).toString(16).padStart(2, '0')}`
            : `${T.accent.red}${Math.round(intensity * 220).toString(16).padStart(2, '0')}`
          : 'transparent';
        const textColor = dd ? (isPos ? T.accent.green : T.accent.red) : T.text.muted;
        const weekday = dayNames[day.getDay()];
        const dateNum = day.getDate();
        const monthName = day.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short' });

        return (
          <motion.div
            key={key}
            whileHover={{ scale: dd ? 1.04 : 1 }}
            onClick={() => {
              if (!dd) return;
              setFocusedDate(day);
              zoomIn(day);
            }}
            style={{
              borderRadius: T.radius.md,
              border: `1px solid ${isToday ? T.accent.cyan : dd ? (isPos ? `${T.accent.green}50` : `${T.accent.red}50`) : T.border.subtle}`,
              background: bgColor,
              padding: '14px 10px',
              minHeight: 120,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: dd ? 'pointer' : 'default',
              boxShadow: isToday ? `0 0 0 2px ${T.accent.cyan}60` : 'none',
              transition: 'background 0.2s',
            }}
          >
            <div style={{ fontSize: 10, color: T.text.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {weekday}
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: isToday ? T.accent.cyan : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700,
              color: isToday ? '#001023' : T.text.primary,
            }}>
              {dateNum}
            </div>
            <div style={{ fontSize: 9, color: T.text.muted }}>{monthName}</div>
            {dd && (
              <>
                <div style={{
                  fontSize: 17, fontWeight: 800, color: textColor,
                  fontFamily: "'JetBrains Mono', monospace", marginTop: 6,
                }}>
                  {isPos ? '+' : '-'}${Math.abs(dd.pnl).toFixed(0)}
                </div>
                <div style={{ fontSize: 10, color: T.text.muted }}>
                  {dd.trades} {isRTL ? 'עסקאות' : 'tr'} · {dd.wins}W
                </div>
              </>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
