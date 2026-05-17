import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserPreferences = {
  theme: string;
  daily_risk_limit: number;
  weekly_risk_limit: number;
  monthly_risk_limit: number;
  risk_per_trade_default: number;
};

export const DEFAULT_PREFS: UserPreferences = {
  theme: 'orca-neon',
  daily_risk_limit: 100,
  weekly_risk_limit: 400,
  monthly_risk_limit: 1500,
  risk_per_trade_default: 20,
};

// In-memory cache so synchronous helpers (chart aggregations) can read
// the daily risk limit without async plumbing through every component.
let _cache: UserPreferences = { ...DEFAULT_PREFS };
const listeners = new Set<(p: UserPreferences) => void>();

export function getCachedPreferences(): UserPreferences {
  return _cache;
}

export function getDailyRiskLimit(): number {
  const v = Number(_cache.daily_risk_limit);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_PREFS.daily_risk_limit;
}

function setCache(p: UserPreferences) {
  _cache = p;
  listeners.forEach(fn => fn(p));
}

export function useUserPreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(_cache);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fn = (p: UserPreferences) => setPrefs(p);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoaded(true); return; }
      const { data, error } = await supabase
        .from('user_preferences')
        .select('theme, daily_risk_limit, weekly_risk_limit, monthly_risk_limit, risk_per_trade_default')
        .eq('user_id', u.user.id)
        .maybeSingle();
      if (!alive) return;
      if (!error && data) {
        const merged: UserPreferences = {
          theme: data.theme ?? DEFAULT_PREFS.theme,
          daily_risk_limit: Number(data.daily_risk_limit) || DEFAULT_PREFS.daily_risk_limit,
          weekly_risk_limit: Number(data.weekly_risk_limit) || DEFAULT_PREFS.weekly_risk_limit,
          monthly_risk_limit: Number(data.monthly_risk_limit) || DEFAULT_PREFS.monthly_risk_limit,
          risk_per_trade_default: Number(data.risk_per_trade_default) || DEFAULT_PREFS.risk_per_trade_default,
        };
        setCache(merged);
        setPrefs(merged);
      }
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  const update = useCallback(async (patch: Partial<UserPreferences>) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const next = { ..._cache, ...patch };
    setCache(next);
    setPrefs(next);
    await supabase
      .from('user_preferences')
      .upsert({ user_id: u.user.id, ...next }, { onConflict: 'user_id' });
  }, []);

  return { prefs, loaded, update };
}
