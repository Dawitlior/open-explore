/**
 * chart-theme — the single source of truth for every Recharts surface
 * in the platform. Components must not hardcode grid/axis/tooltip colors
 * or P&L hues; they pull them from here so the Light theme (and any future
 * theme) is correct by construction.
 */
import type { TradingTheme } from '@/lib/trading-theme';

export interface ChartAxisProps {
  stroke: string;
  tick: { fill: string; fontSize: number };
  tickLine: boolean;
  axisLine: { stroke: string };
}

/** Cartesian grid props */
export function gridProps(T: TradingTheme) {
  return {
    stroke: T.chart.grid,
    strokeDasharray: T.isLight ? '0' : '3 3',
    vertical: false,
  } as const;
}

/** X / Y axis props */
export function axisProps(T: TradingTheme, fontSize = 11): ChartAxisProps {
  return {
    stroke: T.chart.axis,
    tick: { fill: T.chart.axis, fontSize },
    tickLine: false,
    axisLine: { stroke: T.chart.axisLine },
  };
}

/** Tooltip contentStyle */
export function tooltipStyle(T: TradingTheme) {
  return {
    background: T.chart.tooltipBg,
    backgroundColor: T.chart.tooltipBg,
    border: `1px solid ${T.chart.tooltipBorder}`,
    borderRadius: T.radius.md,
    boxShadow: T.chart.tooltipShadow,
    color: T.text.primary,
    fontSize: 12,
    padding: '8px 12px',
    backdropFilter: T.isLight ? 'none' : 'blur(12px)',
  };
}

export function tooltipLabelStyle(T: TradingTheme) {
  return { color: T.text.secondary, fontSize: 11, marginBottom: 4 };
}

export function tooltipItemStyle(T: TradingTheme) {
  return { color: T.text.primary, fontSize: 12 };
}

export function legendStyle(T: TradingTheme) {
  return { color: T.text.secondary, fontSize: 11 };
}

/** Semantic P&L color for a numeric value */
export function pnlColor(T: TradingTheme, value: number): string {
  if (value > 0) return T.chart.profit;
  if (value < 0) return T.chart.loss;
  return T.chart.neutral;
}

/** Soft background wash matching a P&L value */
export function pnlSoft(T: TradingTheme, value: number): string {
  if (value > 0) return T.state.profitSoft;
  if (value < 0) return T.state.lossSoft;
  return 'transparent';
}

/** Nth categorical series color (wraps around) */
export function seriesColor(T: TradingTheme, index: number): string {
  const s = T.chart.series;
  return s[((index % s.length) + s.length) % s.length];
}

/** Full categorical palette */
export function seriesPalette(T: TradingTheme): string[] {
  return T.chart.series;
}

/**
 * Area/bar gradient stops. Light themes need much lower alpha or the chart
 * turns into a solid block of color on white.
 */
export function gradientStops(T: TradingTheme, color: string) {
  const top = T.isLight ? 0.28 : 0.45;
  const bottom = T.isLight ? 0.02 : 0.02;
  return [
    { offset: '0%', color, opacity: top },
    { offset: '100%', color, opacity: bottom },
  ];
}

/** Fill opacity for bars/areas */
export function fillOpacity(T: TradingTheme, base = 1): number {
  return base * T.chart.fillOpacity;
}

/** Heatmap color for a 0..1 normalized value */
export function heatColor(T: TradingTheme, t: number): string {
  const ramp = T.chart.heat;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  const idx = Math.min(ramp.length - 1, Math.round(clamped * (ramp.length - 1)));
  return ramp[idx];
}

/**
 * Diverging heat color for signed values (correlation matrices, P&L calendars).
 * `t` in -1..1.
 */
export function divergingColor(T: TradingTheme, t: number): string {
  const v = Math.max(-1, Math.min(1, Number.isFinite(t) ? t : 0));
  const mag = Math.abs(v);
  if (mag < 0.02) return T.isLight ? T.surface.sunken : 'rgba(255,255,255,0.04)';
  const base = v > 0 ? T.chart.profit : T.chart.loss;
  const alpha = T.isLight ? 0.12 + mag * 0.68 : 0.10 + mag * 0.75;
  return withAlpha(base, alpha);
}

/** Apply alpha to a hex or rgb color */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  if (color.startsWith('#')) {
    let h = color.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  if (color.startsWith('rgba')) return color.replace(/[\d.]+\)$/, `${a})`);
  if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `,${a})`);
  return color;
}

/** Reference line (zero axis, targets) */
export function referenceLineProps(T: TradingTheme) {
  return {
    stroke: T.isLight ? '#CBD5E1' : 'rgba(255,255,255,0.25)',
    strokeDasharray: '4 4',
    strokeWidth: 1,
  } as const;
}

/** Recharts cursor overlay used on hover */
export function cursorProps(T: TradingTheme) {
  return {
    fill: T.isLight ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.04)',
    stroke: 'transparent',
  } as const;
}
