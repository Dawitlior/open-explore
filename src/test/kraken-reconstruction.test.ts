/**
 * Kraken Futures reconstruction — validation fixtures (PART B2).
 *
 * Sample payloads are shaped per Kraken Futures `/api/v3/fills` (linear
 * PF_ contracts to keep PnL = (exit-entry)·size for long, (entry-exit)·size
 * for short). Inverse PI_ contracts are out of scope until the FIFO branches
 * on contract type. Fees are honestly emitted as 0 because `fills` carries
 * none — fees come from `account-log` (§C2).
 */

import { describe, it, expect } from 'vitest';
import { krakenFillsToTrades, type KrakenFill } from '@/lib/brokers/_recon/kraken';

const FIXTURE: KrakenFill[] = [
  { fill_id: 'f1', symbol: 'PF_XBTUSD', side: 'buy',  size: 5, price: 50000, fillTime: '2023-11-14T22:00:00.000Z', fillType: 'taker' },
  { fill_id: 'f2', symbol: 'PF_XBTUSD', side: 'sell', size: 5, price: 52000, fillTime: '2023-11-14T23:00:00.000Z', fillType: 'taker' },
  { fill_id: 'f3', symbol: 'PF_ETHUSD', side: 'sell', size: 3, price: 3000,  fillTime: '2023-11-15T00:00:00.000Z', fillType: 'taker' },
  { fill_id: 'f4', symbol: 'PF_ETHUSD', side: 'buy',  size: 3, price: 2800,  fillTime: '2023-11-15T01:00:00.000Z', fillType: 'taker' },
];

describe('Kraken Futures reconstruction (PART B2)', () => {
  const trades = krakenFillsToTrades(FIXTURE);

  it('produces exactly 2 closed lots (one long, one short)', () => {
    expect(trades).toHaveLength(2);
    expect(trades.map(t => t.external_id).sort()).toEqual([
      'kraken_futures:PF_ETHUSD:f4:0',
      'kraken_futures:PF_XBTUSD:f2:0',
    ]);
  });

  it('Long lot (XBT): pnl = (52000 - 50000) · 5 = 10000', () => {
    const t = trades.find(x => x.external_id === 'kraken_futures:PF_XBTUSD:f2:0')!;
    expect(t.direction).toBe('long');
    expect(t.entry).toBe(50000);
    expect(t.exit).toBe(52000);
    expect(t.size).toBe(5);
    expect(t.pnl).toBe(10000);
    expect(t.fees).toBe(0);
    expect(t.opened_at).toBe('2023-11-14T22:00:00.000Z');
    expect(t.closed_at).toBe('2023-11-14T23:00:00.000Z');
  });

  it('Short lot (ETH): pnl = (3000 - 2800) · 3 = 600', () => {
    const t = trades.find(x => x.external_id === 'kraken_futures:PF_ETHUSD:f4:0')!;
    expect(t.direction).toBe('short');
    expect(t.entry).toBe(3000);
    expect(t.exit).toBe(2800);
    expect(t.size).toBe(3);
    expect(t.pnl).toBe(600);
    expect(t.fees).toBe(0);
    expect(t.opened_at).toBe('2023-11-15T00:00:00.000Z');
    expect(t.closed_at).toBe('2023-11-15T01:00:00.000Z');
  });

  it('Empty input → empty output', () => {
    expect(krakenFillsToTrades([])).toEqual([]);
  });

  it('Idempotent', () => {
    const again = krakenFillsToTrades(FIXTURE);
    expect(again.map(t => t.external_id)).toEqual(trades.map(t => t.external_id));
  });
});
