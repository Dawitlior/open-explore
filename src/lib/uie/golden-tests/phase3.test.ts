// UIE v1.2 — Phase 3 · Step 6 · Golden tests
import { describe, it, expect } from 'vitest';
import { archetypeC } from '../archetypes/archetype-c';
import { classifyFills } from '../archetypes/fill-classify';
import { linkFiles } from '../link-files/link';
import { deriveFields } from '../link-files/derive';

describe('classifyFills', () => {
  it('detects a fills table', () => {
    const headers = ['Order Id', 'Fill Id', 'Symbol', 'Side', 'Price', 'Qty'];
    const rows = [
      ['O1', 'F1', 'BTC', 'Long', '50000', '0.1'],
      ['O1', 'F2', 'BTC', 'Long', '50100', '0.1'],
      ['O2', 'F3', 'ETH', 'Long', '3000', '1'],
    ];
    const r = classifyFills(headers, rows);
    expect(r.isFills).toBe(true);
    expect(r.signals).toContain('fill_id_column');
  });

  it('does NOT flag a one-row-per-trade table', () => {
    const headers = ['Date', 'Symbol', 'Side', 'Entry', 'Exit', 'PnL'];
    const rows = [['2024-03-15', 'BTC', 'Long', '50000', '52000', '200']];
    const r = classifyFills(headers, rows);
    expect(r.isFills).toBe(false);
  });
});

describe('archetypeC', () => {
  it('aggregates two opens + one close into one trade with VWAP entry', () => {
    const headers = ['Order Id', 'Date', 'Symbol', 'Side', 'Price', 'Qty', 'Fee', 'PnL'];
    const rows = [
      ['O1', '2024-03-15 10:00', 'BTC', 'Long', '50000', '0.1', '5', ''],
      ['O1', '2024-03-15 10:05', 'BTC', 'Long', '50200', '0.1', '5', ''],
      ['O1', '2024-03-15 14:00', 'BTC', 'Short', '52000', '0.2', '10', '380'],
    ];
    const r = archetypeC(headers, rows);
    expect(r.trades).toHaveLength(1);
    const t = r.trades[0];
    expect(t.entry).toBeCloseTo(50100, 3); // (50000*0.1 + 50200*0.1) / 0.2
    expect(t.exit).toBe(52000);
    expect(t.feeTotal).toBe(20);
    expect(t.status).toBe('closed');
  });

  it('keeps a position open when not fully unwound', () => {
    const headers = ['Order Id', 'Symbol', 'Side', 'Price', 'Qty'];
    const rows = [
      ['O1', 'BTC', 'Long', '50000', '0.1'],
      ['O1', 'BTC', 'Long', '50100', '0.1'],
    ];
    const r = archetypeC(headers, rows);
    expect(r.trades[0].status).toBe('open');
  });
});

describe('linkFiles', () => {
  it('returns derived trades from fills-only input', () => {
    const fills = {
      name: 'fills.csv',
      headers: ['Order Id', 'Fill Id', 'Symbol', 'Side', 'Price', 'Qty'],
      rows: [
        ['O1', 'F1', 'BTC', 'Long', '50000', '0.1'],
        ['O1', 'F2', 'BTC', 'Short', '52000', '0.1'],
      ],
    };
    const r = linkFiles([fills]);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].entry).toBe(50000);
    expect(r.trades[0].exit).toBe(52000);
  });

  it('links trades.csv + fills.csv by externalId', () => {
    const tradesFile = {
      name: 'trades.csv',
      headers: ['External Id', 'Date', 'Symbol', 'Side', 'PnL'],
      rows: [['O1', '2024-03-15', 'BTC', 'Long', '200']],
    };
    const fills = {
      name: 'fills.csv',
      headers: ['Order Id', 'Fill Id', 'Symbol', 'Side', 'Price', 'Qty'],
      rows: [
        ['O1', 'F1', 'BTC', 'Long', '50000', '0.1'],
        ['O1', 'F2', 'BTC', 'Short', '52000', '0.1'],
      ],
    };
    const r = linkFiles([tradesFile, fills]);
    expect(r.trades).toHaveLength(1);
    // pnl from trades.csv, VWAP entry/exit from fills
    expect(r.trades[0].pnl).toBe(200);
    expect(r.trades[0].entry).toBe(50000);
    expect(r.trades[0].exit).toBe(52000);
    expect(r.diagnostics.linkedCount).toBe(1);
  });
});

describe('deriveFields', () => {
  it('fills entry from avgEntry and pnl from entry/exit', () => {
    const out = deriveFields({ avgEntry: 100, exit: 110, positionSize: 2, direction: 'Long' });
    expect(out.entry).toBe(100);
    expect(out.pnl).toBe(20);
  });

  it('inverts pnl for Short direction', () => {
    const out = deriveFields({ entry: 100, exit: 90, positionSize: 2, direction: 'Short' });
    expect(out.pnl).toBe(20);
  });
});
