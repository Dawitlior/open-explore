// Derives the "current week" aggregates from the live trades list.
// Pure: takes trades + an anchor date, returns the slice + numbers.

import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import { fridayOf, isoWeekKey, parseTradeDate, ymd } from '../lib/week-key';

export interface WeekAggregates {
  weekKey: string;
  weekStartISO: string;   // Monday (YYYY-MM-DD)
  weekEndISO: string;     // Friday  (YYYY-MM-DD)
  trades: Trade[];
  netR: number;
  wins: number;
  losses: number;
  breakEvens: number;
  winRate: number;        // 0..1
  rulesCompliance: number;// 0..1
  avgR: number;
  bestR: number;
  worstR: number;
}

function mondayOf(d: Date): Date {
  const out = new Date(d);
  const dow = out.getDay() || 7; // Sun=7
  out.setDate(out.getDate() - (dow - 1));
  out.setHours(0, 0, 0, 0);
  return out;
}

export function aggregateWeek(trades: Trade[], anchor: Date = new Date()): WeekAggregates {
  const start = mondayOf(anchor);
  const end   = fridayOf(anchor);
  const inWk: Trade[] = [];
  for (const t of trades) {
    const d = parseTradeDate(t.date);
    if (!d) continue;
    if (d >= start && d <= end) inWk.push(t);
  }
  let netR = 0, wins = 0, losses = 0, be = 0, ruled = 0;
  let best = -Infinity, worst = Infinity;
  for (const t of inWk) {
    const r = Number(t.returnR) || 0;
    netR += r;
    if (r > best) best = r;
    if (r < worst) worst = r;
    if (t.winLoss === 'Win') wins += 1;
    else if (t.winLoss === 'Loss') losses += 1;
    else be += 1;
    if (t.rules) ruled += 1;
  }
  const n = inWk.length;
  return {
    weekKey: isoWeekKey(end),
    weekStartISO: ymd(start),
    weekEndISO: ymd(end),
    trades: inWk,
    netR,
    wins,
    losses,
    breakEvens: be,
    winRate: n ? wins / Math.max(1, wins + losses) : 0,
    rulesCompliance: n ? ruled / n : 1,
    avgR: n ? netR / n : 0,
    bestR: n ? best : 0,
    worstR: n ? worst : 0,
  };
}

export function useWeekAggregates(trades: Trade[], anchor?: Date) {
  return useMemo(() => aggregateWeek(trades, anchor), [trades, anchor]);
}
