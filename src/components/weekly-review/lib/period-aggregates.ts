// Period aggregates — slices `trades[]` to the last N months and computes
// everything the Semi-Annual / Annual dashboards need. Pure functions.

import type { Trade } from '@/data/trades';
import { isoWeekKey, monthKeyOf, parseTradeDate, pad2 } from './week-key';
import { getSetupName } from './setup-breakdown';

export interface MonthBucket {
  monthKey: string;
  netR: number;
  netUSD: number;          // ← $ equivalent from t.pnl
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
}
export interface WeekBucket {
  weekKey: string;
  netR: number;
  netUSD: number;          // ← $ equivalent
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}
export interface EquityPoint { i: number; date: string; equityR: number; equityUSD: number; }
export interface RDistBucket { bucket: string; count: number; }
export interface SetupSlice { name: string; netR: number; netUSD: number; count: number; color?: string; }
export interface RadarPoint { axis: string; value: number; }
export interface PeriodAggregates {
  trades: Trade[];
  netR: number;
  netUSD: number;          // ← total $ for the period
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  expectancyR: number;
  expectancyUSD: number;   // ← $/trade
  avgWinR: number;
  avgWinUSD: number;
  avgLossR: number;
  avgLossUSD: number;
  maxDrawdownR: number;
  maxDrawdownUSD: number;
  months: MonthBucket[];
  weeks: WeekBucket[];
  equity: EquityPoint[];
  rDistribution: RDistBucket[];
  setupBreakdown: SetupSlice[];
  bestWeek?: WeekBucket;
  worstWeek?: WeekBucket;
  bestMonth?: MonthBucket;
  worstMonth?: MonthBucket;
  radar: RadarPoint[];
}

function startOfMonth(d: Date, monthsAgo: number) {
  const x = new Date(d.getFullYear(), d.getMonth() - monthsAgo, 1, 0, 0, 0, 0);
  return x;
}

export function slicePeriod(trades: Trade[], months: number, anchor: Date = new Date()): Trade[] {
  const cutoff = startOfMonth(anchor, months - 1);
  const out: Trade[] = [];
  for (const t of trades) {
    const d = parseTradeDate(t.date);
    if (!d) continue;
    if (d >= cutoff) out.push(t);
  }
  return out.sort((a, b) => (parseTradeDate(a.date)?.getTime() || 0) - (parseTradeDate(b.date)?.getTime() || 0));
}

function bucketize(r: number): string {
  if (r <= -3) return '≤-3R';
  if (r <= -2) return '-3..-2R';
  if (r <= -1) return '-2..-1R';
  if (r < 0)   return '-1..0R';
  if (r === 0) return '0R';
  if (r <= 1)  return '0..1R';
  if (r <= 2)  return '1..2R';
  if (r <= 3)  return '2..3R';
  return '≥3R';
}
const R_BUCKET_ORDER = ['≤-3R','-3..-2R','-2..-1R','-1..0R','0R','0..1R','1..2R','2..3R','≥3R'];

