/**
 * semantic-color — the single place that decides *why* something is colored.
 *
 * Rules encoded here:
 *  1. Neutral by default. A score is only colored when it crosses a threshold.
 *  2. Green / red are reserved for money: P&L, R, win/loss, equity, drawdown.
 *  3. Warning states always ship a glyph too, so color is never the only signal.
 *  4. Categorical series come from a single-hue ladder, never a rainbow.
 *
 * No theme tokens are redefined here — this module only decides *which*
 * existing token an element should ask for.
 */
import type { TradingTheme } from '@/lib/trading-theme';
import { withAlpha } from '@/lib/chart-theme';

export interface ScoreThresholds {
  /** below this → caution (amber) */
  warn: number;
  /** below this → breach (red) */
  bad: number;
}

export const SCORE_THRESHOLDS: Record<string, ScoreThresholds> = {
  discipline: { warn: 70, bad: 50 },
  riskConsistency: { warn: 70, bad: 50 },
  orcaScore: { warn: 65, bad: 45 },
  regimeFit: { warn: 60, bad: 40 },
  winRate: { warn: 45, bad: 35 },
};

/**
 * Color for a 0..100 health score. Healthy = calm neutral (no color spent),
 * caution = amber, breach = red.
 */
export function scoreColor(T: TradingTheme, score: number, th: ScoreThresholds): string {
  const v = Number.isFinite(score) ? score : 0;
  if (v < th.bad) return T.state.loss;
  if (v < th.warn) return T.state.warn;
  return T.text.primary;
}

/** Soft wash matching `scoreColor`, for gauge tracks and pill backgrounds. */
export function scoreSoft(T: TradingTheme, score: number, th: ScoreThresholds): string {
  return withAlpha(scoreColor(T, score, th), 0.14);
}

/** Non-color redundancy for a score state (accessibility rule #15). */
export function scoreGlyph(score: number, th: ScoreThresholds): string {
  const v = Number.isFinite(score) ? score : 0;
  if (v < th.bad) return '▼';
  if (v < th.warn) return '▬';
  return '▲';
}

/**
 * Severity color for a "lower is better" metric such as drawdown.
 * `warn` / `bad` are magnitudes (e.g. 10 / 20 percent).
 */
export function severityColor(T: TradingTheme, magnitude: number, warn: number, bad: number): string {
  const v = Math.abs(Number.isFinite(magnitude) ? magnitude : 0);
  if (v >= bad) return T.state.loss;
  if (v >= warn) return T.state.warn;
  return T.text.primary;
}

/**
 * Money-bearing metric color. This is the ONLY sanctioned green/red path
 * outside of chart P&L series.
 */
export function moneyColor(T: TradingTheme, value: number): string {
  const v = Number.isFinite(value) ? value : 0;
  if (v > 0) return T.state.profit;
  if (v < 0) return T.state.loss;
  return T.text.primary;
}

/**
 * `n` steps of the active theme's own hue, light → dark, for categorical or
 * sequential encoding. Falls back to the theme's series palette when the
 * requested count exceeds the ladder.
 */
export function neutralRamp(T: TradingTheme, n: number): string[] {
  const ladder = T.chart.series.slice(0, 4);
  if (n <= ladder.length) return ladder.slice(0, n);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const base = ladder[i % ladder.length];
    const fade = 1 - Math.floor(i / ladder.length) * 0.28;
    out.push(fade >= 1 ? base : withAlpha(base, Math.max(0.35, fade)));
  }
  return out;
}

/** Single neutral accent for non-financial emphasis (the theme's own hue). */
export function infoColor(T: TradingTheme): string {
  return T.chart.series[0];
}

/** Matte (no glow) shadow for historical/analytical surfaces. */
export const MATTE_SHADOW = 'none';

/**
 * Ring color for a health gauge: calm theme hue while healthy, amber/red on
 * breach. Pair with `scoreGlyph` so the state is readable without color.
 */
export function gaugeColor(T: TradingTheme, score: number, th: ScoreThresholds): string {
  const c = scoreColor(T, score, th);
  return c === T.text.primary ? infoColor(T) : c;
}

/** True when the score is in a caution/breach state (drives glow + weight). */
export function isAlert(score: number, th: ScoreThresholds): boolean {
  const v = Number.isFinite(score) ? score : 0;
  return v < th.warn;
}
