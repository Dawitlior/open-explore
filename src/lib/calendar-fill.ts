/**
 * Calendar day fill — the single visual channel for a day's trading result.
 *
 * Channel rules (see the calendar spec):
 *   • Result (P&L / R)  → graded background fill (continuous → magnitude)
 *   • Report exists     → one neutral dot (discrete → presence)
 *   • Today / selected  → ring, never a fill
 *
 * Presentation only: nothing here reads or mutates trade data, it only maps an
 * already-computed magnitude to an existing theme token + alpha.
 */
import type { TradingTheme } from '@/lib/trading-theme';
import { withAlpha } from '@/lib/chart-theme';

export interface FillRamp {
  /** |R| >= 2 */ strong: number;
  /** 1 <= |R| < 2 */ medium: number;
  /** 0.3 <= |R| < 1 */ light: number;
  /** 0 < |R| < 0.3 */ faint: number;
  /** exactly breakeven */ breakeven: number;
}

/**
 * Per-theme calibration. The spec's percentages are tuned for the dark themes;
 * over platinum's near-white surface the same alpha reads far weaker, so the
 * light ramp is scaled up to keep perceived contrast equivalent.
 */
const RAMPS: Record<string, FillRamp> = {
  midnight: { strong: 0.45, medium: 0.32, light: 0.20, faint: 0.10, breakeven: 0.08 },
  blue: { strong: 0.45, medium: 0.32, light: 0.20, faint: 0.10, breakeven: 0.08 },
  graphite: { strong: 0.48, medium: 0.34, light: 0.22, faint: 0.11, breakeven: 0.09 },
  platinum: { strong: 0.34, medium: 0.24, light: 0.15, faint: 0.075, breakeven: 0.06 },
};


export function fillRamp(T: TradingTheme): FillRamp {
  return RAMPS[T.id] ?? (T.isLight ? RAMPS.platinum : RAMPS.midnight);
}

export function fillAlpha(T: TradingTheme, magnitude: number): number {
  const r = fillRamp(T);
  const m = Math.abs(Number.isFinite(magnitude) ? magnitude : 0);
  if (m >= 2) return r.strong;
  if (m >= 1) return r.medium;
  if (m >= 0.3) return r.light;
  if (m > 0) return r.faint;
  return r.breakeven;
}

/**
 * Background for a day cell. `value` is the day's lead magnitude (R when the
 * user is in R mode, money otherwise — normalised by the caller).
 * Returns `undefined` when the day has no trades: empty days stay empty.
 */
export function dayFill(T: TradingTheme, value: number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const v = Number.isFinite(value) ? value : 0;
  const alpha = fillAlpha(T, v);
  if (v === 0) return withAlpha(T.text.muted, alpha);
  return withAlpha(v > 0 ? T.state.profit : T.state.loss, alpha);
}

/** Neutral, low-contrast dot used for "a report exists on this day". */
export function reportDotColor(T: TradingTheme): string {
  return withAlpha(T.text.muted, T.isLight ? 0.85 : 0.7);
}
