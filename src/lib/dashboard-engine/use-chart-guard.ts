/**
 * Phase 3 — useChartGuard(page)
 * ─────────────────────────────────────────────────────────────
 * Dev-only invariant: warns at render time if a page tries to
 * render a chartId that is not canonically owned by it
 * (via chart-registry's `isChartOwnedBy`).
 *
 * Returns a stable `allow(id)` function. In production it is a
 * no-op pass-through that always returns true — zero runtime cost.
 * In development it emits a single warning per (page,id) pair.
 */
import { useCallback, useRef } from 'react';
import { isChartOwnedBy, type ChartHome } from '@/lib/chart-registry';

export function useChartGuard(page: ChartHome) {
  const warned = useRef<Set<string>>(new Set());

  return useCallback(
    (id: string): boolean => {
      if (import.meta.env.PROD) return true;
      if (!isChartOwnedBy(id, page)) {
        const key = `${page}|${id}`;
        if (!warned.current.has(key)) {
          warned.current.add(key);
          // eslint-disable-next-line no-console
          console.warn(
            `[chart-guard] page "${page}" rendering "${id}" — not its canonical home. ` +
              `Update chart-registry or move the chart.`
          );
        }
      }
      return true;
    },
    [page]
  );
}
