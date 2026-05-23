/**
 * Phase 4 — useExpectancyMode()
 * ─────────────────────────────────────────────────────────────
 * Decides whether dashboards should render R-multiple widgets
 * (canonical) or fall back to $-based equivalents.
 *
 * Rule (per master plan §2.2): if the last 20 closed trades have
 * ≥80% R-data coverage, mode = 'R'. Otherwise mode = '$'.
 *
 * Coverage = trade has either an explicit manual_r_multiple OR
 * enough fields (entry/stop/exit) to compute one via getEffectiveR.
 *
 * Single source of truth. Replaces ad-hoc `hasR` checks scattered
 * across components.
 */
import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import { getEffectiveR } from '@/lib/r-multiple';

export type ExpectancyMode = 'R' | '$';

export interface ExpectancyState {
  mode: ExpectancyMode;
  coverage: number;        // 0..1 over the sample window
  sampleSize: number;      // trades inspected
  reason: 'sufficient' | 'insufficient_sample' | 'low_coverage';
}

const WINDOW = 20;
const THRESHOLD = 0.8;

export function useExpectancyMode(trades: Trade[]): ExpectancyState {
  return useMemo(() => {
    if (!trades || trades.length === 0) {
      return { mode: '$', coverage: 0, sampleSize: 0, reason: 'insufficient_sample' };
    }
    const recent = trades.slice(-WINDOW);
    let withR = 0;
    for (const t of recent) {
      const r = getEffectiveR(t as Parameters<typeof getEffectiveR>[0]);
      if (typeof r === 'number' && isFinite(r)) withR++;
    }
    const coverage = withR / recent.length;
    if (recent.length < 5) {
      return { mode: '$', coverage, sampleSize: recent.length, reason: 'insufficient_sample' };
    }
    if (coverage >= THRESHOLD) {
      return { mode: 'R', coverage, sampleSize: recent.length, reason: 'sufficient' };
    }
    return { mode: '$', coverage, sampleSize: recent.length, reason: 'low_coverage' };
  }, [trades]);
}
