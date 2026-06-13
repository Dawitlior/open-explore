// UIE v1.2 — Phase 2 · Step 3 · Archetype A tests
import { describe, it, expect } from 'vitest';
import { archetypeA } from '../archetypes/archetype-a';

describe('archetypeA', () => {
  it('maps a simple single-row trade table', () => {
    const headers = ['Date', 'Symbol', 'Side', 'Entry', 'Exit', 'PnL', 'R Multiple'];
    const rows = [
      ['2024-03-15', 'BTCUSDT', 'Long', '50000', '52000', '200', '1.5'],
      ['2024-03-16', 'ETHUSDT', 'Short', '3000', '2900', '100', '0.8'],
    ];
    const r = archetypeA(headers, rows);
    expect(r.trades).toHaveLength(2);
    expect(r.trades[0].symbol).toBe('BTCUSDT');
    expect(r.trades[0].direction).toBe('Long');
    expect(r.trades[0].entry).toBe(50000);
    expect(r.trades[0].rMultiple).toBe(1.5);
  });

  it('handles Hebrew headers + RTL values', () => {
    const headers = ['תאריך', 'מטבע', 'כיוון', 'מחיר כניסה', 'מחיר יציאה', 'רווח'];
    const rows = [
      ['15/03/2024', 'BTC', 'לונג', '50000', '52000', '200'],
    ];
    const r = archetypeA(headers, rows);
    expect(r.trades[0].symbol).toBe('BTC');
    expect(r.trades[0].direction).toBe('Long');
    expect(r.trades[0].entry).toBe(50000);
  });

  it('drops unmapped columns and reports them in the plan', () => {
    const headers = ['Symbol', 'Entry', 'XYZ_unknown_thing'];
    const rows = [['BTC', '50000', 'garbage']];
    const r = archetypeA(headers, rows);
    expect(r.trades[0].symbol).toBe('BTC');
    expect(r.trades[0]).not.toHaveProperty('XYZ_unknown_thing');
    const unmapped = r.plan.find((p) => p.rawHeader === 'XYZ_unknown_thing');
    expect(unmapped?.finalField).toBeNull();
    expect(unmapped?.reason).toBe('unmapped');
  });

  it('rejects pending rMultiple when content is clearly currency', () => {
    const headers = ['Symbol', 'R Multiple'];
    const rows = [
      ['BTC', '$1,250'],
      ['ETH', '$3,400'],
      ['SOL', '$870'],
    ];
    const r = archetypeA(headers, rows);
    const rCol = r.plan.find((p) => p.rawHeader === 'R Multiple');
    expect(rCol?.finalField).toBeNull();
    expect(rCol?.reason).toBe('content_rejected');
  });

  it('confirms pending rMultiple when content is in r-multiple range', () => {
    const headers = ['Symbol', 'R'];
    const rows = [['BTC', '1.5'], ['ETH', '-1'], ['SOL', '2.3']];
    const r = archetypeA(headers, rows);
    expect(r.trades[0].rMultiple).toBe(1.5);
    expect(r.trades[1].rMultiple).toBe(-1);
  });

  it('warns on date_conflict columns', () => {
    const headers = ['Date', 'Symbol'];
    const rows = [['15/03/2024', 'BTC'], ['03/15/2024', 'ETH']];
    const r = archetypeA(headers, rows);
    expect(r.warnings.some((w) => w.includes('date_conflict'))).toBe(true);
  });

  it('normalizes European decimals for prices', () => {
    const headers = ['Symbol', 'Entry'];
    const rows = [['BTC', '50.000,50']];
    const r = archetypeA(headers, rows);
    expect(r.trades[0].entry).toBe(50000.5);
  });

  it('skips empty rows', () => {
    const headers = ['Symbol', 'Entry'];
    const rows = [['BTC', '50000'], ['', ''], [null, null]];
    const r = archetypeA(headers, rows);
    expect(r.trades).toHaveLength(1);
  });
});
