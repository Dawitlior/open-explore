/**
 * useEntitlement — resolves the active user's effective tier via the
 * `current_entitlement(user_id)` RPC. Cached for the session; revalidates
 * on auth changes. Returns `'standard'` as a safe default while loading
 * or if anonymous, so gating fails closed (locks Advanced/Ultimate).
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

export type AppTier = 'standard' | 'advanced' | 'ultimate';

const TIER_RANK: Record<AppTier, number> = {
  standard: 0,
  advanced: 1,
  ultimate: 2,
};

export interface EntitlementState {
  tier: AppTier;
  loading: boolean;
  /** True if user's tier >= required */
  allows: (required: AppTier) => boolean;
}

export function useEntitlement(): EntitlementState {
  const { user } = useAuth();
  const [tier, setTier] = useState<AppTier>('standard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setTier('standard');
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .rpc('current_entitlement', { p_user: user.id })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setTier(data as AppTier);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  return {
    tier,
    loading,
    allows: (required) => TIER_RANK[tier] >= TIER_RANK[required],
  };
}
