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

/* ──────────────────────────────────────────────────────────────
 * Shared entitlement store.
 *
 * Every component used to hold its own copy of the plan, starting at
 * 'free' + loading and re-querying on mount. Switching channels therefore
 * remounted gated pages and flashed the Free deck for a few frames before
 * the Pro answer arrived. The plan is now resolved ONCE per session, cached
 * in memory + sessionStorage, and broadcast to all subscribers — so a
 * remount reads the already-known plan synchronously.
 * ────────────────────────────────────────────────────────────── */
const CACHE_KEY = 'orca:entitlement-cache';

interface Snapshot {
  userId: string | null;
  tier: AppTier;
  resolved: boolean;
}

function readCache(): Snapshot {
  if (typeof window === 'undefined') return { userId: null, tier: 'free', resolved: false };
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return { userId: null, tier: 'free', resolved: false };
    const parsed = JSON.parse(raw) as { userId?: string; tier?: string };
    return {
      userId: parsed.userId ?? null,
      tier: normalizeEntitlement(parsed.tier),
      resolved: Boolean(parsed.userId),
    };
  } catch {
    return { userId: null, tier: 'free', resolved: false };
  }
}

let snapshot: Snapshot = readCache();
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setSnapshot(next: Snapshot) {
  if (snapshot.userId === next.userId && snapshot.tier === next.tier && snapshot.resolved === next.resolved) return;
  snapshot = next;
  if (typeof window !== 'undefined' && next.userId) {
    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ userId: next.userId, tier: next.tier }));
    } catch { /* storage may be unavailable */ }
  }
  emit();
}

async function fetchEntitlement(userId: string, force: boolean) {
  if (!force && snapshot.resolved && snapshot.userId === userId) return;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const { data, error } = await supabase.rpc('current_entitlement', { p_user: userId });
    if (!error && data) {
      setSnapshot({ userId, tier: normalizeEntitlement(data as string), resolved: true });
    } else {
      setSnapshot({ ...snapshot, userId, resolved: true });
    }
  })();
  try { await inFlight; } finally { inFlight = null; }
}

export function useEntitlement(): EntitlementState {
  const { user } = useAuth();
  const [snap, setSnap] = useState<Snapshot>(snapshot);
  const [previewTier, setPreviewTier] = useState<AppTier | null>(() => readPreviewTier());

  useEffect(() => {
    const listener = () => setSnap(snapshot);
    listeners.add(listener);
    listener();
    return () => { listeners.delete(listener); };
  }, []);

  const matchesUser = Boolean(user?.id) && snap.userId === user?.id;
  const entitlementTier = matchesUser ? snap.tier : 'free';
  // Only "loading" when we have no cached answer for this exact user yet.
  const loading = Boolean(user?.id) && !(matchesUser && snap.resolved);


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

  const refreshEntitlement = useCallback(async (force = false) => {
    if (!user?.id) {
      setSnapshot({ userId: null, tier: 'free', resolved: false });
      return;
    }
    await fetchEntitlement(user.id, force);
  }, [user?.id]);

  useEffect(() => { void refreshEntitlement(false); }, [refreshEntitlement]);

  useEffect(() => {
    const refresh = () => { void refreshEntitlement(true); };
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
