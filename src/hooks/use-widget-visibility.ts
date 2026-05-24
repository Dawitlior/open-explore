/**
 * useWidgetVisibility — thin hook over the dashboard matrix + tier gate.
 *
 *   const { show, featureAllowed, tier } = useWidgetVisibility();
 *   {show('research_volatility_clus') && <VolatilityClusterCard />}
 *   {featureAllowed('ai_insights') ? <AIInsights/> : <TierLockCard/>}
 */
import { useMemo } from 'react';
import { useSettings } from '@/hooks/use-settings';
import {
  deriveExperience,
  deriveState,
  isWidgetVisible,
  isCellLocked,
  widgetsFor,
  type WidgetId,
  type Experience,
  type DashState,
} from '@/lib/dashboard-matrix';
import { tierAllows, type Feature } from '@/lib/tier-access';
import type { Tier } from '@/hooks/use-settings';

export interface WidgetVisibility {
  exp: Experience;
  state: DashState;
  locked: boolean;
  tier: Tier;
  show: (w: WidgetId) => boolean;
  featureAllowed: (f: Feature) => boolean;
  list: readonly WidgetId[];
}

export function useWidgetVisibility(): WidgetVisibility {
  const settings = useSettings();
  return useMemo(() => {
    const exp = deriveExperience(settings.operatingMode, settings.isAlpha);
    const state = deriveState(settings.operatingMode);
    return {
      exp,
      state,
      tier: settings.tier,
      locked: isCellLocked(exp, state),
      show: (w: WidgetId) => isWidgetVisible(w, exp, state),
      featureAllowed: (f: Feature) => tierAllows(settings.tier, f),
      list: widgetsFor(exp, state),
    };
  }, [settings.operatingMode, settings.isAlpha, settings.tier]);
}
