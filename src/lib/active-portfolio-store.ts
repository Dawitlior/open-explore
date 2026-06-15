/**
 * active-portfolio-store — module-level singleton for the active portfolio id.
 *
 * Why a singleton outside React: the storage layer (src/lib/storage.ts) and
 * other non-React utilities need to know which portfolio is active without
 * depending on React context. The ActivePortfolioProvider pushes updates here
 * on every change; storage reads it synchronously when building rows.
 */

let activeId: string | null = null;

export function setActivePortfolioIdGlobal(id: string | null) {
  activeId = id;
}

export function getActivePortfolioIdGlobal(): string | null {
  return activeId;
}
