// Derives the "current week" aggregates from the live trades list.
// Pure: takes trades + an anchor date, returns the slice + numbers.
// Dual-unit aware — every R metric has a matching USD metric (from t.pnl).
//
// WE-2: slice window AND weekKey derive from the same `startDow` boundary.
// Default startDow=1 (Monday) produces userWeekKey identical to isoWeekKey
// for every date (proven by weekkey-default-equivalence.test.ts), so the
// historical archive (keyed by isoWeekKey) lines up byte-exact under default.

import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import {
  parseTradeDate, ymd,
  startOfUserWeek, endOfUserWeek, userWeekKey,
} from '../lib/week-key';

export interface WeekAggregates {
  weekKey: string;
  weekStartISO: string;   // first day of the user's week (YYYY-MM-DD)
  weekEndISO: string;     // last  day of the user's week (YYYY-MM-DD)
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

export function aggregateWeek(
  trades: Trade[],
  anchor: Date = new Date(),
  startDow = 1,
): WeekAggregates {
  const start = startOfUserWeek(anchor, startDow);
  const end   = endOfUserWeek(anchor, startDow);
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
    weekKey: userWeekKey(anchor, startDow),
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

export function useWeekAggregates(trades: Trade[], anchor?: Date, startDow = 1) {
  return useMemo(() => aggregateWeek(trades, anchor, startDow), [trades, anchor, startDow]);
}
