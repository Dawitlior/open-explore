/**
 * Coinbase spot reconstruction — validation fixtures (PART B3).
 *
 * Shape per Advanced Trade `/api/v3/brokerage/orders/historical/fills`.
 * Long-only spot FIFO with §3.1 proportional fees.
 */

import { describe, it, expect } from 'vitest';
import { coinbaseToTrades, type CoinbaseFill } from '@/lib/brokers/_recon/coinbase';

const FIXTURE: CoinbaseFill[] = [
  { trade_id: 't1', product_id: 'BTC-USD', side: 'BUY',  price: '30000', size: '1.0', commission: '30', trade_time: '2023-11-14T22:00:00Z' },
  { trade_id: 't2', product_id: 'BTC-USD', side: 'SELL', price: '32000', size: '1.0', commission: '32', trade_time: '2023-11-15T00:00:00Z' },
];

describe('Coinbase spot reconstruction (PART B3)', () => {
  const trades = coinbaseToTrades(FIXTURE);

  it('produces exactly 1 closed lot', () => {
    expect(trades).toHaveLength(1);
    expect(trades[0].external_id).toBe('coinbase:BTC-USD:t2:0');
  });

  it('PnL = (32000-30000)·1 − 30 − 32 = 1938; fees = 62', () => {
    const t = trades[0];
    expect(t.direction).toBe('long');
    expect(t.entry).toBe(30000);
    expect(t.exit).toBe(32000);
    expect(t.size).toBeCloseTo(1.0, 8);
    expect(t.pnl).toBeCloseTo(1938, 6);
    expect(t.fees).toBeCloseTo(62, 6);
    expect(t.opened_at).toBe('2023-11-14T22:00:00.000Z');
    expect(t.closed_at).toBe('2023-11-15T00:00:00.000Z');
  });

  it('Empty input → empty output', () => {
    expect(coinbaseToTrades([])).toEqual([]);
  });

  it('Idempotent', () => {
    const again = coinbaseToTrades(FIXTURE);
    expect(again.map(t => t.external_id)).toEqual(trades.map(t => t.external_id));
  });
});
