/**
 * useEntitlement — resolves the active user's effective tier via the
 * `current_entitlement(user_id)` RPC. Cached for the session; revalidates
 * on auth changes. Returns `'standard'` as a safe default while loading
 * or if anonymous, so gating fails closed (locks Advanced/Ultimate).
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { ENFORCE_TIER_GATES } from '@/lib/billing-flags';

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

const PREVIEW_TIER_KEY = 'orca:tier-preview';

function readPreviewTier(): AppTier | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(PREVIEW_TIER_KEY);
  return value === 'standard' || value === 'advanced' || value === 'ultimate' ? value : null;
}

export function useEntitlement(): EntitlementState {
  const { user } = useAuth();
  const [entitlementTier, setEntitlementTier] = useState<AppTier>('standard');
  const [previewTier, setPreviewTier] = useState<AppTier | null>(() => readPreviewTier());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ENFORCE_TIER_GATES || typeof window === 'undefined') return;
    const onPreviewChange = () => setPreviewTier(readPreviewTier());
    window.addEventListener('orca:tier-preview-changed', onPreviewChange);
    window.addEventListener('storage', onPreviewChange);
    return () => {
      window.removeEventListener('orca:tier-preview-changed', onPreviewChange);
      window.removeEventListener('storage', onPreviewChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setEntitlementTier('standard');
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .rpc('current_entitlement', { p_user: user.id })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setEntitlementTier(data as AppTier);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const tier = !ENFORCE_TIER_GATES && previewTier ? previewTier : entitlementTier;

  return {
    tier,
    loading,
    allows: (required) => TIER_RANK[tier] >= TIER_RANK[required],
  };
}
