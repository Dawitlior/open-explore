/**
 * useDualSeries — per-chart R/$ override hook for Advanced-tier charts.
 *
 * Wraps the global useDisplayMode. Each chart instance may locally flip
 * between MONEY and R_MULTIPLE without affecting other charts.
 *
 * Guard: if R-coverage of the supplied trades < `coverageThreshold` (80%
 * by default), the chip force-resolves to MONEY and exposes `coverageLow`
 * so the UI can disable the toggle and explain why.
 */
import { useMemo, useState } from 'react';
import type { Trade } from '@/data/trades';
import { hasStrictR, useDisplayMode, type DisplayMode } from './display-mode';
import { formatValue, formatAxis } from './display-mode-format';

export interface DualSeriesState {
  mode: DisplayMode;
  setMode: (m: DisplayMode) => void;
  coverage: number;          // 0..1
  coverageLow: boolean;      // < threshold
  canToggle: boolean;        // true when both modes are usable
  unit: '$' | 'R';
  formatValue: (v: number) => string;
  formatAxis: (v: number) => string;
}

export function useDualSeries(
  trades: Trade[],
  opts: { coverageThreshold?: number; defaultMode?: DisplayMode } = {},
): DualSeriesState {
  const { coverageThreshold = 0.8 } = opts;
  const { displayMode: globalMode } = useDisplayMode();

  // Local override starts in sync with global mode; chip flips it.
  const [override, setOverride] = useState<DisplayMode | null>(null);

  const coverage = useMemo(() => {
    if (trades.length === 0) return 0;
    const eligible = trades.filter(hasStrictR).length;
    return eligible / trades.length;
  }, [trades]);

  const coverageLow = coverage < coverageThreshold;
  const canToggle = !coverageLow && trades.length > 0;

  // Resolved mode: low coverage forces MONEY regardless of preference.
  const requested = override ?? opts.defaultMode ?? globalMode;
  const mode: DisplayMode = coverageLow ? 'MONEY' : requested;

  return {
    mode,
    setMode: (m) => canToggle && setOverride(m),
    coverage,
    coverageLow,
    canToggle,
    unit: mode === 'MONEY' ? '$' : 'R',
    formatValue: (v) => formatValue(v, mode),
    formatAxis: (v) => formatAxis(v, mode),
  };
}
