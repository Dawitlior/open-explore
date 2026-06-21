/**
 * ORCA MEXC Validation Fixtures — deterministic algorithm test.
 *
 * Verifies that the pure reconstruction module in
 * `src/lib/brokers/_recon/mexc.ts` matches the fixtures defined in
 * `ORCA_MEXC_Validation_Fixtures.md` (delivered by Architecture).
 *
 * If this test passes, the reconstruction algorithm is honest — the only
 * remaining live unknown is the live MEXC payload shape itself.
 */

import { describe, it, expect } from 'vitest';
import {
  mexcFuturesToTrades,
  mexcSpotToTrades,
  type MexcFuturesOrder,
  type MexcSpotFill,
} from '@/lib/brokers/_recon/mexc';

const FUTURES_INPUT: MexcFuturesOrder[] = [
  { orderId: 1001, symbol: 'BTC_USDT', positionId: 5001, side: 1, dealAvgPrice: 60000, dealVol: 1,  leverage: 10, profit: 0,    takerFee: 12,   makerFee: 0, createTime: 1700000000000, updateTime: 1700000000000 },
  { orderId: 1002, symbol: 'BTC_USDT', positionId: 5001, side: 4, dealAvgPrice: 63000, dealVol: 1,  leverage: 10, profit: 3000, takerFee: 12.6, makerFee: 0, createTime: 1700003600000, updateTime: 1700003600000 },
  { orderId: 2001, symbol: 'ETH_USDT', positionId: 5002, side: 3, dealAvgPrice: 3000,  dealVol: 10, leverage: 5,  profit: 0,    takerFee: 3,    makerFee: 0, createTime: 1700010000000, updateTime: 1700010000000 },
  { orderId: 2002, symbol: 'ETH_USDT', positionId: 5002, side: 2, dealAvgPrice: 2800,  dealVol: 10, leverage: 5,  profit: 2000, takerFee: 2.8,  makerFee: 0, createTime: 1700013600000, updateTime: 1700013600000 },
  { orderId: 3001, symbol: 'BTC_USDT', positionId: 5003, side: 1, dealAvgPrice: 50000, dealVol: 1,  leverage: 10, profit: 0,    takerFee: 10,   makerFee: 0, createTime: 1700020000000, updateTime: 1700020000000 },
  { orderId: 3002, symbol: 'BTC_USDT', positionId: 5003, side: 1, dealAvgPrice: 52000, dealVol: 1,  leverage: 10, profit: 0,    takerFee: 10.4, makerFee: 0, createTime: 1700020100000, updateTime: 1700020100000 },
  { orderId: 3003, symbol: 'BTC_USDT', positionId: 5003, side: 4, dealAvgPrice: 55000, dealVol: 2,  leverage: 10, profit: 8000, takerFee: 22,   makerFee: 0, createTime: 1700023600000, updateTime: 1700023600000 },
  { orderId: 4001, symbol: 'SOL_USDT', positionId: 5004, side: 1, dealAvgPrice: 100,   dealVol: 10, leverage: 5,  profit: 0,    takerFee: 1,    makerFee: 0, createTime: 1700030000000, updateTime: 1700030000000 },
];

