/**
 * Stage 7 — smoke tests for the non-React active-portfolio store. This is
 * the bridge between React context and the storage layer; if it lies, locked
 * portfolios become writable.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  setActivePortfolioIdGlobal,
  getActivePortfolioIdGlobal,
  setLockedPortfolioIdsGlobal,
  isPortfolioLockedGlobal,
  isActivePortfolioLockedGlobal,
} from '@/lib/active-portfolio-store';

describe('active-portfolio-store', () => {
  beforeEach(() => {
    setActivePortfolioIdGlobal(null);
    setLockedPortfolioIdsGlobal(new Set());
  });

  it('round-trips the active portfolio id', () => {
    expect(getActivePortfolioIdGlobal()).toBeNull();
    setActivePortfolioIdGlobal('p1');
    expect(getActivePortfolioIdGlobal()).toBe('p1');
  });

  it('reports lock state per id', () => {
    setLockedPortfolioIdsGlobal(new Set(['p2', 'p3']));
    expect(isPortfolioLockedGlobal('p1')).toBe(false);
    expect(isPortfolioLockedGlobal('p2')).toBe(true);
    expect(isPortfolioLockedGlobal(null)).toBe(false);
    expect(isPortfolioLockedGlobal(undefined)).toBe(false);
  });

  it('isActivePortfolioLockedGlobal follows the active id', () => {
    setLockedPortfolioIdsGlobal(new Set(['p2']));
    setActivePortfolioIdGlobal('p1');
    expect(isActivePortfolioLockedGlobal()).toBe(false);
    setActivePortfolioIdGlobal('p2');
    expect(isActivePortfolioLockedGlobal()).toBe(true);
  });
});
