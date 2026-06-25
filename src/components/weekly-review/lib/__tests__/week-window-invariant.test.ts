// WE-2 single-source-of-truth: for every startDow, the slice boundary and
// the weekKey derive from the SAME computation. A trade at start-1ms is
// outside the slice AND keyed to the previous week; a trade at end is
// inside the slice AND keyed to this week.

import { describe, it, expect } from 'vitest';
import { aggregateWeek } from '../../hooks/use-week-aggregates';
import { startOfUserWeek, endOfUserWeek, userWeekKey } from '../week-key';
import type { Trade } from '@/data/trades';

function trade(iso: string): Trade {
  return {
    id: iso,
    date: iso,
    symbol: 'X',
    setup: 'S',
    direction: 'Long',
    entry: 1, exit: 1, stop: 1, size: 1,
    pnl: 0, returnR: 0,
    winLoss: 'BreakEven',
    rules: true,
  } as unknown as Trade;
}

function isoLocal(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

describe('week window + weekKey share one source-of-truth boundary', () => {
  // Wednesday 18 June 2025 — sits cleanly inside any user week.
  const anchor = new Date(2025, 5, 18, 12, 0, 0);

  for (let startDow = 0; startDow <= 6; startDow++) {
    it(`startDow=${startDow}: boundary trades land on the correct side`, () => {
      const start = startOfUserWeek(anchor, startDow);
      const end   = endOfUserWeek(anchor, startDow);
      const justBeforeStart = new Date(start.getTime() - 1);
      const atEnd           = new Date(end);

      const trades = [trade(isoLocal(justBeforeStart)), trade(isoLocal(atEnd))];
      const agg = aggregateWeek(trades, anchor, startDow);

      // Slice: only the at-end trade
      expect(agg.trades.map(t => t.id)).toEqual([isoLocal(atEnd)]);

      // WeekKey: derived from same boundary; the just-before trade belongs to prev key
      expect(agg.weekKey).toBe(userWeekKey(anchor, startDow));
      expect(userWeekKey(justBeforeStart, startDow)).not.toBe(agg.weekKey);
      expect(userWeekKey(atEnd, startDow)).toBe(agg.weekKey);
    });
  }
});
