// UIE v1.2 — Phase 2 · Step 2 · Value Normalizer tests
import { describe, it, expect } from 'vitest';
import {
  normalizeNumber,
  normalizePercent,
  normalizeRMultiple,
  normalizeDirection,
  normalizeDate,
  normalizeDateColumn,
  isNull,
} from '../content/normalize-values';

describe('normalizeNumber', () => {
  it('parses plain numbers', () => {
    expect(normalizeNumber('123.45')).toBe(123.45);
    expect(normalizeNumber(42)).toBe(42);
  });
  it('strips currency', () => {
    expect(normalizeNumber('$1,250.50')).toBe(1250.5);
    expect(normalizeNumber('1500 USD')).toBe(1500);
  });
  it('handles European decimals', () => {
    expect(normalizeNumber('1.234,56')).toBe(1234.56);
    expect(normalizeNumber('1,5')).toBe(1.5);
  });
  it('handles parenthetical negatives', () => {
    expect(normalizeNumber('(125.50)')).toBe(-125.5);
  });
  it('returns null for null tokens', () => {
    expect(normalizeNumber('-')).toBeNull();
    expect(normalizeNumber('N/A')).toBeNull();
    expect(normalizeNumber('')).toBeNull();
  });
});

describe('normalizePercent / normalizeRMultiple', () => {
  it('strips % suffix', () => {
    expect(normalizePercent('12.5%')).toBe(12.5);
  });
  it('strips R/x suffix', () => {
    expect(normalizeRMultiple('1.2R')).toBe(1.2);
    expect(normalizeRMultiple('-1R')).toBe(-1);
    expect(normalizeRMultiple('2x')).toBe(2);
  });
});

describe('normalizeDirection', () => {
  it('maps English', () => {
    expect(normalizeDirection('Long')).toBe('Long');
    expect(normalizeDirection('sell')).toBe('Short');
  });
  it('maps Hebrew', () => {
    expect(normalizeDirection('לונג')).toBe('Long');
    expect(normalizeDirection('שורט')).toBe('Short');
  });
  it('returns null for unknown', () => {
    expect(normalizeDirection('xyz')).toBeNull();
  });
});

describe('normalizeDate', () => {
  it('parses ISO', () => {
    expect(normalizeDate('2024-03-15', 'AMBIGUOUS')).toBe('2024-03-15 00:00');
  });
  it('uses DD/MM when told', () => {
    expect(normalizeDate('03/04/2024', 'DD/MM')).toBe('2024-04-03 00:00');
  });
  it('uses MM/DD when told', () => {
    expect(normalizeDate('03/04/2024', 'MM/DD')).toBe('2024-03-04 00:00');
  });
  it('parses Excel serial', () => {
    const r = normalizeDate(45000, 'AMBIGUOUS');
    expect(r).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});

describe('normalizeDateColumn', () => {
  it('detects DD/MM and normalizes all rows', () => {
    const r = normalizeDateColumn(['15/03/2024', '20/06/2024', '01/12/2024']);
    expect(r.format).toBe('DD/MM');
    expect(r.values[0]).toBe('2024-03-15 00:00');
  });
  it('flags conflicting columns', () => {
    const r = normalizeDateColumn(['15/03/2024', '03/15/2024']);
    expect(r.flag).toBe('date_conflict');
  });
});

describe('isNull', () => {
  it('detects null tokens', () => {
    expect(isNull('-')).toBe(true);
    expect(isNull('N/A')).toBe(true);
    expect(isNull('')).toBe(true);
    expect(isNull(null)).toBe(true);
    expect(isNull('hello')).toBe(false);
  });
});
