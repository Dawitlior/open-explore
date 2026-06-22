/**
 * Kraken Futures reconstruction — pure, broker-agnostic.
 *
 * Canonical algorithm for `/api/v3/fills`. The edge function
 * `sync-futures-trades` mirrors this verbatim. Tested by
 * `src/test/kraken-reconstruction.test.ts`.
 *
 * Generalised FIFO with long+short support. Per-symbol signed inventory:
 *  - a BUY closes shortQueue first, otherwise opens longQueue;
 *  - a SELL closes longQueue first, otherwise opens shortQueue;
 *  - each closed lot emits one trade;
 *  - fees consumed proportionally (§3.1).
 *
 * Notes for the live confirm pass (§C2):
 *  - `/api/v3/fills` does NOT carry fees — Kraken bills via account-log.
 *    This algorithm honestly emits `fees:0` from fills; enrich later.
 *  - Linear contracts only (PF_…) use `(exit-entry)*size`. Inverse contracts
 *    (PI_…, coin-margined) need `(1/entry - 1/exit)*size` and are out of
 *    scope until we either branch on contract type or restrict to PF_.
 */

export interface KrakenFill {
  fill_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  size: number | string;
  price: number | string;
  fillTime: string;
  fillType?: string;
  fee?: number | string;
}

export interface ReconTrade {
  external_id: string;
  broker_id: 'kraken_futures';
  source_type: 'api_sync';
  asset_class: 'crypto';
  symbol: string;
  direction: 'long' | 'short';
  entry: number;
  exit: number;
  size: number;
  leverage: number;
  pnl: number;
  fees: number;
  stop_loss: 0;
  opened_at: string;
  closed_at: string;
  data: { exchange_exec_id: string };
}

export function krakenFillsToTrades(fills: KrakenFill[]): ReconTrade[] {
  const out: ReconTrade[] = [];
  const bySymbol = new Map<string, KrakenFill[]>();
  for (const f of fills) {
    if (!f?.symbol) continue;
    if (!bySymbol.has(f.symbol)) bySymbol.set(f.symbol, []);
    bySymbol.get(f.symbol)!.push(f);
  }
  for (const [symbol, list] of bySymbol) {
    const sorted = [...list].sort((a, b) => Date.parse(a.fillTime) - Date.parse(b.fillTime));
    const longQ: { price: number; qty: number; fee: number; time: number }[] = [];
    const shortQ: { price: number; qty: number; fee: number; time: number }[] = [];

    for (const f of sorted) {
      const price = Number(f.price) || 0;
      const qty = Math.abs(Number(f.size) || 0);
      const fee = Number(f.fee || 0);
      const tMs = Date.parse(f.fillTime);
      if (!qty) continue;

      const isBuy = f.side === 'buy';
      const closingQueue = isBuy ? shortQ : longQ;
      const openingQueue = isBuy ? longQ : shortQ;
      const openedDirection: 'long' | 'short' = isBuy ? 'short' : 'long';

      let remaining = qty;
      let remainingFee = fee;
      let matchIndex = 0;

      while (remaining > 1e-12 && closingQueue.length > 0) {
        const lot = closingQueue[0];
        const matched = Math.min(remaining, lot.qty);
        const portion = lot.qty > 0 ? matched / lot.qty : 0;
        const lotFeePortion = lot.fee * portion;
        lot.fee -= lotFeePortion;
        const fillFeePortion = qty > 0 ? remainingFee * (matched / qty) : 0;
        remainingFee -= fillFeePortion;

        const entry = lot.price;
        const exit = price;
        const pnl = openedDirection === 'long'
          ? (exit - entry) * matched - lotFeePortion - fillFeePortion
          : (entry - exit) * matched - lotFeePortion - fillFeePortion;
        const externalId = `kraken_futures:${symbol}:${f.fill_id}:${matchIndex}`;
        out.push({
          external_id: externalId,
          broker_id: 'kraken_futures',
          source_type: 'api_sync',
          asset_class: 'crypto',
          symbol,
          direction: openedDirection,
          entry,
          exit,
          size: matched,
          leverage: 0,
          pnl,
          fees: lotFeePortion + fillFeePortion,
          stop_loss: 0,
          opened_at: new Date(lot.time).toISOString(),
          closed_at: new Date(tMs).toISOString(),
          data: { exchange_exec_id: String(f.fill_id) },
        });
        lot.qty -= matched;
        remaining -= matched;
        matchIndex++;
        if (lot.qty <= 1e-12) closingQueue.shift();
      }
      if (remaining > 1e-12) {
        openingQueue.push({ price, qty: remaining, fee: remainingFee, time: tMs });
      }
    }
  }
  return out;
}
