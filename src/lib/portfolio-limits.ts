/**
 * Stage 5 — Multi-Portfolio plan limits & read-only lock.
 *
 * Plan caps (master plan §9, user decision):
 *   standard  → 2 portfolios
 *   advanced  → 3 portfolios
 *   ultimate  → 10 portfolios
 *
 * Downgrade behavior (user decision): existing portfolios are NEVER deleted.
 * When a user has more portfolios than their current tier allows, the
 * "extra" portfolios are locked to READ-ONLY. The user can still view them
 * and switch between them; they just cannot create / edit / delete trades
 * in a locked portfolio, and cannot rename / delete the portfolio itself.
 *
 * Lock priority (which portfolios stay editable on downgrade):
 *   1. Default portfolio first (always editable if it exists).
 *   2. Then by sort_order ASC.
 *   3. Then by created_at ASC (older wins).
 * The first `tierMax` portfolios in that order remain editable; the rest
 * are locked.
 */
import type { AppTier } from '@/hooks/use-entitlement';
import type { Portfolio } from '@/hooks/use-portfolios';

export const PORTFOLIO_LIMITS: Record<AppTier, number> = {
  standard: 2,
  advanced: 3,
  ultimate: 10,
};

export function getPortfolioLimit(tier: AppTier): number {
  return PORTFOLIO_LIMITS[tier] ?? PORTFOLIO_LIMITS.standard;
}

/**
 * Returns the ordered list of portfolio ids that should remain editable
 * given the current tier. Anything not in this set is read-only.
 */
export function computeLockedPortfolioIds(
  portfolios: Portfolio[],
  tier: AppTier,
): Set<string> {
  const limit = getPortfolioLimit(tier);
  if (portfolios.length <= limit) return new Set();

  const sorted = [...portfolios].sort((a, b) => {
    // Default first
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    // Then sort_order
    const sa = a.sort_order ?? 0;
    const sb = b.sort_order ?? 0;
    if (sa !== sb) return sa - sb;
    // Then created_at (older first)
    const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
    const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ca - cb;
  });

  const locked = new Set<string>();
  for (let i = limit; i < sorted.length; i++) {
    locked.add(sorted[i].id);
  }
  return locked;
}

export function canCreatePortfolio(
  portfolios: Portfolio[],
  tier: AppTier,
): boolean {
  return portfolios.length < getPortfolioLimit(tier);
}