export function computeAggregates(trades: Trade[], months: number, anchor: Date = new Date()): PeriodAggregates {
  const sliced = slicePeriod(trades, months, anchor);

  let netR = 0, wins = 0, losses = 0, grossWin = 0, grossLoss = 0;
  let sumWinR = 0, sumLossR = 0;
  const monthMap = new Map<string, MonthBucket>();
  const weekMap = new Map<string, WeekBucket>();
  const equity: EquityPoint[] = [];
  const distMap = new Map<string, number>();
  const setupMap = new Map<string, { netR: number; count: number }>();

  for (let i = 0; i < sliced.length; i++) {
    const t = sliced[i];
    const r = Number(t.returnR) || 0;
    netR += r;
    if (r > 0) { wins += 1; grossWin += r; sumWinR += r; }
    else if (r < 0) { losses += 1; grossLoss += Math.abs(r); sumLossR += r; }

    const d = parseTradeDate(t.date)!;
    const mk = monthKeyOf(d);
    const wk = isoWeekKey(d);

    if (!monthMap.has(mk)) monthMap.set(mk, { monthKey: mk, netR: 0, trades: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0 });
    const mb = monthMap.get(mk)!;
    mb.netR += r; mb.trades += 1;
    if (r > 0) mb.wins += 1; else if (r < 0) mb.losses += 1;

    if (!weekMap.has(wk)) weekMap.set(wk, { weekKey: wk, netR: 0, trades: 0, wins: 0, losses: 0, winRate: 0 });
    const wb = weekMap.get(wk)!;
    wb.netR += r; wb.trades += 1;
    if (r > 0) wb.wins += 1; else if (r < 0) wb.losses += 1;

    equity.push({ i, date: t.date, equityR: netR });
    distMap.set(bucketize(r), (distMap.get(bucketize(r)) || 0) + 1);

    const sn = getSetupName(t);
    if (!setupMap.has(sn)) setupMap.set(sn, { netR: 0, count: 0 });
    const sm = setupMap.get(sn)!;
    sm.netR += r; sm.count += 1;
  }

  // Finalize derived fields
  const months_ = Array.from(monthMap.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map(m => ({
      ...m,
      winRate: m.wins + m.losses ? m.wins / (m.wins + m.losses) : 0,
      profitFactor: 0, // computed per-month below
    }));

  // Recompute monthly PF directly from sliced trades
  const monthsByKey = new Map(months_.map(m => [m.monthKey, m]));
  for (const t of sliced) {
    const r = Number(t.returnR) || 0;
    const mk = monthKeyOf(parseTradeDate(t.date)!);
    const m = monthsByKey.get(mk);
    if (!m) continue;
    (m as any)._gw = ((m as any)._gw || 0) + (r > 0 ? r : 0);
    (m as any)._gl = ((m as any)._gl || 0) + (r < 0 ? Math.abs(r) : 0);
  }
  for (const m of months_) {
    const gw = (m as any)._gw || 0;
    const gl = (m as any)._gl || 0;
    m.profitFactor = gl > 0 ? gw / gl : (gw > 0 ? Infinity : 0);
  }

  const weeks_ = Array.from(weekMap.values())
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
    .map(w => ({ ...w, winRate: w.wins + w.losses ? w.wins / (w.wins + w.losses) : 0 }));

  const rDistribution: RDistBucket[] = R_BUCKET_ORDER.map(b => ({ bucket: b, count: distMap.get(b) || 0 }));

  const setupBreakdown: SetupSlice[] = Array.from(setupMap.entries())
    .map(([name, v]) => ({ name, netR: v.netR, count: v.count }))
    .sort((a, b) => b.netR - a.netR);

  // Drawdown
  let peak = 0, dd = 0;
  for (const p of equity) {
    if (p.equityR > peak) peak = p.equityR;
    const cur = peak - p.equityR;
    if (cur > dd) dd = cur;
  }

  const totalTrades = sliced.length;
  const winRate = wins + losses ? wins / (wins + losses) : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
  const avgWinR = wins ? sumWinR / wins : 0;
  const avgLossR = losses ? sumLossR / losses : 0;
  const expectancyR = totalTrades ? netR / totalTrades : 0;

  const bestWeek = weeks_.length ? weeks_.reduce((a, b) => (b.netR > a.netR ? b : a)) : undefined;
  const worstWeek = weeks_.length ? weeks_.reduce((a, b) => (b.netR < a.netR ? b : a)) : undefined;
  const bestMonth = months_.length ? months_.reduce((a, b) => (b.netR > a.netR ? b : a)) : undefined;
  const worstMonth = months_.length ? months_.reduce((a, b) => (b.netR < a.netR ? b : a)) : undefined;

  // Radar (5 axes, 0..100)
  const radar: RadarPoint[] = [
    { axis: 'Win Rate',     value: Math.min(100, Math.round(winRate * 100)) },
    { axis: 'Profit Factor',value: Math.min(100, Math.round((Number.isFinite(profitFactor) ? profitFactor : 5) * 20)) },
    { axis: 'Expectancy',   value: Math.min(100, Math.max(0, Math.round((expectancyR + 0.5) * 100))) },
    { axis: 'Consistency',  value: months_.length ? Math.round((months_.filter(m => m.netR >= 0).length / months_.length) * 100) : 0 },
    { axis: 'Discipline',   value: totalTrades ? Math.round((sliced.filter(t => t.rules).length / totalTrades) * 100) : 0 },
  ];

  return {
    trades: sliced, netR, totalTrades, wins, losses, winRate, profitFactor,
    expectancyR, avgWinR, avgLossR, maxDrawdownR: dd,
    months: months_, weeks: weeks_, equity, rDistribution, setupBreakdown,
    bestWeek, worstWeek, bestMonth, worstMonth, radar,
  };
}

// Helpful for axis ticks
export function shortMonth(mk: string) {
  const [y, m] = mk.split('-');
  return `${m}/${y.slice(2)}`;
}
export { pad2 };
