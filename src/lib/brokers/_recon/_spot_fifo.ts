/**
 * Spot generalised-FIFO reconstruction (long-only, with §3.1 fee fix).
 *
 * Shared engine for Crypto.com / Coinbase / any other spot exchange that
 * exposes raw user fills with `isBuyer` / price / qty / commission / time.
 * The MEXC spot engine is intentionally NOT folded in here yet — it has a
 * subtle base-vs-quote commission-asset branch we don't want to disturb.
 *
 * external_id is composed as `${provider}:${symbol}:${closingFillId}:${matchIndex}`.
 */

export interface SpotFill {
  id: string | number;
  symbol: string;
  price: number | string;
  qty: number | string;
  /** Commission in the quote currency (assumed). Always treated as positive. */
  commission?: number | string;
  time: number;
  isBuyer: boolean;
}

export interface ReconTrade {
  external_id: string;
  broker_id: string;
  source_type: 'api_sync';
  asset_class: 'crypto';
  symbol: string;
  direction: 'long';
  entry: number;
  exit: number;
  size: number;
  leverage: 1;
  pnl: number;
  fees: number;
  stop_loss: 0;
  opened_at: string;
  closed_at: string;
  data: { exchange_exec_id: string };
}

export function spotFifo(provider: string, symbol: string, fills: SpotFill[]): ReconTrade[] {
  const sorted = [...fills].sort(
    (a, b) => (Number(a.time) - Number(b.time)) || (String(a.id) < String(b.id) ? -1 : 1),
  );
  const buyQueue: { price: number; qty: number; fee: number; time: number }[] = [];
  const out: ReconTrade[] = [];

  for (const f of sorted) {
    const price = Number(f.price) || 0;
    const qty = Math.abs(Number(f.qty) || 0);
    const fee = Math.abs(Number(f.commission || 0));
    if (!qty) continue;

    if (f.isBuyer) {
      buyQueue.push({ price, qty, fee, time: Number(f.time) });
      continue;
    }

    let remaining = qty;
    const sellQty = qty;
    const sellFee = fee;
    let matchIndex = 0;
    while (remaining > 1e-12 && buyQueue.length > 0) {
      const lot = buyQueue[0];
      const matched = Math.min(remaining, lot.qty);
      // §3.1 fee fix: consume the lot's remaining fee proportionally.
      const portion = lot.qty > 0 ? matched / lot.qty : 0;
      const buyFeePortion = lot.fee * portion;
      lot.fee -= buyFeePortion;
      const sellFeePortion = sellQty > 0 ? sellFee * (matched / sellQty) : 0;
      const pnl = (price - lot.price) * matched - buyFeePortion - sellFeePortion;
      const externalId = `${provider}:${symbol}:${f.id}:${matchIndex}`;
      out.push({
        external_id: externalId,
        broker_id: provider,
        source_type: 'api_sync',
        asset_class: 'crypto',
        symbol,
        direction: 'long',
        entry: lot.price,
        exit: price,
        size: matched,
        leverage: 1,
        pnl,
        fees: buyFeePortion + sellFeePortion,
        stop_loss: 0,
        opened_at: new Date(lot.time).toISOString(),
        closed_at: new Date(Number(f.time)).toISOString(),
        data: { exchange_exec_id: String(f.id) },
      });
      lot.qty -= matched;
      remaining -= matched;
      matchIndex++;
      if (lot.qty <= 1e-12) buyQueue.shift();
    }
  }
  return out;
}
