/**
 * Centralized R-Multiple engine.
 *
 * Formula: R = Net PnL / Initial Risk
 *   Initial Risk = |Avg Entry − Stop Loss| × Quantity
 *
 * Fallback chain when stored `returnR` is missing or unreliable
 * (typical for trades auto-synced from exchanges that don't expose SL):
 *   1. Use `returnR` if finite & non-zero.
 *   2. If `risk` ($) > 0  →  R = pnl / risk
 *   3. If `stopLoss`, `entry`, qty all valid & SL ≠ entry  →  R = pnl / (|entry−SL|·qty)
 *   4. If `returnR === 0` AND we have any explicit risk metadata → real break-even (0).
 *   5. Otherwise → null  (UI must render "N/A", never NaN / Infinity).
 *
 * All consumers (Calendar, Journal, Analytics) MUST go through `getR` /
 * `sumR` / `formatR` to stay numerically consistent.
 */

type TradeLike = {
  returnR?: number | null;
  risk?: number | null;
  pnl?: number | null;
  entry?: number | null;
  stopLoss?: number | null;
  positionSize?: number | null; // notional = qty * entry (legacy schema)
};

const toNum = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
};

/** Returns R-multiple or `null` when it cannot be safely derived. */
export function getR(t: TradeLike | null | undefined): number | null {
  if (!t) return null;
  const rr   = toNum(t.returnR);
  const risk = toNum(t.risk);
  const pnl  = toNum(t.pnl);
  const sl   = toNum(t.stopLoss);
  const ent  = toNum(t.entry);
  const pos  = toNum(t.positionSize);

  // 1. Trust an explicit non-zero returnR.
  if (Number.isFinite(rr) && rr !== 0) return rr;

  // 2. Derive from $-risk amount.
  if (Number.isFinite(risk) && risk > 0 && Number.isFinite(pnl)) {
    const r = pnl / risk;
    if (Number.isFinite(r)) return r;
  }

  // 3. Derive from stop distance × qty.
  if (Number.isFinite(ent) && Number.isFinite(sl) && sl > 0 && ent !== sl && Number.isFinite(pnl)) {
    const qty = Number.isFinite(pos) && pos > 0 && ent > 0 ? pos / ent : 0;
    if (qty > 0) {
      const initialRisk = Math.abs(ent - sl) * qty;
      if (initialRisk > 0) {
        const r = pnl / initialRisk;
        if (Number.isFinite(r)) return r;
      }
    }
  }

  // 4. Explicit break-even when risk metadata exists.
  if (rr === 0 && ((Number.isFinite(risk) && risk > 0) || (Number.isFinite(sl) && sl > 0))) return 0;

  // 5. Unknown.
  return null;
}

/** Aggregate R across many trades, ignoring unknowns. */
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

/** Format an R value with sign + fixed decimals. `null`/non-finite → "N/A". */
export function formatR(r: number | null | undefined, decimals = 1): string {
  if (r === null || r === undefined || !Number.isFinite(r)) return 'N/A';
  const sign = r > 0 ? '+' : '';
  return `${sign}${r.toFixed(decimals)}R`;
}

/** Convenience: same as formatR(getR(trade)). */
export function formatTradeR(t: TradeLike | null | undefined, decimals = 1): string {
  return formatR(getR(t), decimals);
}
