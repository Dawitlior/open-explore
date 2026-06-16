/**
 * Quality-of-returns metrics — Sharpe, Sortino, Calmar.
 * Pure functions. Caller provides a daily numeric series (R OR $ — both work
 * because Sharpe/Sortino are scale-invariant for the same series).
 *
 * Annualization: ×√252 (US trading days). Risk-free rate assumed 0 (intraday).
 */

const TRADING_DAYS = 252;

function mean(xs: number[]): number {
  if (!xs.length) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let v = 0;
  for (const x of xs) v += (x - m) ** 2;
  return Math.sqrt(v / (xs.length - 1));
}

/** Annualized Sharpe: mean(daily) / stdev(daily) × √252. Returns null if insufficient data. */
export function computeSharpe(dailyReturns: number[]): number | null {
  if (dailyReturns.length < 2) return null;
  const sd = stdev(dailyReturns);
  if (sd === 0) return null;
  return (mean(dailyReturns) / sd) * Math.sqrt(TRADING_DAYS);
}

/** Annualized Sortino: mean(daily) / downside_stdev × √252. */
export function computeSortino(dailyReturns: number[]): number | null {
  if (dailyReturns.length < 2) return null;
  const m = mean(dailyReturns);
  const downside = dailyReturns.filter(r => r < 0);
  if (downside.length === 0) return null; // no downside → undefined Sortino
  let v = 0;
  for (const r of downside) v += r * r;
  const dd = Math.sqrt(v / downside.length);
  if (dd === 0) return null;
  return (m / dd) * Math.sqrt(TRADING_DAYS);
}

/** Annualized return / max drawdown (positive number = good). dailyReturns are simple sums (R or $). */
export function computeCalmar(dailyReturns: number[]): number | null {
  if (dailyReturns.length < 2) return null;
  let cum = 0, peak = 0, maxDD = 0;
  for (const r of dailyReturns) {
    cum += r;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDD) maxDD = dd;
  }
  if (maxDD === 0) return null;
  const annualizedReturn = mean(dailyReturns) * TRADING_DAYS;
  return annualizedReturn / maxDD;
}

/** Group `trades` into a daily series of summed values via `pick`. Empty days are skipped. */
export function dailySeries<T extends { date: string }>(
  trades: ReadonlyArray<T>,
  pick: (t: T) => number,
): number[] {
  const byDay = new Map<string, number>();
  for (const t of trades) {
    const key = (t.date || '').slice(0, 10);
    if (!key) continue;
    const v = pick(t);
    if (!Number.isFinite(v)) continue;
    byDay.set(key, (byDay.get(key) || 0) + v);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export function formatRatio(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return 'N/A';
  return v.toFixed(2);
}
