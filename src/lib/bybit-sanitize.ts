/**
 * bybit-sanitize — Strict Money-Mode boundary for all Bybit live data.
 * Strips every risk/R-related field (stopLoss, takeProfit, liqPrice, etc.)
 * BEFORE the payload enters app state. The exported type has no SL field,
 * so R-Multiple math against live data is a compile-time error.
 */

export interface LiveMoneyPosition {
  symbol: string;
  side: 'Buy' | 'Sell' | string;
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  positionIdx?: number;
  updatedAt: number;
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

export function sanitizeLiveBybitData(raw: any): LiveMoneyPosition | null {
  if (!raw || typeof raw !== 'object' || !raw.symbol) return null;
  return {
    symbol: String(raw.symbol),
    side: String(raw.side ?? ''),
    size: num(raw.size),
    entryPrice: num(raw.entryPrice ?? raw.avgPrice),
    markPrice: num(raw.markPrice),
    unrealizedPnl: num(raw.unrealisedPnl ?? raw.unrealizedPnl),
    leverage: num(raw.leverage),
    positionIdx: typeof raw.positionIdx === 'number' ? raw.positionIdx : undefined,
    updatedAt: Date.now(),
  };
}

/** Used by incremental sync to coerce a closed-pnl row into a safe shape. */
export function sanitizeClosedPnlRow(raw: any) {
  if (!raw || !raw.orderId) return null;
  return {
    orderId: String(raw.orderId),
    symbol: String(raw.symbol ?? ''),
    closedPnl: num(raw.closedPnl),
    updatedTime: num(raw.updatedTime),
  };
}
