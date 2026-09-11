/**
 * useSubscription — live Stripe subscription state for the signed-in trader.
 *
 * Calls the `check-subscription` edge function on mount, on auth change and
 * whenever the window regains focus (so a completed Stripe checkout in another
 * tab reflects immediately). Also exposes checkout + billing-portal launchers.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import type { AppTier } from '@/hooks/use-entitlement';

export interface SubscriptionState {
  subscribed: boolean;
  tier: AppTier;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  startCheckout: (tier: Exclude<AppTier, 'standard'>) => Promise<void>;
  openPortal: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [tier, setTier] = useState<AppTier>('standard');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSubscribed(false);
      setTier('standard');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (!error && data) {
        setSubscribed(Boolean(data.subscribed));
        setTier((data.tier as AppTier) ?? 'standard');
        setCurrentPeriodEnd(data.current_period_end ?? null);
        setCancelAtPeriodEnd(Boolean(data.cancel_at_period_end));
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const startCheckout = useCallback(async (target: Exclude<AppTier, 'standard'>) => {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { tier: target },
    });
    if (error || !data?.url) throw new Error(error?.message ?? 'checkout_failed');
    window.open(data.url as string, '_blank', 'noopener,noreferrer');
  }, []);

  const openPortal = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('customer-portal');
    if (error || !data?.url) throw new Error(error?.message ?? 'portal_failed');
    window.open(data.url as string, '_blank', 'noopener,noreferrer');
  }, []);

  return { subscribed, tier, currentPeriodEnd, cancelAtPeriodEnd, loading, refresh, startCheckout, openPortal };
}
