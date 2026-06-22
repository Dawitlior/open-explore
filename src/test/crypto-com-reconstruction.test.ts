/**
 * Crypto.com spot reconstruction — validation fixtures (PART B4).
 *
 * Shape per Exchange v1 `private/get-trades`. Long-only spot FIFO with
 * §3.1 proportional fees. The two-fill fixture below proves PnL net of
 * both legs' commissions matches the documented expectation.
 */

import { describe, it, expect } from 'vitest';
import { cryptoComToTrades, type CryptoComTrade } from '@/lib/brokers/_recon/crypto_com';

const FIXTURE: CryptoComTrade[] = [
  { trade_id: 'c1', instrument_name: 'BTC_USDT', side: 'BUY',  traded_price: '60000', traded_quantity: '1.0', fees: '30',   create_time: 1700000000000 },
  { trade_id: 'c2', instrument_name: 'BTC_USDT', side: 'SELL', traded_price: '63000', traded_quantity: '1.0', fees: '31.5', create_time: 1700003600000 },
];

describe('Crypto.com spot reconstruction (PART B4)', () => {
  const trades = cryptoComToTrades(FIXTURE);

  it('produces exactly 1 closed lot', () => {
    expect(trades).toHaveLength(1);
    expect(trades[0].external_id).toBe('crypto_com:BTC_USDT:c2:0');
  });

  it('PnL = (63000-60000)·1 − 30 − 31.5 = 2938.5; fees = 61.5', () => {
    const t = trades[0];
    expect(t.direction).toBe('long');
    expect(t.entry).toBe(60000);
    expect(t.exit).toBe(63000);
    expect(t.size).toBeCloseTo(1.0, 8);
    expect(t.pnl).toBeCloseTo(2938.5, 6);
    expect(t.fees).toBeCloseTo(61.5, 6);
    expect(t.opened_at).toBe(new Date(1700000000000).toISOString());
    expect(t.closed_at).toBe(new Date(1700003600000).toISOString());
  });

  it('Empty input → empty output', () => {
    expect(cryptoComToTrades([])).toEqual([]);
  });

  it('Idempotent', () => {
    const again = cryptoComToTrades(FIXTURE);
    expect(again.map(t => t.external_id)).toEqual(trades.map(t => t.external_id));
  });
});
