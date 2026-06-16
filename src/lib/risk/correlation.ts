/**
 * Per-symbol daily-returns correlation matrix (Pearson).
 * Used by the Risk page's exposure heatmap.
 */

import type { Trade } from '@/data/trades';
import { getEffectiveR } from '@/lib/r-multiple';

type Matrix = { symbols: string[]; values: number[][] };

function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n, my = sy / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

/**
 * Build a square correlation matrix across the top N symbols by trade count.
 * Uses daily R-sums (or P&L if mode is 'money') per symbol as the series.
 */
export function buildCorrelationMatrix(
  trades: Trade[],
  opts: { mode: 'r' | 'money'; maxSymbols?: number; minTradesPerSymbol?: number } = { mode: 'r' },
): Matrix {
  const maxSymbols = opts.maxSymbols ?? 8;
  const minTrades = opts.minTradesPerSymbol ?? 3;

  // group trades by coin
  const bySymbol = new Map<string, Trade[]>();
  for (const t of trades) {
    if (!t.coin) continue;
    const arr = bySymbol.get(t.coin) || [];
    arr.push(t);
    bySymbol.set(t.coin, arr);
  }

  const symbols = Array.from(bySymbol.entries())
    .filter(([, ts]) => ts.length >= minTrades)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, maxSymbols)
    .map(([s]) => s);

  if (symbols.length < 2) return { symbols, values: [] };

  // collect all days
  const allDays = new Set<string>();
  for (const t of trades) {
    const d = (t.date || '').slice(0, 10);
    if (d) allDays.add(d);
  }
  const days = Array.from(allDays).sort();

  // per-symbol daily series aligned to `days`
  const series: Record<string, number[]> = {};
  for (const sym of symbols) {
    const byDay = new Map<string, number>();
    for (const t of bySymbol.get(sym)!) {
      const d = (t.date || '').slice(0, 10);
      if (!d) continue;
      const v = opts.mode === 'r' ? getEffectiveR(t) : (t.pnl || 0);
      byDay.set(d, (byDay.get(d) || 0) + (Number.isFinite(v) ? v : 0));
    }
    series[sym] = days.map(d => byDay.get(d) || 0);
  }

  const values: number[][] = symbols.map((a, i) =>
    symbols.map((b, j) => (i === j ? 1 : pearson(series[a], series[b]))),
  );
  return { symbols, values };
}

/**
 * Cheap "effective independent bets" estimate from the correlation matrix.
 * N_eff = (Σ wᵢ)² / Σᵢ Σⱼ wᵢ wⱼ ρᵢⱼ  with equal weights = N² / Σ Σ ρ
 */
export function effectiveIndependentBets(m: Matrix): number {
  const n = m.symbols.length;
  if (n === 0 || !m.values.length) return 0;
  let s = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) s += Math.abs(m.values[i][j]);
  if (s === 0) return n;
  return Math.max(1, Math.min(n, (n * n) / s));
}
