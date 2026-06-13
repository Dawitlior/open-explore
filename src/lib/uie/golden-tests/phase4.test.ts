// UIE v1.2 — Phase 4 · Golden tests
import { describe, it, expect } from 'vitest';
import { archetypeD, looksLikeArchetypeD } from '../archetypes/archetype-d';
import { buildLedger, summarizeByKind } from '../equity-events';
import { canonicalToNormalized } from '../adapter';

describe('looksLikeArchetypeD', () => {
  it('detects statement with multiple event kinds', () => {
    const headers = ['Date', 'Type', 'Amount'];
    const rows = [
      ['2024-01-01', 'Deposit', '1000'],
      ['2024-01-02', 'Fee', '-5'],
      ['2024-01-03', 'Withdrawal', '-200'],
      ['2024-01-04', 'Interest', '10'],
    ];
    expect(looksLikeArchetypeD(headers, rows)).toBe(true);
  });

  it('returns false for plain trade tables', () => {
    const headers = ['Date', 'Symbol', 'Side', 'Entry', 'Exit'];
    const rows = [['2024-03-15', 'BTC', 'Long', '50000', '52000']];
    expect(looksLikeArchetypeD(headers, rows)).toBe(false);
  });
});

describe('archetypeD', () => {
  it('partitions trades from equity events', () => {
    const headers = ['Date', 'Type', 'Symbol', 'Side', 'Entry', 'Exit', 'PnL', 'Amount'];
    const rows = [
      ['2024-01-01 10:00', 'Deposit',    '',    '',     '',      '',      '',    '1000'],
      ['2024-03-15 10:00', 'Buy',        'BTC', 'Long', '50000', '52000', '200', ''],
      ['2024-03-16 09:00', 'Fee',        '',    '',     '',      '',      '',    '-5'],
      ['2024-03-17 14:00', 'Withdrawal', '',    '',     '',      '',      '',    '-300'],
      ['2024-04-01 11:00', 'Funding',    '',    '',     '',      '',      '',    '-2'],
    ];
    const r = archetypeD(headers, rows);
    expect(r.diagnostics.tradeRows).toBe(1);
    expect(r.diagnostics.eventRows).toBe(4);
    expect(r.events.map((e) => e.kind).sort()).toEqual(['deposit', 'fee', 'funding', 'withdrawal']);
    expect(r.trades[0].symbol).toBe('BTC');
  });

  it('falls back to A when no type column exists', () => {
    const headers = ['Date', 'Symbol', 'Side', 'Entry', 'Exit'];
    const rows = [['2024-03-15', 'BTC', 'Long', '50000', '52000']];
    const r = archetypeD(headers, rows);
    expect(r.warnings.some((w) => w.includes('fell back'))).toBe(true);
    expect(r.trades).toHaveLength(1);
  });
});

describe('equity-events', () => {
  it('builds chronological ledger with cumulative delta', () => {
    const ledger = buildLedger([
      { kind: 'deposit',    date: '2024-01-01 10:00', amount: 1000, rowIndex: 1 },
      { kind: 'fee',        date: '2024-01-05 09:00', amount: 5,    rowIndex: 2 },
      { kind: 'withdrawal', date: '2024-01-10 12:00', amount: 200,  rowIndex: 3 },
    ]);
    expect(ledger[0].cumulativeDelta).toBe(1000);
    expect(ledger[1].cumulativeDelta).toBe(995);
    expect(ledger[2].cumulativeDelta).toBe(795);
  });

  it('summarizes by kind with sign conventions', () => {
    const s = summarizeByKind([
      { kind: 'deposit', date: null, amount: 1000, rowIndex: 1 },
      { kind: 'deposit', date: null, amount: 500,  rowIndex: 2 },
      { kind: 'fee',     date: null, amount: 5,    rowIndex: 3 },
    ]);
    expect(s.deposit.total).toBe(1500);
    expect(s.fee.total).toBe(-5);
  });
});

describe('canonicalToNormalized', () => {
  it('maps a complete canonical trade', () => {
    const n = canonicalToNormalized(
      {
        symbol: 'BTC', direction: 'Long', entry: 50000, exit: 52000,
        positionSize: 0.1, pnl: 200, fees: 5, leverage: 10,
        entryDate: '2024-03-15 10:00', exitDate: '2024-03-15 14:00',
        externalId: 'T1',
      },
      { brokerId: 'binance', accountLabel: 'main' },
    );
    expect(n).not.toBeNull();
    expect(n!.symbol).toBe('BTC');
    expect(n!.entry).toBe(50000);
    expect(n!.exit).toBe(52000);
    expect(n!.pnl).toBe(200);
    expect(n!.broker_id).toBe('binance');
    expect(n!.opened_at).toContain('2024-03-15');
  });

  it('returns null for empty rows', () => {
    expect(canonicalToNormalized({}, { brokerId: 'x' })).toBeNull();
  });

  it('preserves stop_loss=null when missing', () => {
    const n = canonicalToNormalized(
      { symbol: 'BTC', entry: 100, exit: 110, positionSize: 1 },
      { brokerId: 'x' },
    );
    expect(n!.stop_loss).toBeNull();
  });
});
