/**
 * Crypto.com Exchange v1 spot reconstruction (pure).
 *
 * Maps `private/get-trades` raw rows into spot FIFO trades. Mirrors the
 * edge-function reconstruction in `sync-futures-trades`. Tested by
 * `src/test/crypto-com-reconstruction.test.ts`.
 *
 * Live confirm (§C4): exact field names (`traded_price`/`traded_quantity`/
 * `fees`) and the fee sign convention. We treat `fees` as positive.
 */

import { spotFifo, type ReconTrade, type SpotFill } from './_spot_fifo';

export interface CryptoComTrade {
  trade_id: string | number;
  instrument_name: string;
  side: 'BUY' | 'SELL' | string;
  traded_price: string | number;
  traded_quantity: string | number;
  fees?: string | number;
  create_time: number;
}

function toFill(t: CryptoComTrade): SpotFill {
  return {
    id: t.trade_id,
    symbol: t.instrument_name,
    price: Number(t.traded_price),
    qty: Number(t.traded_quantity),
    commission: Math.abs(Number(t.fees ?? 0)),
    time: Number(t.create_time),
    isBuyer: String(t.side).toUpperCase() === 'BUY',
  };
}

export function cryptoComToTrades(rows: CryptoComTrade[]): ReconTrade[] {
  const bySymbol = new Map<string, CryptoComTrade[]>();
  for (const r of rows) {
    if (!r?.instrument_name) continue;
    if (!bySymbol.has(r.instrument_name)) bySymbol.set(r.instrument_name, []);
    bySymbol.get(r.instrument_name)!.push(r);
  }
  const out: ReconTrade[] = [];
  for (const [symbol, list] of bySymbol) {
    out.push(...spotFifo('crypto_com', symbol, list.map(toFill)));
  }
  return out;
}
