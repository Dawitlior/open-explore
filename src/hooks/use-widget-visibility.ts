/**
 * useWidgetVisibility — thin hook over the dashboard matrix.
 *
 * Components should call this instead of branching on `opMode`/`isAlpha`.
 *
 *   const { show, locked, exp, state } = useWidgetVisibility();
 *   {show('research_volatility_clus') && <VolatilityClusterCard />}
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

export interface WidgetVisibility {
  exp: Experience;
  state: DashState;
  locked: boolean;
  show: (w: WidgetId) => boolean;
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
      locked: isCellLocked(exp, state),
      show: (w: WidgetId) => isWidgetVisible(w, exp, state),
      list: widgetsFor(exp, state),
    };
  }, [settings.operatingMode, settings.isAlpha]);
}
