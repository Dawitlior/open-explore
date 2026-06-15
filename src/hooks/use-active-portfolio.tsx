/**
 * ActivePortfolioProvider — Stages 3-5 of Multi-Portfolio plan.
 *
 * Stage 3: owns the global "active portfolio" identity, persists to LS.
 * Stage 4: keeps the non-React storage layer in sync via a module singleton.
 * Stage 5: enforces tier limits on create, computes the read-only "locked"
 *          portfolio set on downgrade, and exposes it to UI + storage layer.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  usePortfolios,
  type Portfolio,
  type PortfolioDraft,
} from '@/hooks/use-portfolios';
import { useAuth } from '@/hooks/use-auth';
import { useEntitlement, type AppTier } from '@/hooks/use-entitlement';
import {
  setActivePortfolioIdGlobal,
  setLockedPortfolioIdsGlobal,
} from '@/lib/active-portfolio-store';
import {
  computeLockedPortfolioIds,
  getPortfolioLimit,
  canCreatePortfolio,
} from '@/lib/portfolio-limits';

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
  // Stage 5 — limits & lock state
  tier: AppTier;
  tierMax: number;
  lockedIds: Set<string>;
  isPortfolioLocked: (id: string | null | undefined) => boolean;
  isActivePortfolioLocked: boolean;
  canCreate: boolean;
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
  const { tier, loading: tierLoading } = useEntitlement();
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
    // Push to the non-React singleton AND notify consumers (useTrades, etc.)
    // immediately — otherwise the very first dashboard paint after login on a
    // fresh device renders with pid=null and shows zero trades until the user
    // manually switches portfolio.
    setActivePortfolioIdGlobal(fallback);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orca:active-portfolio-changed', { detail: { id: fallback } }));
    }
  }, [loading, portfolios, activePortfolioId]);

  // Stage 5 — compute locked set whenever tier or portfolios change.
  // While the tier is still resolving we defer to "no locks" rather than
  // risk briefly locking portfolios for an Ultimate user (whose tier defaults
  // to 'standard' for one tick before the RPC returns).
  const lockedIds = useMemo(
    () => (tierLoading ? new Set<string>() : computeLockedPortfolioIds(portfolios, tier)),
    [portfolios, tier, tierLoading],
  );
  const tierMax = useMemo(() => getPortfolioLimit(tier), [tier]);
  const canCreate = useMemo(
    () => (tierLoading ? false : canCreatePortfolio(portfolios, tier)),
    [portfolios, tier, tierLoading],
  );

  // Push lock state to the non-React singleton so storage can enforce.
  useEffect(() => {
    setLockedPortfolioIdsGlobal(lockedIds);
  }, [lockedIds]);

  // Keep the global active-id singleton in sync.
  useEffect(() => {
    setActivePortfolioIdGlobal(activePortfolioId);
  }, [activePortfolioId]);

  const setActivePortfolioId = useCallback((id: string) => {
    setActiveState(id);
    writeStoredId(id);
    setActivePortfolioIdGlobal(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orca:active-portfolio-changed', { detail: { id } }));
    }
  }, []);

  const wrappedCreate = useCallback(
    async (draft: PortfolioDraft) => {
      // Hard-stop at tier limit. UI also disables the button, but enforce here too.
      if (!canCreatePortfolio(portfolios, tier)) {
        console.warn('[portfolios] create blocked — tier limit reached', { tier, count: portfolios.length });
        return null;
      }
      const created = await createPortfolio(draft);
      if (created) setActivePortfolioId(created.id);
      return created;
    },
    [createPortfolio, setActivePortfolioId, portfolios, tier],
  );

  const wrappedDelete = useCallback(
    async (id: string) => {
      const ok = await deletePortfolio(id);
      if (ok && id === activePortfolioId) {
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

  const isPortfolioLocked = useCallback(
    (id: string | null | undefined) => !!id && lockedIds.has(id),
    [lockedIds],
  );

  const isActivePortfolioLocked = useMemo(
    () => isPortfolioLocked(activePortfolioId),
    [isPortfolioLocked, activePortfolioId],
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
      tier,
      tierMax,
      lockedIds,
      isPortfolioLocked,
      isActivePortfolioLocked,
      canCreate,
    }),
    [portfolios, loading, error, activePortfolioId, activePortfolio, setActivePortfolioId, refresh, wrappedCreate, updatePortfolio, wrappedDelete, setDefault, tier, tierMax, lockedIds, isPortfolioLocked, isActivePortfolioLocked, canCreate],
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

export function useActivePortfolioOptional(): ActivePortfolioContextValue | null {
  return useContext(ActivePortfolioContext);
}
