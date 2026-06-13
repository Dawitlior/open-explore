// UIE v1.2 — Phase 4.5 · Delivery golden tests.
import { describe, it, expect } from 'vitest';
import { analyzeGaps } from '../delivery/gap-analysis';
import { suggestFixes } from '../delivery/fix-actions';
import { dedupTrades } from '../delivery/dedup';
import { foldOverflowIntoComments, foldOverflowBatch } from '../delivery/notes-overflow';
import type { CanonicalTrade } from '../canonical-trade';

describe('Phase 4.5 · gap-analysis', () => {
  it('flags missing critical fields', () => {
    const trades: CanonicalTrade[] = [
      { symbol: 'BTCUSDT', direction: 'Long', entry: 100, exit: 110, positionSize: 1, pnl: 10, entryDate: '2025-01-01', exitDate: '2025-01-02', rowIndex: 0 },
      { symbol: '', direction: 'Long', entry: 0, exit: 0, rowIndex: 1 },
    ];
    const r = analyzeGaps(trades);
    expect(r.totalRows).toBe(2);
    expect(r.criticalRows).toContain(1);
    expect(r.coverage.symbol).toBe(0.5);
    expect(r.coverage.entry).toBe(0.5);
  });

  it('100% coverage → no critical rows', () => {
    const trades: CanonicalTrade[] = [
      { symbol: 'ETH', direction: 'Short', entry: 200, exit: 190, positionSize: 2, pnl: 20, entryDate: '2025-01-01', exitDate: '2025-01-02', rowIndex: 0 },
    ];
    const r = analyzeGaps(trades);
    expect(r.criticalRows).toEqual([]);
    expect(r.coverage.symbol).toBe(1);
  });
});

describe('Phase 4.5 · fix-actions', () => {
  it('suggests derive-from-fills for entry/exit', () => {
    const r = analyzeGaps([{ symbol: 'BTC', direction: 'Long', entry: 0, exit: 0, rowIndex: 0 }]);
    const fixes = suggestFixes(r);
    const f = fixes.find((x) => x.field === 'entry');
    expect(f?.kind).toBe('derive-from-fills');
  });

  it('symbol critical → request-user-input', () => {
    const r = analyzeGaps([{ symbol: '', direction: 'Long', entry: 100, exit: 110, rowIndex: 0 }]);
    const f = suggestFixes(r).find((x) => x.field === 'symbol');
    expect(f?.kind).toBe('request-user-input');
  });
});

describe('Phase 4.5 · dedup', () => {
  it('dedupes by externalId', () => {
    const trades: CanonicalTrade[] = [
      { externalId: 'abc', symbol: 'BTC', entry: 100, exit: 110, pnl: 10 },
      { externalId: 'abc', symbol: 'BTC', entry: 100, exit: 110, fees: 0.5 },
      { externalId: 'def', symbol: 'ETH', entry: 200, exit: 210 },
    ];
    const r = dedupTrades(trades);
    expect(r.unique).toHaveLength(2);
    expect(r.duplicates).toHaveLength(1);
    // merged fees into kept
    expect(r.unique[0].fees).toBe(0.5);
  });

  it('dedupes by composite key when no externalId', () => {
    const trades: CanonicalTrade[] = [
      { symbol: 'BTC', direction: 'Long', entryDate: '2025-01-01', entry: 100, positionSize: 1 },
      { symbol: 'BTC', direction: 'Long', entryDate: '2025-01-01', entry: 100, positionSize: 1, exit: 110 },
    ];
    const r = dedupTrades(trades);
    expect(r.unique).toHaveLength(1);
    expect(r.unique[0].exit).toBe(110);
  });
});

describe('Phase 4.5 · notes-overflow', () => {
  it('folds unknown keys into comments', () => {
    const t: CanonicalTrade = { symbol: 'BTC', entry: 100, exit: 110, broker_order_ref: 'X-123', custom_tag: 'scalp' };
    const r = foldOverflowIntoComments(t);
    expect(typeof r.comments).toBe('string');
    expect((r.comments as string)).toContain('broker_order_ref=X-123');
    expect((r.comments as string)).toContain('custom_tag=scalp');
    expect((r as any).broker_order_ref).toBeUndefined();
  });

  it('appends to existing comments and caps length', () => {
    const long = 'x'.repeat(2000);
    const r = foldOverflowIntoComments({ symbol: 'BTC', comments: 'note', extra: long }, { maxLen: 100 });
    expect((r.comments as string).length).toBeLessThanOrEqual(100);
    expect((r.comments as string).startsWith('note')).toBe(true);
  });

  it('batch leaves canonical-only rows untouched', () => {
    const trades: CanonicalTrade[] = [{ symbol: 'BTC', entry: 100, exit: 110 }];
    const r = foldOverflowBatch(trades);
    expect(r[0].comments).toBeUndefined();
  });
});
