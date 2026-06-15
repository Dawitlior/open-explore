/**
 * ActivePortfolioProvider — Stage 3 of Multi-Portfolio plan.
 *
 * Owns the global "active portfolio" identity and exposes the portfolios CRUD
 * to every consumer through one context. Persists the active portfolio id to
 * localStorage so the choice survives reload.
 *
 * What this stage does NOT do yet:
 *  - Filter trades/journal/charts by activePortfolioId (Stage 4)
 *  - Enforce plan tier limits when creating portfolios (Stage 5)
 *  - Wire the active portfolio into the UIE import preflight (Stage 6)
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  usePortfolios,
  type Portfolio,
  type PortfolioDraft,
} from '@/hooks/use-portfolios';
import { useAuth } from '@/hooks/use-auth';
import { setActivePortfolioIdGlobal } from '@/lib/active-portfolio-store';

const LS_KEY = 'orca.activePortfolioId';

interface ActivePortfolioContextValue {
  portfolios: Portfolio[];
  loading: boolean;
  error: string | null;
  activePortfolioId: string | null;
  activePortfolio: Portfolio | null;
  setActivePortfolioId: (id: string) => void;
  refresh: () => Promise<void>;
  createPortfolio: (draft: PortfolioDraft) => Promise<Portfolio | null>;
  updatePortfolio: (id: string, patch: Partial<PortfolioDraft>) => Promise<Portfolio | null>;
  deletePortfolio: (id: string) => Promise<boolean>;
  setDefault: (id: string) => Promise<boolean>;
}

const ActivePortfolioContext = createContext<ActivePortfolioContextValue | null>(null);

function readStoredId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}

function writeStoredId(id: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (id) window.localStorage.setItem(LS_KEY, id);
    else window.localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

export function ActivePortfolioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const {
    portfolios,
    loading,
    error,
    refresh,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    setDefault,
  } = usePortfolios();

  const [activePortfolioId, setActiveState] = useState<string | null>(readStoredId);

  // Reset on user change (sign in / sign out)
  useEffect(() => {
    if (!user) {
      setActiveState(null);
      writeStoredId(null);
    }
  }, [user]);

  // Resolve / repair active id once portfolios load.
  useEffect(() => {
    if (loading || portfolios.length === 0) return;
    const stillValid = activePortfolioId && portfolios.some((p) => p.id === activePortfolioId);
    if (stillValid) return;
    const fallback =
      portfolios.find((p) => p.is_default)?.id ??
      portfolios[0].id;
    setActiveState(fallback);
    writeStoredId(fallback);
  }, [loading, portfolios, activePortfolioId]);

  // Keep the global singleton in sync with the React state so non-React
  // code (storage layer) can read it synchronously.
  useEffect(() => {
    setActivePortfolioIdGlobal(activePortfolioId);
  }, [activePortfolioId]);

  const setActivePortfolioId = useCallback((id: string) => {
    setActiveState(id);
    writeStoredId(id);
    setActivePortfolioIdGlobal(id);
    // Stage 4 hook point: anyone caching trades can listen to this and refetch.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orca:active-portfolio-changed', { detail: { id } }));
    }
  }, []);

  const wrappedCreate = useCallback(
    async (draft: PortfolioDraft) => {
      const created = await createPortfolio(draft);
      if (created) setActivePortfolioId(created.id);
      return created;
    },
    [createPortfolio, setActivePortfolioId],
  );

  const wrappedDelete = useCallback(
    async (id: string) => {
      const ok = await deletePortfolio(id);
      if (ok && id === activePortfolioId) {
        // Fall back to default (or first remaining) on next load cycle
        const next = portfolios.find((p) => p.id !== id && p.is_default) ?? portfolios.find((p) => p.id !== id);
        if (next) setActivePortfolioId(next.id);
      }
      return ok;
    },
    [deletePortfolio, activePortfolioId, portfolios, setActivePortfolioId],
  );

  const activePortfolio = useMemo(
    () => portfolios.find((p) => p.id === activePortfolioId) ?? null,
    [portfolios, activePortfolioId],
  );

  const value = useMemo<ActivePortfolioContextValue>(
    () => ({
      portfolios,
      loading,
      error,
      activePortfolioId,
      activePortfolio,
      setActivePortfolioId,
      refresh,
      createPortfolio: wrappedCreate,
      updatePortfolio,
      deletePortfolio: wrappedDelete,
      setDefault,
    }),
    [portfolios, loading, error, activePortfolioId, activePortfolio, setActivePortfolioId, refresh, wrappedCreate, updatePortfolio, wrappedDelete, setDefault],
  );

  return <ActivePortfolioContext.Provider value={value}>{children}</ActivePortfolioContext.Provider>;
}

export function useActivePortfolio(): ActivePortfolioContextValue {
  const ctx = useContext(ActivePortfolioContext);
  if (!ctx) {
    throw new Error('useActivePortfolio must be used inside <ActivePortfolioProvider>');
  }
  return ctx;
}

/**
 * Soft variant — safe to call outside the provider. Returns null when no
 * active portfolio context exists yet (used by components that may render
 * on the landing page before the provider mounts).
 */
export function useActivePortfolioOptional(): ActivePortfolioContextValue | null {
  return useContext(ActivePortfolioContext);
}
