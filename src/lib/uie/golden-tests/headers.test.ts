// UIE v1.2 — Phase 1 Golden Tests (header-only snapshot).
// Content-dependent columns are expected to land at status: 'pending-content'
// and MUST NOT lock a final field in Phase 1 (D3).
import { describe, it, expect } from 'vitest';
import { mapHeaderToField } from '../matching/tiers';
import { detectDateFormat } from '../matching/date-detect';

// Representative header fixtures drawn from GF-1..5.
const HEADERS = [
  // GF-1 (Bybit EN)
  'Symbol', 'Side', 'Order Type', 'Avg Entry Price', 'Avg Exit Price',
  'Closed P&L', 'Opening Fee', 'Closing Fee', 'Funding Fee',
  'Trade Time(UTC+0)', 'Closed Time(UTC+0)', 'Status',
  // GF-2 (Binance HE)
  'תאריך פתיחה', 'תאריך סגירה', 'סימול', 'כיוון', 'מחיר כניסה',
  'מחיר יציאה', 'כמות', 'רווח/הפסד', 'עמלות', 'הערות',
  // GF-3 (camelCase)
  'entryDate', 'exitDate', 'positionSize', 'realizedPnl', 'feeTotal',
  // GF-4 (mixed)
  'R-Multiple', 'Risk %', 'Return %', 'MFE', 'MAE', 'Leverage', 'Balance',
  // GF-5 (edge)
  '#', 'No.', 'Trade Ref', 'Liquidated', 'Duration',
];

describe('UIE Phase 1 — header matching ≥95% coverage', () => {
  it('maps the bulk of representative headers', () => {
    const results = HEADERS.map((h) => ({ h, r: mapHeaderToField(h) }));
    const hits = results.filter(
      (x) => x.r.status === 'mapped' || x.r.status === 'pending-content',
    );
    const rate = hits.length / results.length;
    if (rate < 0.95) {
      // eslint-disable-next-line no-console
      console.log('Unmapped:', results.filter((x) => x.r.status === 'unmapped').map((x) => x.h));
    }
    expect(rate).toBeGreaterThanOrEqual(0.95);
  });

  it('never locks a content-dependent column to a final mapping (D3)', () => {
    const pending = ['R-Multiple', 'Risk %', 'Return %'];
    for (const h of pending) {
      const r = mapHeaderToField(h);
      expect(r.status).toBe('pending-content');
    }
  });

  it('hebrew aliases hit P1/P2 exactly', () => {
    const r = mapHeaderToField('תאריך פתיחה');
    expect(r.field).toBe('entryDate');
    expect(r.tier === 'P1' || r.tier === 'P2').toBe(true);
  });

  it('camelCase splits before matching', () => {
    const r = mapHeaderToField('entryDate');
    expect(r.field).toBe('entryDate');
    expect(r.status).toBe('mapped');
  });

  it('strips parenthetical content (UTC+0)', () => {
    const r = mapHeaderToField('Trade Time(UTC+0)');
    expect(r.field === 'time' || r.field === 'entryDate' || r.field === 'date').toBe(true);
  });
});

describe('UIE Phase 1 — date format detection (per-column, evidence-only)', () => {
  it('detects DD/MM when first component > 12', () => {
    const r = detectDateFormat(['15/03/2024', '20/06/2024', '01/01/2024']);
    expect(r.format).toBe('DD/MM');
  });

  it('detects MM/DD when second component > 12', () => {
    const r = detectDateFormat(['03/15/2024', '06/20/2024', '01/01/2024']);
    expect(r.format).toBe('MM/DD');
  });

  it('flags date_conflict when BOTH branches fire (#1 from delta)', () => {
    const r = detectDateFormat(['15/03/2024', '03/15/2024', '01/01/2024']);
    expect(r.format).toBe('CONFLICT');
    expect(r.flag).toBe('date_conflict');
  });

  it('flags date_ambiguous when no evidence either way', () => {
    const r = detectDateFormat(['01/02/2024', '03/04/2024', '05/06/2024']);
    expect(r.format).toBe('AMBIGUOUS');
    expect(r.flag).toBe('date_ambiguous');
    expect(r.candidates).toEqual(['DD/MM', 'MM/DD']);
  });

  it('never silently chooses a default language', () => {
    const r = detectDateFormat(['07/08/2024', '09/10/2024']);
    expect(['AMBIGUOUS', 'CONFLICT']).toContain(r.format);
    expect(['DD/MM', 'MM/DD']).not.toContain(r.format);
  });
});
