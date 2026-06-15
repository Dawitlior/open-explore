/**
 * active-portfolio-store — module-level singletons for the active portfolio.
 *
 * Why a singleton outside React: the storage layer (src/lib/storage.ts) and
 * other non-React utilities need to know which portfolio is active and which
 * portfolios are locked (Stage 5 read-only on downgrade) without depending
 * on React context. The ActivePortfolioProvider pushes updates here on every
 * change; storage reads them synchronously when building / mutating rows.
 */

let activeId: string | null = null;
let lockedIds: Set<string> = new Set();

export function setActivePortfolioIdGlobal(id: string | null) {
  activeId = id;
}

export function getActivePortfolioIdGlobal(): string | null {
  return activeId;
}

export function setLockedPortfolioIdsGlobal(ids: Set<string>) {
  lockedIds = new Set(ids);
}

export function isPortfolioLockedGlobal(id: string | null | undefined): boolean {
  if (!id) return false;
  return lockedIds.has(id);
}

export function isActivePortfolioLockedGlobal(): boolean {
  return isPortfolioLockedGlobal(activeId);
}
