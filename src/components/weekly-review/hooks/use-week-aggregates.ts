// Derives the "current week" aggregates from the live trades list.
// Pure: takes trades + an anchor date, returns the slice + numbers.
// Dual-unit aware — every R metric has a matching USD metric (from t.pnl).

import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import { fridayOf, isoWeekKey, parseTradeDate, ymd } from '../lib/week-key';

export interface WeekAggregates {
  weekKey: string;
  weekStartISO: string;   // Monday (YYYY-MM-DD)
  weekEndISO: string;     // Friday  (YYYY-MM-DD)
  trades: Trade[];
  // R metrics
  netR: number;
  avgR: number;
  bestR: number;
  worstR: number;
  avgWinR: number;
  avgLossR: number;
  // USD metrics (mirror of R, sourced from t.pnl)
  netUSD: number;
  avgUSD: number;
  bestUSD: number;
  worstUSD: number;
  avgWinUSD: number;
  avgLossUSD: number;
  // counts
  wins: number;
  losses: number;
  breakEvens: number;
  winRate: number;        // 0..1
  rulesCompliance: number;// 0..1
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
  let netR = 0, netUSD = 0;
  let wins = 0, losses = 0, be = 0, ruled = 0;
  let bestR = -Infinity, worstR = Infinity;
  let bestUSD = -Infinity, worstUSD = Infinity;
  let sumWinR = 0, sumLossR = 0, sumWinUSD = 0, sumLossUSD = 0;

  for (const t of inWk) {
    const r = Number(t.returnR) || 0;
    const usd = Number(t.pnl) || 0;
    netR += r; netUSD += usd;
    if (r > bestR) bestR = r;
    if (r < worstR) worstR = r;
    if (usd > bestUSD) bestUSD = usd;
    if (usd < worstUSD) worstUSD = usd;
    if (t.winLoss === 'Win')      { wins += 1; sumWinR += r; sumWinUSD += usd; }
    else if (t.winLoss === 'Loss') { losses += 1; sumLossR += r; sumLossUSD += usd; }
    else be += 1;
    if (t.rules) ruled += 1;
  }
  const n = inWk.length;
  return {
    weekKey: isoWeekKey(end),
    weekStartISO: ymd(start),
    weekEndISO: ymd(end),
    trades: inWk,
    netR, netUSD,
    wins, losses, breakEvens: be,
    winRate: n ? wins / Math.max(1, wins + losses) : 0,
    rulesCompliance: n ? ruled / n : 1,
    avgR:   n ? netR   / n : 0,
    avgUSD: n ? netUSD / n : 0,
    bestR:  n ? bestR  : 0,
    worstR: n ? worstR : 0,
    bestUSD:  n ? bestUSD  : 0,
    worstUSD: n ? worstUSD : 0,
    avgWinR:   wins   ? sumWinR  / wins   : 0,
    avgLossR:  losses ? sumLossR / losses : 0,
    avgWinUSD: wins   ? sumWinUSD  / wins   : 0,
    avgLossUSD:losses ? sumLossUSD / losses : 0,
  };
}

export function useWeekAggregates(trades: Trade[], anchor?: Date) {
  return useMemo(() => aggregateWeek(trades, anchor), [trades, anchor]);
}
