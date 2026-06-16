/**
 * use-portfolios — Stage 1 of Multi-Portfolio plan.
 *
 * Provides CRUD over the `portfolios` table. Does NOT yet:
 *  - associate trades to portfolios (Stage 2 — migration)
 *  - drive an active-portfolio global state (Stage 3)
 *  - filter views (Stage 4)
 *  - enforce plan limits (Stage 5)
 *
 * Plan tier portfolio limits (from master plan §6 + open-questions resolution):
 *   beginner: 2, advanced: 3, ultimate: 10
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { deletePortfolioTrades } from '@/lib/storage';

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  starting_balance: number;
  color: string | null;
  icon: string | null;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type PortfolioDraft = {
  name: string;
  currency?: string;
  starting_balance?: number;
  color?: string | null;
  icon?: string | null;
  is_default?: boolean;
  sort_order?: number;
};

export const PORTFOLIO_LIMITS = {
  beginner: 2,
  advanced: 3,
  ultimate: 10,
} as const;

export type PlanTier = keyof typeof PORTFOLIO_LIMITS;

export function getPortfolioLimit(tier: PlanTier | string | null | undefined): number {
  if (!tier) return PORTFOLIO_LIMITS.beginner;
  return (PORTFOLIO_LIMITS as Record<string, number>)[tier] ?? PORTFOLIO_LIMITS.beginner;
}

interface UsePortfoliosResult {
  portfolios: Portfolio[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createPortfolio: (draft: PortfolioDraft) => Promise<Portfolio | null>;
  updatePortfolio: (id: string, patch: Partial<PortfolioDraft>) => Promise<Portfolio | null>;
  deletePortfolio: (id: string) => Promise<boolean>;
  resetPortfolio: (id: string) => Promise<boolean>;
  setDefault: (id: string) => Promise<boolean>;
}

export function usePortfolios(): UsePortfoliosResult {
  const { user } = useAuth();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setPortfolios([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('portfolios')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (err) {
      console.error('[portfolios] fetch failed', err);
      setError(err.message);
      setPortfolios([]);
    } else {
      setPortfolios((data as Portfolio[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const createPortfolio = useCallback(
    async (draft: PortfolioDraft): Promise<Portfolio | null> => {
      if (!user) return null;
      const payload = {
        user_id: user.id,
        name: draft.name.trim(),
        currency: draft.currency ?? 'USD',
        starting_balance: draft.starting_balance ?? 0,
        color: draft.color ?? null,
        icon: draft.icon ?? null,
        is_default: draft.is_default ?? false,
        sort_order: draft.sort_order ?? portfolios.length,
      };
      const { data, error: err } = await supabase
        .from('portfolios')
        .insert(payload)
        .select('*')
        .single();
      if (err) {
        console.error('[portfolios] create failed', err);
        setError(err.message);
        return null;
      }
      await fetchAll();
      return data as Portfolio;
    },
    [user, portfolios.length, fetchAll],
  );

  const updatePortfolio = useCallback(
    async (id: string, patch: Partial<PortfolioDraft>): Promise<Portfolio | null> => {
      if (!user) return null;
      const { data, error: err } = await supabase
        .from('portfolios')
        .update(patch)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (err) {
        console.error('[portfolios] update failed', err);
        setError(err.message);
        return null;
      }
      await fetchAll();
      return data as Portfolio;
    },
    [user, fetchAll],
  );

  const deletePortfolio = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;
      const { error: err } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (err) {
        console.error('[portfolios] delete failed', err);
        setError(err.message);
        return false;
      }
      await fetchAll();
      return true;
    },
    [user, fetchAll],
  );

  const resetPortfolio = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;
      try {
        await deletePortfolioTrades(id);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('orca:trades-synced', { detail: { portfolioId: id } }));
        }
        return true;
      } catch (err) {
        console.error('[portfolios] reset failed', err);
        setError(err instanceof Error ? err.message : 'reset_failed');
        return false;
      }
    },
    [user],
  );

  const setDefault = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;
      // The DB has a partial unique index enforcing one default per user.
      // Clear any current default first, then set the new one.
      const { error: clearErr } = await supabase
        .from('portfolios')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true);
      if (clearErr) {
        console.error('[portfolios] clear default failed', clearErr);
        setError(clearErr.message);
        return false;
      }
      const { error: setErr } = await supabase
        .from('portfolios')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', user.id);
      if (setErr) {
        console.error('[portfolios] set default failed', setErr);
        setError(setErr.message);
        return false;
      }
      await fetchAll();
      return true;
    },
    [user, fetchAll],
  );

  return {
    portfolios,
    loading,
    error,
    refresh: fetchAll,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    resetPortfolio,
    setDefault,
  };
}
