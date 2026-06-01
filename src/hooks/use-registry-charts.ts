/**
 * useRegistryCharts — registry-driven chart filtering for a given page.
 *
 * Returns the charts that are canonically homed (or mirrored) on this page.
 *
 * SaaS `tierAccess` is handled by <TierGate>; old Beginner/Live/Review/
 * Research filtering is intentionally removed so charts never disappear
 * behind the legacy mode matrix.
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

export function useRegistryCharts(page: ChartHome): ChartSpec[] {
  return useMemo(
    () => chartsFor(page),
    [page],
  );
}
