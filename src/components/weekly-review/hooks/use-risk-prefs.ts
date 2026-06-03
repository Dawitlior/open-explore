// Reads the user's risk-per-trade default ($/R) and per-tier $ risk limits.
// Falls back to sensible defaults if the row is missing or RLS denies.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RiskPrefs {
  rUSD: number;          // $ value of 1R (risk_per_trade_default)
  dailyUSD: number;      // absolute $
  weeklyUSD: number;
  monthlyUSD: number;
}

const FALLBACK: RiskPrefs = { rUSD: 20, dailyUSD: 100, weeklyUSD: 400, monthlyUSD: 1500 };

export function useRiskPrefs(): RiskPrefs {
  const [prefs, setPrefs] = useState<RiskPrefs>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('user_preferences')
          .select('risk_per_trade_default, daily_risk_limit, weekly_risk_limit, monthly_risk_limit')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled || !data) return;
        setPrefs({
          rUSD:      Number(data.risk_per_trade_default) || FALLBACK.rUSD,
          dailyUSD:  Number(data.daily_risk_limit)       || FALLBACK.dailyUSD,
          weeklyUSD: Number(data.weekly_risk_limit)      || FALLBACK.weeklyUSD,
          monthlyUSD:Number(data.monthly_risk_limit)     || FALLBACK.monthlyUSD,
        });
      } catch { /* keep fallback */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return prefs;
}
