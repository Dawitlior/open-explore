/* Adaptive formatters + helpers for the Dual-Currency Engine.
 * Used by chart canvases to swap dataKeys, axis ticks, and tooltips
 * between fiat money ($) and R-Multiple (R) without duplicating charts. */
import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import { useDisplayMode, selectVisibleTrades, type DisplayMode } from './display-mode';

/** Returns the active dataset field to plot for cumulative/aggregate charts. */
export function pickField(mode: DisplayMode): 'pnl' | 'r' {
  return mode === 'MONEY' ? 'pnl' : 'r';
}

/** Compact tick formatter (axis labels). */
export function formatAxis(v: number, mode: DisplayMode): string {
  if (!isFinite(v)) return '';
  if (mode === 'MONEY') {
    const abs = Math.abs(v);
    if (abs >= 1000) return `${v < 0 ? '-' : ''}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
    return `${v < 0 ? '-' : ''}$${abs.toFixed(0)}`;
  }
  return `${v >= 0 ? '' : ''}${v.toFixed(v % 1 === 0 ? 0 : 1)}R`;
}

/** Tooltip value formatter (signed, with currency / R unit). */
export function formatValue(v: number, mode: DisplayMode): string {
  if (!isFinite(v)) return '—';
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  const abs = Math.abs(v);
  return mode === 'MONEY' ? `${sign}$${abs.toFixed(2)}` : `${sign}${abs.toFixed(2)}R`;
}

/** Build adaptive $ bins from the data spread (used by histograms in MONEY mode). */
export function getMoneyBins(trades: Trade[]): { label: string; min: number; max: number }[] {
  if (trades.length === 0) return [];
  const pnls = trades.map(t => t.pnl).filter(n => isFinite(n));
  const max = Math.max(...pnls.map(Math.abs));
  // Pick a round step so we get ~10 buckets across [-max, +max]
  const candidates = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  const step = candidates.find(s => (2 * max) / s <= 10) ?? candidates[candidates.length - 1];
  const top = Math.ceil(max / step) * step;
  const out: { label: string; min: number; max: number }[] = [];
  for (let v = -top; v < top; v += step) {
    const lo = v, hi = v + step;
    const lbl = `${lo >= 0 ? '+' : ''}$${Math.abs(lo) >= 1000 ? `${(lo / 1000).toFixed(1)}k` : lo}`;
    out.push({ label: lbl, min: lo, max: hi });
  }
  return out;
}

/** Hook: gives a chart page filtered trades + active mode + formatters in one call. */
export function useVisibleTrades(trades: Trade[]) {
  const { displayMode } = useDisplayMode();
  const visibleTrades = useMemo(
    () => selectVisibleTrades(trades, displayMode),
    [trades, displayMode],
  );
  return {
    displayMode,
    visibleTrades,
    isMoney: displayMode === 'MONEY',
    isR: displayMode === 'R_MULTIPLE',
    field: pickField(displayMode),
    formatAxis: (v: number) => formatAxis(v, displayMode),
    formatValue: (v: number) => formatValue(v, displayMode),
    unit: displayMode === 'MONEY' ? '$' : 'R',
  };
}
