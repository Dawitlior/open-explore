/**
 * Coinbase Advanced Trade spot reconstruction (pure).
 *
 * Maps `/api/v3/brokerage/orders/historical/fills` rows into spot FIFO trades.
 * Mirrors the edge-function reconstruction. Tested by
 * `src/test/coinbase-reconstruction.test.ts`.
 *
 * Live confirm (§C3): commission currency (assumed quote/USD), JWT claim
 * shape, PEM key import path. Reconstruction itself is purely arithmetic.
 */

import { spotFifo, type ReconTrade, type SpotFill } from './_spot_fifo';

export interface CoinbaseFill {
  trade_id: string | number;
  product_id: string;
  side: 'BUY' | 'SELL' | string;
  price: string | number;
  size: string | number;
  commission?: string | number;
  trade_time: string;
}

function toFill(f: CoinbaseFill): SpotFill {
  return {
    id: f.trade_id,
    symbol: f.product_id,
    price: Number(f.price),
    qty: Number(f.size),
    commission: Math.abs(Number(f.commission ?? 0)),
    time: new Date(f.trade_time).getTime(),
    isBuyer: String(f.side).toUpperCase() === 'BUY',
  };
}

export function coinbaseToTrades(rows: CoinbaseFill[]): ReconTrade[] {
  const bySymbol = new Map<string, CoinbaseFill[]>();
  for (const r of rows) {
    if (!r?.product_id) continue;
    if (!bySymbol.has(r.product_id)) bySymbol.set(r.product_id, []);
    bySymbol.get(r.product_id)!.push(r);
  }
  const out: ReconTrade[] = [];
  for (const [symbol, list] of bySymbol) {
    out.push(...spotFifo('coinbase', symbol, list.map(toFill)));
  }
  return out;
}
