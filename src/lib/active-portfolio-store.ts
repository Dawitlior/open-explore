/**
 * active-portfolio-store — module-level singletons for the active portfolio.
 *
 * Why a singleton outside React: the storage layer (src/lib/storage.ts) and
 * other non-React utilities need to know which portfolio is active and which
 * portfolios are locked (Stage 5 read-only on downgrade) without depending
 * on React context. The ActivePortfolioProvider pushes updates here on every
 * change; storage reads them synchronously when building / mutating rows.
 */

// Hydrate synchronously from localStorage so the FIRST call to
// getAllTrades() (which runs inside useTrades's useEffect, BEFORE the
// ActivePortfolioProvider's effect can push the id here) already has the
// right portfolio. Without this, the dashboard briefly reads with pid=null
// and gets an empty list — which is what made trades "disappear on refresh".
const LS_KEY = 'orca.activePortfolioId';
let activeId: string | null = (() => {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(LS_KEY); } catch { return null; }
})();
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
