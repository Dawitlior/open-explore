/**
 * useRegistryCharts — registry-driven chart filtering for a given page.
 *
 * Phase 2 foundation. Page components (renderAnalytics, renderRisk, etc.)
 * call this to receive ONLY the charts that:
 *   (a) are canonically homed (or mirrored) on this page, AND
 *   (b) are allowed for the current experience tier (beginner/standard/alpha).
 *
 * Consumers iterate the returned list and render via the chart's `id`,
 * eliminating inline `if (isAlpha)` branches.
 *
 *   const charts = useRegistryCharts('analytics');
 *   {charts.map(c => <ChartFor id={c.id} key={c.id} />)}
 */
import { useMemo } from 'react';
import { chartsFor, type ChartHome, type ChartSpec } from '@/lib/chart-registry';
import { useWidgetVisibility } from '@/hooks/use-widget-visibility';

export function useRegistryCharts(page: ChartHome): ChartSpec[] {
  const { exp } = useWidgetVisibility();
  return useMemo(
    () => chartsFor(page).filter(c => !c.tiers || c.tiers.includes(exp)),
    [page, exp],
  );
}
