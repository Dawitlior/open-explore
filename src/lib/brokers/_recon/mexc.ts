/**
 * MEXC reconstruction — pure, broker-agnostic transforms.
 *
 * Single source of truth for the algorithms used by `sync-futures-trades`
 * (Deno edge function). The edge function mirrors these algorithms (Deno
 * can't import from the browser bundle); the canonical algorithm lives here
 * and is validated by `src/test/mexc-reconstruction.test.ts` using the
 * deterministic fixtures from the ORCA MEXC Validation Fixtures doc.
 *
 * If you change either file you MUST change the other to match — the test
 * here guards the algorithm's correctness, the edge function runs it live.
 */

export interface MexcFuturesOrder {
  orderId: string | number;
  symbol: string;
  positionId: number;
  side: number; // 1=open long, 2=close short, 3=open short, 4=close long
  dealAvgPrice: string | number;
  dealVol: string | number;
  profit?: string | number;
  takerFee?: string | number;
  makerFee?: string | number;
  leverage?: string | number;
  createTime: number;
  updateTime?: number;
}

export interface MexcSpotFill {
  id: string | number;
  symbol: string;
  price: string | number;
  qty: string | number;
  commission?: string | number;
  commissionAsset?: string;
  time: number;
  isBuyer: boolean;
}

export interface ReconTrade {
  external_id: string;
  broker_id: 'mexc_futures' | 'mexc_spot';
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

function weightedAvg(rows: MexcFuturesOrder[]): number {
  const totalVol = rows.reduce((s, r) => s + Number(r.dealVol || 0), 0);
  if (totalVol === 0) return 0;
  return rows.reduce((s, r) => s + Number(r.dealAvgPrice || 0) * Number(r.dealVol || 0), 0) / totalVol;
}

export function mexcFuturesToTrades(orders: MexcFuturesOrder[]): ReconTrade[] {
  const byPos = new Map<number, MexcFuturesOrder[]>();
  for (const o of orders) {
    if (o.positionId == null) continue;
    if (!byPos.has(o.positionId)) byPos.set(o.positionId, []);
    byPos.get(o.positionId)!.push(o);
  }
  const out: ReconTrade[] = [];
  for (const [positionId, group] of byPos) {
    const opens = group.filter((o) => o.side === 1 || o.side === 3);
    const closes = group.filter((o) => o.side === 2 || o.side === 4);
    if (opens.length === 0 || closes.length === 0) continue;

    const direction: 'long' | 'short' = opens[0].side === 1 ? 'long' : 'short';
    const symbol = group[0].symbol;
    const entry = weightedAvg(opens);
    const exit = weightedAvg(closes);
    const size = closes.reduce((s, o) => s + Number(o.dealVol || 0), 0);
    const pnl = closes.reduce((s, o) => s + Number(o.profit || 0), 0);
    const fees = group.reduce((s, o) => s + Number(o.takerFee || 0) + Number(o.makerFee || 0), 0);
    const lev = Number(opens[0].leverage) || 1;
    const openMs = Math.min(...opens.map((o) => Number(o.createTime) || 0));
    const closeMs = Math.max(...closes.map((o) => Number(o.updateTime) || Number(o.createTime) || openMs));
    const orderIds = group
      .slice()
      .sort((a, b) => Number(a.createTime) - Number(b.createTime))
      .map((o) => String(o.orderId))
      .join(',');
    out.push({
      external_id: `mexc:${symbol}:pos${positionId}`,
      broker_id: 'mexc_futures',
      source_type: 'api_sync',
      asset_class: 'crypto',
      symbol,
      direction,
      entry,
      exit,
      size,
      leverage: lev,
      pnl,
      fees,
      stop_loss: 0,
      opened_at: new Date(openMs).toISOString(),
      closed_at: new Date(closeMs).toISOString(),
      data: { exchange_exec_id: orderIds },
    });
  }
  return out;
}

/**
 * FIFO match buys → sells for one spot symbol. Applies the §3.1
 * proportional-fee correction: as a buy lot is consumed across multiple
 * sells, its remaining fee is decremented alongside its qty so the fee
 * cannot be charged twice.
 */
export function mexcSpotToTrades(symbol: string, fills: MexcSpotFill[]): ReconTrade[] {
  const sorted = [...fills].sort(
    (a, b) => (Number(a.time) - Number(b.time)) || (Number(a.id) - Number(b.id)),
  );
  const buyQueue: { price: number; qty: number; fee: number; time: number }[] = [];
  const out: ReconTrade[] = [];

  for (const f of sorted) {
    const price = Number(f.price) || 0;
    const qty = Number(f.qty) || 0;
    // §3.2: when commissionAsset is the base asset, convert to quote at fill price.
    // When it's the quote asset (or absent), use commission as-is.
    const rawFee = Number(f.commission || 0);
    const base = symbol.replace(/USDT$|USDC$|BTC$|ETH$/i, '');
    const isBaseFee = f.commissionAsset && base && f.commissionAsset.toUpperCase() === base.toUpperCase();
    const fee = isBaseFee ? rawFee * price : rawFee;
    const sellQty = qty;
    const sellFee = fee;

    if (f.isBuyer) {
      buyQueue.push({ price, qty, fee, time: Number(f.time) });
      continue;
    }
    let remaining = qty;
    let matchIndex = 0;
    while (remaining > 1e-12 && buyQueue.length > 0) {
      const lot = buyQueue[0];
      const matched = Math.min(remaining, lot.qty);
      const portion = lot.qty > 0 ? matched / lot.qty : 0;
      const buyFeePortion = lot.fee * portion;
      lot.fee -= buyFeePortion;
      const sellFeePortion = sellQty > 0 ? sellFee * (matched / sellQty) : 0;
      const pnl = (price - lot.price) * matched - buyFeePortion - sellFeePortion;
      const externalId = `mexc:${symbol}:spot:${f.id}:${matchIndex}`;
      out.push({
        external_id: externalId,
        broker_id: 'mexc_spot',
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
