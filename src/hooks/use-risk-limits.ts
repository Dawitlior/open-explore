import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '@/lib/storage';
import { DEFAULT_RISK_LIMITS, type RiskLimits } from '@/lib/risk-limits';

const STORAGE_KEY = 'riskLimits';

/**
 * useRiskLimits — user-configurable per-trade / daily / weekly / monthly
 * negative-R stops. Persists to IndexedDB so the engine and UI stay in sync.
 */
export function useRiskLimits() {
  const [limits, setLimitsState] = useState<RiskLimits>(DEFAULT_RISK_LIMITS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSetting<RiskLimits>(STORAGE_KEY).then(stored => {
      if (stored && typeof stored === 'object') {
        setLimitsState({
          trade: typeof stored.trade === 'number' && stored.trade < 0 ? stored.trade : DEFAULT_RISK_LIMITS.trade,
          day: typeof stored.day === 'number' && stored.day < 0 ? stored.day : DEFAULT_RISK_LIMITS.day,
          week: typeof stored.week === 'number' && stored.week < 0 ? stored.week : DEFAULT_RISK_LIMITS.week,
          month: typeof stored.month === 'number' && stored.month < 0 ? stored.month : DEFAULT_RISK_LIMITS.month,
        });
      }
      setLoaded(true);
    });
  }, []);

  const setLimits = useCallback((next: RiskLimits) => {
    // Always store as negative numbers
    const normalized: RiskLimits = {
      trade: -Math.abs(next.trade),
      day: -Math.abs(next.day),
      week: -Math.abs(next.week),
      month: -Math.abs(next.month),
    };
    setLimitsState(normalized);
    setSetting(STORAGE_KEY, normalized);
  }, []);

  const reset = useCallback(() => {
    setLimitsState(DEFAULT_RISK_LIMITS);
    setSetting(STORAGE_KEY, DEFAULT_RISK_LIMITS);
  }, []);

  return { limits, setLimits, reset, loaded };
}
