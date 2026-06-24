import { getEffectiveR } from '@/lib/r-multiple';
import type { Trade } from '@/data/trades';

/* ========================================================================
   ORCA · METRICS CORE — single source of truth.
   Every statistic on trades flows through enrich() + segStats().
   ======================================================================== */

/* ---- ADAPTER · the only place to edit if Trade field names differ. ---- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const f = (t: any, ...keys: string[]) => { for (const k of keys) if (t?.[k] != null) return t[k]; return undefined; };

function tradeDate(t: Trade): Date {
  return new Date(f(t, 'timestamp', 'date', 'openedAt', 'entryTime', 'time', 'createdAt') ?? Date.now());
}
function tradeDir(t: Trade): 'long' | 'short' {
  const d = String(f(t, 'direction', 'side', 'type', 'position') ?? '').toLowerCase();
  return d.includes('short') || d === 's' || d.includes('sell') ? 'short' : 'long';
}
function tradeSetup(t: Trade): string {
  return String(f(t, 'setup', 'strategy', 'pattern', 'playbook') ?? 'unknown');
}
function tradeRisk(t: Trade): number {
  const r = Number(f(t, 'risk', 'riskR', 'riskAmount', 'plannedRisk') ?? 1);
  return isFinite(r) && r > 0 ? r : 1;
}

export type Session = 'asia' | 'london' | 'ny' | 'night';
export type Reliability = 'high' | 'medium' | 'low' | 'insufficient';
export type Verdict = 'strong' | 'weak' | 'gray' | 'insufficient';

export interface EnrichedTrade {
  raw: Trade; r: number; date: Date; dow: number; hour: number;
  session: Session; dir: 'long' | 'short'; setup: string; risk: number; win: boolean;
}

/** ENRICH — R/session/day/dir computed once. Sorted by time (edge engine needs it). */
export function enrich(trades: Trade[]): EnrichedTrade[] {
  return trades
    .map((t): EnrichedTrade => {
      const r = getEffectiveR(t);
      const date = tradeDate(t); const hour = date.getHours();
      const session: Session = hour < 7 ? 'asia' : hour < 13 ? 'london' : hour < 20 ? 'ny' : 'night';
      return { raw: t, r, date, dow: date.getDay(), hour, session, dir: tradeDir(t), setup: tradeSetup(t), risk: tradeRisk(t), win: r > 0 };
    })
    .filter(e => isFinite(e.r) && !isNaN(e.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function reliabilityOf(n: number): Reliability {
  if (n < 6) return 'insufficient';
  if (n < 15) return 'low';
  if (n < 40) return 'medium';
  return 'high';
}

export interface SegmentStats {
  key: string; label: string; n: number;
  winRate: number; expectancy: number; totalR: number;
  std: number; se: number; t: number; ciLow: number; ciHigh: number;
  reliability: Reliability; significant: boolean; verdict: Verdict;
}

/** SEGSTATS — canonical statistics object. t-stat determines significance, not n. */
export function segStats(group: EnrichedTrade[], key: string, label: string): SegmentStats {
  const n = group.length;
  const rs = group.map(g => g.r);
  const totalR = rs.reduce((a, b) => a + b, 0);
  const mean = n ? totalR / n : 0;
  const wins = group.filter(g => g.win).length;
  const winRate = n ? wins / n : 0;
  const variance = n > 1 ? rs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const std = Math.sqrt(variance);
  const se = n ? std / Math.sqrt(n) : Infinity;
  const t = se > 0 && isFinite(se) ? mean / se : 0;
  const ciLow = mean - 1.96 * se, ciHigh = mean + 1.96 * se;

  const MIN_N = 6, T_GRAY = 1.5;
  let significant = false, verdict: Verdict;
  if (n < MIN_N) verdict = 'insufficient';
  else if (Math.abs(t) < T_GRAY) verdict = 'gray';
  else { significant = true; verdict = mean > 0 ? 'strong' : 'weak'; }

  return { key, label, n, winRate, expectancy: mean, totalR, std, se, t, ciLow, ciHigh, reliability: reliabilityOf(n), significant, verdict };
}

export const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
