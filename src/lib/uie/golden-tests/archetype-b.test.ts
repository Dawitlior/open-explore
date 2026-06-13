// UIE v1.2 — Phase 2 · Step 4 · Archetype B tests
import { describe, it, expect } from 'vitest';
import { archetypeB, looksLikeArchetypeB } from '../archetypes/archetype-b';

describe('looksLikeArchetypeB', () => {
  it('detects open/close action column', () => {
    const headers = ['Date', 'Action', 'Symbol', 'Entry'];
    const rows = [
      ['2024-03-15 10:00', 'Open', 'BTC', '50000'],
      ['2024-03-15 14:00', 'Close', 'BTC', '52000'],
    ];
    expect(looksLikeArchetypeB(headers, rows)).toBe(true);
  });

  it('returns false for single-row tables', () => {
    const headers = ['Date', 'Symbol', 'Entry', 'Exit'];
    const rows = [['2024-03-15', 'BTC', '50000', '52000']];
    expect(looksLikeArchetypeB(headers, rows)).toBe(false);
  });
});

describe('archetypeB', () => {
  it('pairs open/close rows into a single trade', () => {
    const headers = ['Date', 'Action', 'Symbol', 'Side', 'Entry', 'Exit', 'PnL', 'External Id'];
    const rows = [
      ['2024-03-15 10:00', 'Open',  'BTC', 'Long', '50000', '',      '',    'T1'],
      ['2024-03-15 14:00', 'Close', 'BTC', 'Long', '',      '52000', '200', 'T1'],
    ];
    const r = archetypeB(headers, rows);
    expect(r.diagnostics.pairedTrades).toBe(1);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].entry).toBe(50000);
    expect(r.trades[0].exit).toBe(52000);
    expect(r.trades[0].pnl).toBe(200);
    expect(r.trades[0].entryDate).toBe('2024-03-15 10:00');
    expect(r.trades[0].exitDate).toBe('2024-03-15 14:00');
    expect(r.trades[0].status).toBe('closed');
  });

  it('pairs by externalId when times are reversed in the file', () => {
    const headers = ['Date', 'Action', 'Symbol', 'Side', 'Entry', 'Exit', 'External Id'];
    const rows = [
      ['2024-03-15 14:00', 'Close', 'BTC', 'Long', '', '52000', 'T1'],
      ['2024-03-15 10:00', 'Open',  'BTC', 'Long', '50000', '',  'T1'],
    ];
    const r = archetypeB(headers, rows);
    expect(r.diagnostics.pairedTrades).toBe(1);
    expect(r.trades[0].entry).toBe(50000);
    expect(r.trades[0].exit).toBe(52000);
  });

  it('keeps unpaired opens as status=open', () => {
    const headers = ['Date', 'Action', 'Symbol', 'Side', 'Entry'];
    const rows = [
      ['2024-03-15 10:00', 'Open', 'BTC', 'Long', '50000'],
    ];
    const r = archetypeB(headers, rows);
    expect(r.diagnostics.orphanRows).toBe(0);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].status).toBe('open');
  });

  it('falls back to archetype-a when no action column exists', () => {
    const headers = ['Date', 'Symbol', 'Entry', 'Exit'];
    const rows = [['2024-03-15', 'BTC', '50000', '52000']];
    const r = archetypeB(headers, rows);
    expect(r.warnings.some((w) => w.includes('fell back'))).toBe(true);
    expect(r.trades).toHaveLength(1);
  });

  it('pairs multiple trades by nearest-later time per symbol', () => {
    const headers = ['Date', 'Action', 'Symbol', 'Side', 'Entry', 'Exit', 'PnL'];
    const rows = [
      ['2024-03-15 10:00', 'Open',  'BTC', 'Long', '50000', '',      ''],
      ['2024-03-15 11:00', 'Open',  'ETH', 'Long', '3000',  '',      ''],
      ['2024-03-15 12:00', 'Close', 'BTC', 'Long', '',      '52000', '200'],
      ['2024-03-15 13:00', 'Close', 'ETH', 'Long', '',      '3100',  '100'],
    ];
    const r = archetypeB(headers, rows);
    expect(r.diagnostics.pairedTrades).toBe(2);
    const btc = r.trades.find((t) => t.symbol === 'BTC')!;
    const eth = r.trades.find((t) => t.symbol === 'ETH')!;
    expect(btc.exit).toBe(52000);
    expect(eth.exit).toBe(3100);
  });
});
