/**
 * Stage 7 — smoke tests for the Multi-Portfolio limit + lock engine.
 *
 * These guard the two product rules we agreed on:
 *   - Tier caps: standard=2, advanced=3, ultimate=10.
 *   - Downgrade behavior: extras become read-only; default + oldest stay editable.
 */
import { describe, it, expect } from 'vitest';
import {
  PORTFOLIO_LIMITS,
  computeLockedPortfolioIds,
  canCreatePortfolio,
  getPortfolioLimit,
} from '@/lib/portfolio-limits';
import type { Portfolio } from '@/hooks/use-portfolios';

const mk = (overrides: Partial<Portfolio>): Portfolio => ({
  id: overrides.id || crypto.randomUUID(),
  user_id: 'u1',
  name: overrides.name || 'P',
  currency: 'USD',
  starting_balance: 0,
  color: null,
  icon: null,
  is_default: false,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('portfolio-limits — tier caps', () => {
  it('exposes the agreed plan caps', () => {
    expect(PORTFOLIO_LIMITS).toEqual({ standard: 2, advanced: 3, ultimate: 10 });
  });

  it('getPortfolioLimit falls back to standard for unknown tier', () => {
    expect(getPortfolioLimit('standard')).toBe(2);
    expect(getPortfolioLimit('advanced')).toBe(3);
    expect(getPortfolioLimit('ultimate')).toBe(10);
  });
});

describe('portfolio-limits — canCreatePortfolio', () => {
  it('allows up to the cap and blocks at the cap', () => {
    const one = [mk({ id: 'a' })];
    const two = [mk({ id: 'a' }), mk({ id: 'b' })];
    expect(canCreatePortfolio(one, 'standard')).toBe(true);
    expect(canCreatePortfolio(two, 'standard')).toBe(false);
    expect(canCreatePortfolio(two, 'advanced')).toBe(true);
  });
});

describe('portfolio-limits — computeLockedPortfolioIds', () => {
  it('returns an empty set when within the cap', () => {
    const portfolios = [mk({ id: 'a' }), mk({ id: 'b' })];
    expect(computeLockedPortfolioIds(portfolios, 'standard').size).toBe(0);
  });

  it('locks the extras on downgrade, keeping default + oldest editable', () => {
    // 4 portfolios, downgrade to standard (cap=2). Default + the oldest non-default stay editable.
    const portfolios = [
      mk({ id: 'newest', sort_order: 3, created_at: '2026-06-01T00:00:00Z' }),
      mk({ id: 'older',  sort_order: 1, created_at: '2026-02-01T00:00:00Z' }),
      mk({ id: 'middle', sort_order: 2, created_at: '2026-03-01T00:00:00Z' }),
      mk({ id: 'default', is_default: true, sort_order: 0, created_at: '2026-01-01T00:00:00Z' }),
    ];
    const locked = computeLockedPortfolioIds(portfolios, 'standard');
    expect(locked.has('default')).toBe(false); // default always editable
    expect(locked.has('older')).toBe(false);   // oldest non-default editable
    expect(locked.has('middle')).toBe(true);
    expect(locked.has('newest')).toBe(true);
    expect(locked.size).toBe(2);
  });

  it('advanced cap=3 unlocks one more vs standard', () => {
    const portfolios = [
      mk({ id: 'a', is_default: true, sort_order: 0 }),
      mk({ id: 'b', sort_order: 1 }),
      mk({ id: 'c', sort_order: 2 }),
      mk({ id: 'd', sort_order: 3 }),
    ];
    expect(computeLockedPortfolioIds(portfolios, 'advanced')).toEqual(new Set(['d']));
    expect(computeLockedPortfolioIds(portfolios, 'ultimate').size).toBe(0);
  });
});
