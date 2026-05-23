/**
 * Phase 4 — useDashboardData()
 * ─────────────────────────────────────────────────────────────
 * Single aggregator for the dashboard data layer. Children should
 * consume sliced data via this hook (or selectors on top) instead
 * of calling useTrades / useRiskLimits / useOracleVector directly.
 *
 * This is the *engine half* of the engine/renderer split:
 *   engine: pure data, no JSX, fully testable
 *   renderer: components that receive pre-computed slices
 *
 * Migrating consumers is incremental — this hook is additive and
 * does not change existing call sites.
 */
import { useMemo } from 'react';
import { useTrades } from '@/hooks/use-trades';
import { useRiskLimits } from '@/hooks/use-risk-limits';
import { useExpectancyMode, type ExpectancyState } from './use-expectancy-mode';
import type { Trade } from '@/data/trades';
import type { TradingStats } from '@/lib/trading-analytics';

export interface DashboardData {
  trades: Trade[];
  stats: TradingStats;
  loading: boolean;
  initialized: boolean;
  expectancy: ExpectancyState;
  risk: ReturnType<typeof useRiskLimits>;
}

export function useDashboardData(): DashboardData {
  const { trades, stats, loading, initialized } = useTrades();
  const risk = useRiskLimits();
  const expectancy = useExpectancyMode(trades);

  return useMemo(
    () => ({ trades, stats, loading, initialized, expectancy, risk }),
    [trades, stats, loading, initialized, expectancy, risk]
  );
}
