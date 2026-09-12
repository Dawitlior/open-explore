/**
 * useEntitlement — resolves the active user's effective plan.
 *
 * The product has exactly TWO plans:
 *   • 'free' — everything that used to be Standard + Advanced
 *   • 'pro'  — everything that used to be Ultimate
 *
 * The database enum (`app_tier`) still stores the legacy values
 * standard | advanced | ultimate. We normalize on read:
 *   standard            → free
 *   advanced | ultimate → pro   (paying users never lose access)
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { ENFORCE_TIER_GATES } from '@/lib/billing-flags';

export type AppTier = 'free' | 'pro';

/** Legacy values that may still appear in the DB / old localStorage / props. */
export type LegacyTier = 'standard' | 'advanced' | 'ultimate';

const TIER_RANK: Record<AppTier, number> = { free: 0, pro: 1 };

/** DB / subscription value → app plan. Paid legacy tiers map to Pro. */
export function normalizeEntitlement(value: string | null | undefined): AppTier {
  if (value === 'pro' || value === 'ultimate' || value === 'advanced') return 'pro';
  return 'free';
}

/**
 * Requirement value → app plan. Used by <TierGate required="…"> and the chart
 * registry: content that used to require Advanced is now free.
 */
export function normalizeRequirement(value: string | null | undefined): AppTier {
  if (value === 'pro' || value === 'ultimate') return 'pro';
  return 'free';
}

export interface EntitlementState {
  tier: AppTier;
  loading: boolean;
  /** True if user's plan >= required */
  allows: (required: AppTier | LegacyTier) => boolean;
}

const PREVIEW_TIER_KEY = 'orca:tier-preview';

function readPreviewTier(): AppTier | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(PREVIEW_TIER_KEY);
  if (!value) return null;
  if (value === 'free' || value === 'standard') return 'free';
  if (value === 'pro' || value === 'ultimate' || value === 'advanced') return 'pro';
  return null;
}

export function useEntitlement(): EntitlementState {
  const { user } = useAuth();
  const [entitlementTier, setEntitlementTier] = useState<AppTier>('free');
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

  const refreshEntitlement = useCallback(async () => {
    if (!user?.id) {
      setEntitlementTier('free');
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('current_entitlement', { p_user: user.id });
    if (!error && data) setEntitlementTier(normalizeEntitlement(data as string));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void refreshEntitlement(); }, [refreshEntitlement]);

  useEffect(() => {
    const refresh = () => { void refreshEntitlement(); };
    window.addEventListener('orca:entitlement-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('orca:entitlement-changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refreshEntitlement]);

  const usingPreview = !ENFORCE_TIER_GATES && previewTier !== null;
  const tier = usingPreview ? (previewTier as AppTier) : entitlementTier;

  return {
    tier,
    loading: usingPreview ? false : loading,
    allows: (required) => TIER_RANK[tier] >= TIER_RANK[normalizeRequirement(required)],
  };

}
