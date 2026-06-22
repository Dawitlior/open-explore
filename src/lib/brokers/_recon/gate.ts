/**
 * Gate.io USDT-M Futures reconstruction — pure, broker-agnostic.
 *
 * Canonical algorithm for `position_close`. The edge function
 * `sync-futures-trades` mirrors this verbatim — change one, change both.
 * Tested by `src/test/gate-reconstruction.test.ts`.
 *
 * Mapping (per Gate v4 /futures/usdt/position_close):
 *   side: 'long' | 'short'        → direction
 *   long_price / short_price      → entry / exit (long_price = avg long-leg
 *                                   price, short_price = avg short-leg price)
 *   accum_size                    → size (always |x|)
 *   pnl                           → realised pnl (gross — see §C1)
 *   pnl_fee                       → fees (stored as absolute value; Gate
 *                                   reports it as a negative number)
 *   time / first_open_time        → close / open (epoch seconds → ms)
 *   external_id                   → gate_futures:<contract>:<time>
 */

export interface GateClosedPosition {
  time?: number;
  contract?: string;
  side?: string;
  pnl?: string | number;
  pnl_fee?: string | number;
  pnl_pnl?: string | number;
  accum_size?: string | number;
  long_price?: string | number;
  short_price?: string | number;
  entry_price?: string | number;
  exit_price?: string | number;
  first_open_time?: number;
}

export interface ReconTrade {
  external_id: string;
  broker_id: 'gate_futures';
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

export function gateFuturesToTrades(rows: GateClosedPosition[]): ReconTrade[] {
  const out: ReconTrade[] = [];
  for (const r of rows) {
    const symbol = String(r.contract || '');
    if (!symbol) continue;
    const direction: 'long' | 'short' = String(r.side || '').toLowerCase() === 'short' ? 'short' : 'long';
    const entry = Number(r.long_price ?? r.entry_price ?? 0);
    const exit = Number(r.short_price ?? r.exit_price ?? 0);
    const size = Math.abs(Number(r.accum_size ?? 0));
    const pnl = Number(r.pnl ?? r.pnl_pnl ?? 0);
    // Gate reports pnl_fee as a negative value (a debit). Store as a positive
    // fees magnitude so downstream analytics treat fees consistently.
    const fees = Math.abs(Number(r.pnl_fee ?? 0));
    const closeMs = Number(r.time ?? 0) * 1000 || Date.now();
    const openMs = r.first_open_time ? Number(r.first_open_time) * 1000 : closeMs;
    const externalId = `gate_futures:${symbol}:${r.time ?? ''}`;
    out.push({
      external_id: externalId,
      broker_id: 'gate_futures',
      source_type: 'api_sync',
      asset_class: 'crypto',
      symbol,
      direction,
      entry,
      exit,
      size,
      leverage: 0,
      pnl,
      fees,
      stop_loss: 0,
      opened_at: new Date(openMs).toISOString(),
      closed_at: new Date(closeMs).toISOString(),
      data: { exchange_exec_id: externalId },
    });
  }
  return out;
}
