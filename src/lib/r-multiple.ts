/**
 * Centralized R-Multiple engine (v2).
 *
 * Priority hierarchy:
 *   Tier 1 — Explicit manual override:
 *            trade.manual_r_multiple (DB column, also mirrored as
 *            trade.manualR in some client mappings) wins instantly.
 *   Tier 2 — Mathematical calculation from stored risk data:
 *            R = Net_PnL / (|Entry − StopLoss| × Qty)
 *            or pnl / risk$ when that's available.
 *   Tier 3 — Daily Proxy fallback (aggregate level only):
 *            For a day where no trade carries usable per-trade risk
 *            metadata, Daily_R = sum(pnl) / user.daily_risk_limit.
 *            This is exposed via `sumDailyR` for charts/calendar
 *            aggregations — single-trade `getR` still returns null
 *            so the journal can render "N/A" at row level.
 *
 * All consumers must funnel through getR / sumR / sumDailyR / formatR.
 */

import { getDailyRiskLimit } from '@/hooks/use-user-preferences';

type TradeLike = {
  // Tier 1
  manual_r_multiple?: number | null;
  manualR?: number | null;
  // Tier 2 inputs
  returnR?: number | null;
  risk?: number | null;
  pnl?: number | null;
  entry?: number | null;
  stopLoss?: number | null;
  sl?: number | null;
  qty?: number | null;
  positionSize?: number | null; // legacy: notional = qty * entry
};

const toNum = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
};

/** Per-trade R. Returns null when neither manual nor math input is usable. */
export function getR(t: TradeLike | null | undefined): number | null {
  if (!t) return null;

  // Tier 1 — Manual override.
  const manual = toNum(t.manual_r_multiple ?? t.manualR);
  if (Number.isFinite(manual)) return manual;

  // Tier 2 — Math.
  const rr   = toNum(t.returnR);
  const risk = toNum(t.risk);
  const pnl  = toNum(t.pnl);
  const sl   = toNum(t.stopLoss ?? t.sl);
  const ent  = toNum(t.entry);
  const pos  = toNum(t.positionSize);
  const qtyExp = toNum(t.qty);

  // 2a — trusted explicit returnR (non-zero).
  if (Number.isFinite(rr) && rr !== 0) return rr;

  // 2b — pnl / $ risk
  if (Number.isFinite(risk) && risk > 0 && Number.isFinite(pnl)) {
    const r = pnl / risk;
    if (Number.isFinite(r)) return r;
  }

  // 2c — pnl / (|entry-sl| * qty)
  if (Number.isFinite(ent) && Number.isFinite(sl) && sl > 0 && ent !== sl && Number.isFinite(pnl)) {
    let qty = Number.isFinite(qtyExp) && qtyExp > 0 ? qtyExp : 0;
    if (!qty && Number.isFinite(pos) && pos > 0 && ent > 0) qty = pos / ent;
    if (qty > 0) {
      const initialRisk = Math.abs(ent - sl) * qty;
      if (initialRisk > 0) {
        const r = pnl / initialRisk;
        if (Number.isFinite(r)) return r;
      }
    }
  }

  // Explicit recorded break-even with any risk metadata present.
  if (rr === 0 && ((Number.isFinite(risk) && risk > 0) || (Number.isFinite(sl) && sl > 0))) return 0;

  // Unknown → caller decides (UI shows N/A, aggregations fall back to proxy).
  return null;
}

/** Aggregate per-trade R only (ignores Tier-3 proxy). */
export function sumR(trades: ReadonlyArray<TradeLike>): {
  total: number;
  validCount: number;
  missingCount: number;
} {
  let total = 0, valid = 0, missing = 0;
  for (const t of trades) {
    const r = getR(t);
    if (r === null) missing++;
    else { total += r; valid++; }
  }
  return { total, validCount: valid, missingCount: missing };
}

/**
 * Day-level R for chart / calendar aggregations.
 * If every trade in the day has a usable per-trade R → use the sum.
 * Otherwise apply Tier 3 proxy: Daily_PnL / dailyRiskLimit.
 */
export function sumDailyR(
  trades: ReadonlyArray<TradeLike>,
  dailyRiskLimit?: number,
): { total: number; usedProxy: boolean } {
  if (!trades || trades.length === 0) return { total: 0, usedProxy: false };
  const { total, validCount, missingCount } = sumR(trades);
  if (missingCount === 0) return { total, usedProxy: false };
  // Some/all trades lack risk metadata — fall back to daily proxy.
  const limit = (Number.isFinite(dailyRiskLimit) && (dailyRiskLimit as number) > 0)
    ? (dailyRiskLimit as number)
    : getDailyRiskLimit();
  const pnl = trades.reduce((s, t) => s + (toNum(t.pnl) || 0), 0);
  const proxy = pnl / limit;
  // Mix: take valid trades at face value, model missing ones via their pnl share.
  if (validCount > 0) {
    const missingPnl = trades
      .filter(t => getR(t) === null)
      .reduce((s, t) => s + (toNum(t.pnl) || 0), 0);
    return { total: total + missingPnl / limit, usedProxy: true };
  }
  return { total: proxy, usedProxy: true };
}

/** Format an R value with sign + fixed decimals. */
export function formatR(r: number | null | undefined, decimals = 1): string {
  if (r === null || r === undefined || !Number.isFinite(r)) return 'N/A';
  const sign = r > 0 ? '+' : '';
  return `${sign}${r.toFixed(decimals)}R`;
}

export function formatTradeR(t: TradeLike | null | undefined, decimals = 1): string {
  return formatR(getR(t), decimals);
}
