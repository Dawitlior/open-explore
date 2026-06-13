// UIE v1.2 — Phase 2 · Step 1 · Content Profiler tests
import { describe, it, expect } from 'vitest';
import { profileColumn, confirmsPendingField } from '../content/profile';

describe('profileColumn', () => {
  it('detects currency with $ symbol', () => {
    const p = profileColumn(['$1,250.50', '$-300.00', '$45.10']);
    expect(p.type).toBe('currency');
    expect(p.flags).toContain('has_currency_symbol');
  });

  it('detects percent by suffix', () => {
    const p = profileColumn(['12.5%', '-3.2%', '0.5%']);
    expect(p.type).toBe('percent');
  });

  it('detects r-multiple by R suffix', () => {
    const p = profileColumn(['1.2R', '-1R', '2.5R', '-0.5R']);
    expect(p.type).toBe('r-multiple');
  });

  it('detects r-multiple by header hint + tight range', () => {
    const p = profileColumn(['1.5', '-1', '2.3', '-0.7', '0.8'], 'R Multiple');
    expect(p.type).toBe('r-multiple');
  });

  it('detects date column', () => {
    const p = profileColumn(['2024-01-15', '2024-02-20', '15/03/2024']);
    expect(p.type).toBe('date');
  });

  it('detects direction enum', () => {
    const p = profileColumn(['Long', 'Short', 'long', 'SHORT', 'Long']);
    expect(p.type).toBe('enum');
    expect(p.enumMeta?.isDirection).toBe(true);
  });

  it('detects Hebrew direction enum', () => {
    const p = profileColumn(['לונג', 'שורט', 'לונג']);
    expect(p.type).toBe('enum');
    expect(p.enumMeta?.isDirection).toBe(true);
  });

  it('handles European decimals', () => {
    const p = profileColumn(['1.234,56', '2.500,00', '-1.250,25']);
    expect(p.type).toBe('numeric');
    expect(p.flags).toContain('european_decimal');
  });

  it('handles parenthetical negatives', () => {
    const p = profileColumn(['(125.50)', '300.00', '(75.25)']);
    expect(p.type).toBe('numeric');
    expect(p.numericMeta?.hasNegative).toBe(true);
  });

  it('returns empty for null tokens only', () => {
    const p = profileColumn(['-', 'N/A', '', null, '—']);
    expect(p.type).toBe('empty');
  });

  it('returns mixed when content is heterogeneous', () => {
    const p = profileColumn(['hello', '123', 'world', '456', 'foo', 'bar', '789', 'baz', 'qux', 'a', 'b']);
    expect(['mixed', 'string']).toContain(p.type);
  });

  it('confirms pending rMultiple field from r-multiple profile', () => {
    const p = profileColumn(['1.2R', '-1R', '2.5R']);
    expect(confirmsPendingField('rMultiple', p)).toBe(true);
  });

  it('confirms pending riskPct from percent profile', () => {
    const p = profileColumn(['1.5%', '2.0%', '0.5%']);
    expect(confirmsPendingField('riskPct', p)).toBe(true);
  });

  it('rejects pending rMultiple when profile is currency', () => {
    const p = profileColumn(['$1,250', '$300', '$45']);
    expect(confirmsPendingField('rMultiple', p)).toBe(false);
  });
});
