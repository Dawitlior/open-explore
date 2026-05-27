/**
 * useRegistryCharts — registry-driven chart filtering for a given page.
 *
 * Returns ONLY the charts that:
 *   (a) are canonically homed (or mirrored) on this page, AND
 *   (b) are allowed for the current experience tier (beginner/standard/alpha).
 *
 * Charts gated by SaaS `tierAccess` are NOT filtered out here — the page
 * wraps them in <TierGate> so locked tiers see an upsell card instead of
 * the chart silently disappearing. This preserves discoverability.
 *
 *   const charts = useRegistryCharts('analytics');
 *   {charts.map(c => (
 *     <TierGate key={c.id} required={c.tierAccess ?? 'standard'} label={c.title.en}>
 *       <ChartFor id={c.id} />
 *     </TierGate>
 *   ))}
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
