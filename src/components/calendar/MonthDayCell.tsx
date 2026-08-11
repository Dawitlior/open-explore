/**
 * Memoized month-grid day cell.
 *
 * The month grid re-renders on every parent state change (zoom, filters,
 * modal open/close). Extracting the cell into a `memo` component means React
 * only re-runs the ~40 lines of style math for cells whose data actually
 * changed, instead of all 42 cells on every render.
 */
import { memo } from 'react';
import { motion } from 'framer-motion';
import type { TradingTheme } from '@/lib/trading-theme';
import { MacroSideDots } from '@/components/economic/MacroEventStrip';
import { SessionMarker, type SessionFilter } from '@/components/calendar/SessionUI';
import type { DaySessionStat } from '@/lib/market-sessions';
import { infoColor, neutralRamp } from '@/lib/semantic-color';

export interface DayPnlStat {
  pnl: number;
  rTotal: number;
  rValid: number;
  trades: number;
}

interface Props {
  T: TradingTheme;
  day: number | null;
  stat: DayPnlStat | null;
  isR: boolean;
  isToday: boolean;
  isDarkRed: boolean;
  dayPast: boolean;
  /** Macro events for this day (stable reference from the parent's map). */
  macros: unknown[];
  sessionStat?: DaySessionStat;
  sessionFilter: SessionFilter;
  onSelect: (day: number) => void;
}

export const MonthDayCell = memo(function MonthDayCell({
  T, day, stat: dd, isR, isToday, isDarkRed, dayPast, macros, sessionStat, sessionFilter, onSelect,
}: Props) {
  const ddR = dd && dd.rValid > 0;
  const ddLead = dd ? (isR && ddR ? dd.rTotal : dd.pnl) : 0;
  const leadPos = ddLead >= 0;
  const hasContent = !!dd || macros.length > 0;

  const bg = isDarkRed
    ? `${T.accent.red}33`
    : dd
      ? (leadPos && ddLead !== 0
          ? `${T.accent.green}22`
          : ddLead < 0
            ? `${T.accent.red}2e`
            : `${T.state.warn}18`)
      : 'rgba(255,255,255,0.02)';
  const borderColor = isToday
    ? infoColor(T)
    : isDarkRed
      ? `${T.accent.red}66`
      : dd
        ? (leadPos && ddLead !== 0
            ? `${T.accent.green}3a`
            : ddLead < 0
              ? `${T.accent.red}55`
              : `${T.state.warn}33`)
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
    <motion.div
      whileHover={hasContent ? { y: -1 } : {}}
      onClick={() => { if (hasContent && day) onSelect(day); }}
      style={{
        position: 'relative',
        borderRadius: 14,
        border: `1px solid ${borderColor}`,
        background: bg,
        boxShadow: isToday ? `0 0 0 1px ${infoColor(T)}55` : 'none',
        padding: '10px 12px',
        paddingInlineEnd: macros.length ? 18 : 12,
        cursor: hasContent ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        contentVisibility: 'auto',
        containIntrinsicSize: '112px',
        transition: 'transform 140ms ease, border-color 140ms ease',
      }}>
      {day && (
        <>
          <div style={{
            position: 'absolute',
            top: 8,
            insetInlineEnd: macros.length ? 16 : 10,
            fontSize: 12,
            fontWeight: 600,
            color: isToday ? infoColor(T) : T.text.muted,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1,
          }}>
            {day}{isDarkRed && <span style={{ marginInlineStart: 4 }}>⚠️</span>}
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
              <SessionMarker stat={sessionStat} filter={sessionFilter} size={3} />
            </div>
          )}

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <MacroSideDots events={macros as any} isPast={dayPast} />
        </>
      )}
    </motion.div>
  );
});

export default MonthDayCell;
