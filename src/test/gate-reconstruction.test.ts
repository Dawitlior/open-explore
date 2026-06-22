/**
 * Gate.io Futures reconstruction — validation fixtures (PART B1).
 *
 * Sample payloads are shaped per Gate v4 `/futures/usdt/position_close`.
 * If this passes, the documented mapping is correctly applied; the live
 * confirm (§C1: pnl gross vs net, exact entry/exit field semantics) is
 * the only remaining unknown.
 */

import { describe, it, expect } from 'vitest';
import { gateFuturesToTrades, type GateClosedPosition } from '@/lib/brokers/_recon/gate';

const FIXTURE: GateClosedPosition[] = [
  {
    time: 1700000000,
    contract: 'BTC_USDT',
    side: 'long',
    pnl: '150.5',
    pnl_fee: '-2.3',
    accum_size: 100,
    first_open_time: 1699996400,
    long_price: '60000',
    short_price: '61505',
  },
  {
    time: 1700010000,
    contract: 'ETH_USDT',
    side: 'short',
    pnl: '80.0',
    pnl_fee: '-1.1',
    accum_size: 50,
    first_open_time: 1700006400,
    long_price: '3100',
    short_price: '3000',
  },
];

describe('Gate.io Futures reconstruction (PART B1)', () => {
  const trades = gateFuturesToTrades(FIXTURE);

  it('produces exactly 2 trades (one per closed position)', () => {
    expect(trades).toHaveLength(2);
    expect(trades.map(t => t.external_id)).toEqual([
      'gate_futures:BTC_USDT:1700000000',
      'gate_futures:ETH_USDT:1700010000',
    ]);
  });

  it('Trade 1 (BTC long): direction + prices + pnl + fees + timestamps', () => {
    const t = trades[0];
    expect(t.direction).toBe('long');
    expect(t.symbol).toBe('BTC_USDT');
    expect(t.entry).toBe(60000);
    expect(t.exit).toBe(61505);
    expect(t.size).toBe(100);
    expect(t.pnl).toBe(150.5);
    expect(t.fees).toBeCloseTo(2.3, 6);
    expect(t.opened_at).toBe(new Date(1699996400 * 1000).toISOString());
    expect(t.closed_at).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it('Trade 2 (ETH short): direction + prices + pnl + fees', () => {
    const t = trades[1];
    expect(t.direction).toBe('short');
    expect(t.symbol).toBe('ETH_USDT');
    expect(t.entry).toBe(3100);
    expect(t.exit).toBe(3000);
    expect(t.size).toBe(50);
    expect(t.pnl).toBe(80);
    expect(t.fees).toBeCloseTo(1.1, 6);
  });

  it('Empty input → empty output (no crash)', () => {
    expect(gateFuturesToTrades([])).toEqual([]);
  });

  it('Idempotent: same input → identical external_ids', () => {
    const again = gateFuturesToTrades(FIXTURE);
    expect(again.map(t => t.external_id)).toEqual(trades.map(t => t.external_id));
  });
});