describe('MEXC Futures reconstruction', () => {
  const trades = mexcFuturesToTrades(FUTURES_INPUT);

  it('produces exactly 3 trades (skips incomplete position 5004)', () => {
    expect(trades).toHaveLength(3);
    expect(trades.map(t => t.external_id).sort()).toEqual([
      'mexc:BTC_USDT:pos5001',
      'mexc:BTC_USDT:pos5003',
      'mexc:ETH_USDT:pos5002',
    ]);
  });

  it('Trade A (BTC pos 5001): simple long', () => {
    const a = trades.find(t => t.external_id === 'mexc:BTC_USDT:pos5001')!;
    expect(a.direction).toBe('long');
    expect(a.entry).toBe(60000);
    expect(a.exit).toBe(63000);
    expect(a.size).toBe(1);
    expect(a.leverage).toBe(10);
    expect(a.pnl).toBe(3000);
    expect(a.fees).toBeCloseTo(24.6, 6);
    expect(a.opened_at).toBe('2023-11-14T22:13:20.000Z');
    expect(a.closed_at).toBe('2023-11-14T23:13:20.000Z');
    expect(a.data.exchange_exec_id).toBe('1001,1002');
  });

  it('Trade B (ETH pos 5002): direction comes from open side, not price', () => {
    const b = trades.find(t => t.external_id === 'mexc:ETH_USDT:pos5002')!;
    expect(b.direction).toBe('short');
    expect(b.entry).toBe(3000);
    expect(b.exit).toBe(2800);
    expect(b.pnl).toBe(2000);
    expect(b.fees).toBeCloseTo(5.8, 6);
    expect(b.data.exchange_exec_id).toBe('2001,2002');
  });

  it('Trade C (BTC pos 5003): scale-in produces weighted entry', () => {
    const c = trades.find(t => t.external_id === 'mexc:BTC_USDT:pos5003')!;
    expect(c.direction).toBe('long');
    expect(c.entry).toBe(51000); // weighted: (50000·1 + 52000·1) / 2
    expect(c.exit).toBe(55000);
    expect(c.size).toBe(2);
    expect(c.pnl).toBe(8000);
    expect(c.fees).toBeCloseTo(42.4, 6);
    expect(c.data.exchange_exec_id).toBe('3001,3002,3003');
  });

  it('is idempotent (same input → identical external_ids)', () => {
    const again = mexcFuturesToTrades(FUTURES_INPUT);
    expect(again.map(t => t.external_id)).toEqual(trades.map(t => t.external_id));
  });
});

const SPOT_INPUT: MexcSpotFill[] = [
  { id: 10001, symbol: 'BTCUSDT', price: 60000, qty: 1.0, commission: 30,   commissionAsset: 'USDT', time: 1700100000000, isBuyer: true  },
  { id: 10002, symbol: 'BTCUSDT', price: 63000, qty: 0.4, commission: 12.6, commissionAsset: 'USDT', time: 1700200000000, isBuyer: false },
  { id: 10003, symbol: 'BTCUSDT', price: 64000, qty: 0.6, commission: 19.2, commissionAsset: 'USDT', time: 1700300000000, isBuyer: false },
];

describe('MEXC Spot FIFO reconstruction (with §3.1 fee fix)', () => {
  const lots = mexcSpotToTrades('BTCUSDT', SPOT_INPUT);

  it('produces exactly 2 lots', () => {
    expect(lots).toHaveLength(2);
  });

  it('Lot 1: PnL 1175.40', () => {
    const l1 = lots[0];
    expect(l1.external_id).toBe('mexc:BTCUSDT:spot:10002:0');
    expect(l1.entry).toBe(60000);
    expect(l1.exit).toBe(63000);
    expect(l1.size).toBeCloseTo(0.4, 8);
    expect(l1.pnl).toBeCloseTo(1175.4, 6);
    expect(l1.fees).toBeCloseTo(24.6, 6);
  });

  it('Lot 2: PnL 2362.80 (confirms §3.1 — would be 2350.80 without the fee-allocation fix)', () => {
    const l2 = lots[1];
    expect(l2.external_id).toBe('mexc:BTCUSDT:spot:10003:0');
    expect(l2.entry).toBe(60000);
    expect(l2.exit).toBe(64000);
    expect(l2.size).toBeCloseTo(0.6, 8);
    expect(l2.pnl).toBeCloseTo(2362.8, 6);
    expect(l2.pnl).not.toBeCloseTo(2350.8, 1);
    expect(l2.fees).toBeCloseTo(37.2, 6);
  });

  it('is idempotent (same input → identical external_ids)', () => {
    const again = mexcSpotToTrades('BTCUSDT', SPOT_INPUT);
    expect(again.map(l => l.external_id)).toEqual(lots.map(l => l.external_id));
  });
});
