/**
 * ──────────────────────────────────────────────────────────────────────
 * ORCA CHART REGISTRY — single declarative manifest of every chart
 * ──────────────────────────────────────────────────────────────────────
 * Phase 3 foundation.
 *
 * Rule: every chart has EXACTLY ONE canonical home (one `home` page).
 * Charts may opt into additional `mirrorOn` surfaces only when the data
 * narrative materially differs (e.g. live-radar variant).
 *
 * Consumers:
 *   - `chartsFor(page)`            → which charts a page should render
 *   - `chartHome(id)`              → where a chart canonically lives
 *   - `isChartOwnedBy(id, page)`   → guard to prevent duplicate rendering
 *
 * NOTE: this file is data only. Rendering still lives in the page
 * components — they will migrate to consume the registry incrementally.
 * ──────────────────────────────────────────────────────────────────────
 */

import type { ChartExplanation } from '@/components/trading/ChartWrapper';

export type ChartHome =
  | 'dashboard'   // Overview surface
  | 'analytics'   // Performance analytics (R-multiples, expectancy)
  | 'risk'        // Risk & drawdown surfaces
  | 'psychology'  // Behavioral / discipline
  | 'quantlab'    // Deep research surface (future consolidation)
  | 'calendar';   // Calendar Hub

export type ChartCategory =
  | 'equity'
  | 'distribution'
  | 'expectancy'
  | 'risk'
  | 'drawdown'
  | 'discipline'
  | 'sizing'
  | 'timing'
  | 'correlation'
  | 'regime';

export interface ChartSpec {
  /** Stable canonical ID — never rename, used for hide/restore persistence */
  id: string;
  /** i18n key in `trading-i18n` OR a literal { he, en } pair */
  title: { he: string; en: string };
  /** Canonical surface — exactly one */
  home: ChartHome;
  /** Optional secondary surfaces (use sparingly) */
  mirrorOn?: ChartHome[];
  category: ChartCategory;
  /** Unit shown in the wrapper header chip */
  unit?: string;
  /** Key into ChartWrapper.EXPLANATIONS for the info modal */
  explanationKey: keyof typeof import('@/components/trading/ChartWrapper').EXPLANATIONS;
  /** Minimum trades required to render meaningfully */
  minTrades?: number;
  /** Which experience tiers may see it (matrix-aware) */
  tiers?: Array<'beginner' | 'standard' | 'alpha'>;
  /**
   * Minimum SaaS subscription tier required to render this chart.
   * Defaults to 'standard'. Charts marked 'advanced' or 'ultimate' will
   * render via <TierGate> as an upsell (or with a lock badge in soft mode).
   */
  tierAccess?: 'standard' | 'advanced' | 'ultimate';
  /**
   * When true, this chart exposes a per-chart R/$ toggle chip in its header
   * (overrides the global displayMode locally). Auto-disabled if the
   * R-coverage of the dataset falls below 80%.
   */
  dualMode?: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// REGISTRY — keep alphabetized within each `home` bucket for sanity
// ──────────────────────────────────────────────────────────────────────
export const CHART_REGISTRY: readonly ChartSpec[] = [
  // ── DASHBOARD ────────────────────────────────────────────────────
  {
    id: 'equityCurve',
    title: { he: 'עקומת הון', en: 'Equity Curve' },
    home: 'dashboard',
    category: 'equity',
    unit: '$',
    explanationKey: 'equityCurve',
    minTrades: 2,
    tiers: ['beginner', 'standard', 'alpha'],
  },
  {
    id: 'pnlDistribution',
    title: { he: 'התפלגות P&L', en: 'P&L Distribution' },
    home: 'dashboard',
    category: 'distribution',
    unit: '$',
    explanationKey: 'pnlDistribution',
    tiers: ['beginner', 'standard', 'alpha'],
  },
  {
    id: 'radarScore',
    title: { he: 'ציון Orca — פירוט', en: 'Orca Score — Breakdown' },
    home: 'dashboard',
    category: 'discipline',
    explanationKey: 'radarScore',
    tiers: ['standard', 'alpha'],
  },
  {
    id: 'coinPerformance',
    title: { he: 'ביצועי מטבעות', en: 'Coin Performance' },
    home: 'dashboard',
    category: 'distribution',
    unit: '$',
    explanationKey: 'coinPerformance',
    tiers: ['standard', 'alpha'],
  },
  {
    id: 'directionAnalysis',
    title: { he: 'ניתוח כיוון', en: 'Direction Analysis' },
    home: 'dashboard',
    category: 'distribution',
    explanationKey: 'directionAnalysis',
    tiers: ['standard', 'alpha'],
  },
  {
    id: 'monthlyPerformance',
    title: { he: 'ביצועים חודשיים (R)', en: 'Monthly Performance (R)' },
    home: 'dashboard',
    category: 'expectancy',
    unit: 'R',
    explanationKey: 'monthlyPerformance',
    tiers: ['standard', 'alpha'],
  },

  // ── ANALYTICS ────────────────────────────────────────────────────
  {
    id: 'rDistribution',
    title: { he: 'התפלגות R-Multiple', en: 'R-Multiple Distribution' },
    home: 'analytics',
    category: 'distribution',
    unit: 'R',
    explanationKey: 'rDistribution',
  },
  {
    id: 'rHistogram',
    title: { he: 'התפלגות R (היסטוגרמה)', en: 'R Histogram' },
    home: 'analytics',
    category: 'distribution',
    unit: 'R',
    explanationKey: 'rDistribution',
  },
  {
    id: 'rollingExpectancy',
    title: { he: 'תוחלת מתגלגלת (R)', en: 'Rolling Expectancy (R)' },
    home: 'analytics',
    category: 'expectancy',
    unit: 'R',
    explanationKey: 'expectancy',
  },
  {
    id: 'strategyExpectancy',
    title: { he: 'תוחלת לפי מטבע (R)', en: 'Strategy Expectancy (R)' },
    home: 'analytics',
    category: 'expectancy',
    unit: 'R',
    explanationKey: 'coinPerformance',
  },
  {
    id: 'rollingSharpe',
    title: { he: 'שארפ מתגלגל', en: 'Rolling Sharpe Ratio' },
    home: 'analytics',
    category: 'risk',
    unit: 'R/σ',
    explanationKey: 'rollingSharpe',
  },
  {
    id: 'rollingSortino',
    title: { he: 'Sortino מתגלגל', en: 'Rolling Sortino' },
    home: 'analytics',
    category: 'risk',
    unit: 'R/σ⁻',
    explanationKey: 'rollingSharpe',
  },
  {
    id: 'edgeDecay',
    title: { he: 'דעיכת יתרון', en: 'Edge Decay Timeline' },
    home: 'analytics',
    category: 'regime',
    unit: 'R',
    explanationKey: 'edgeDecay',
  },
  {
    id: 'winRateVsRR',
    title: { he: 'אחוז הצלחה vs R:R', en: 'Win Rate vs R:R Bucket' },
    home: 'analytics',
    category: 'distribution',
    unit: '%',
    explanationKey: 'winRateVsRR',
  },
  {
    id: 'performanceByDay',
    title: { he: 'ביצועים לפי יום (R)', en: 'Performance by Day (R)' },
    home: 'analytics',
    category: 'timing',
    unit: 'R',
    explanationKey: 'coinPerformance',
  },
  {
    id: 'cumWinLossRatio',
    title: { he: 'יחס Win/Loss מצטבר', en: 'Cumulative Win/Loss Ratio' },
    home: 'analytics',
    category: 'distribution',
    unit: 'x',
    explanationKey: 'winRate',
  },

  // ── ADVANCED-TIER DECK (Phase 3) ─────────────────────────────────
  {
    id: 'sessionPerformanceHeatmap',
    title: { he: 'ביצועים לפי סשן', en: 'Session Performance' },
    home: 'analytics',
    category: 'timing',
    unit: 'R',
    explanationKey: 'sessionPerformance',
    tierAccess: 'advanced',
    dualMode: true,
  },
  {
    id: 'streakDistribution',
    title: { he: 'התפלגות רצפים', en: 'Streak Distribution' },
    home: 'analytics',
    category: 'distribution',
    unit: 'x',
    explanationKey: 'streakDistribution',
    tierAccess: 'advanced',
  },
  {
    id: 'tradeDurationVsR',
    title: { he: 'משך עסקה מול R', en: 'Trade Duration vs R' },
    home: 'analytics',
    category: 'timing',
    unit: 'R',
    explanationKey: 'tradeDuration',
    tierAccess: 'advanced',
  },
  {
    id: 'feeDragImpact',
    title: { he: 'שחיקת עמלות (אומדן)', en: 'Fee Drag Impact (est.)' },
    home: 'analytics',
    category: 'risk',
    unit: '$',
    explanationKey: 'feeDrag',
    tierAccess: 'advanced',
  },
  {
    id: 'lag1Autocorr',
    title: { he: 'אוטוקורלציה Lag-1', en: 'Lag-1 Autocorrelation' },
    home: 'analytics',
    category: 'correlation',
    unit: 'ρ',
    explanationKey: 'lag1Autocorr',
    tierAccess: 'ultimate',
  },
  {
    id: 'interTradeInterval',
    title: { he: 'מרווחים בין עסקאות', en: 'Inter-trade Interval (hrs)' },
    home: 'analytics',
    category: 'timing',
    unit: 'h',
    explanationKey: 'interTradeInterval',
    tierAccess: 'ultimate',
  },


  // ── RISK ─────────────────────────────────────────────────────────
  {
    id: 'riskEvolution',
    title: { he: 'התפתחות סיכון לאורך זמן', en: 'Risk Evolution Over Time' },
    home: 'risk',
    category: 'risk',
    unit: '$',
    explanationKey: 'riskAllocation',
  },
  {
    id: 'riskChangePct',
    title: { he: 'שינוי סיכון (%)', en: 'Risk Change %' },
    home: 'risk',
    category: 'risk',
    unit: '%',
    explanationKey: 'riskAllocation',
  },
  {
    id: 'riskAllocation',
    title: { he: 'הקצאת סיכון', en: 'Risk Allocation' },
    home: 'risk',
    category: 'risk',
    unit: '%',
    explanationKey: 'riskAllocation',
  },
  {
    id: 'drawdownAnalysis',
    title: { he: 'ניתוח נסיגה', en: 'Drawdown Analysis' },
    home: 'risk',
    category: 'drawdown',
    unit: '%',
    explanationKey: 'drawdown',
  },
  {
    id: 'drawdownDepthMap',
    title: { he: 'מפת נסיגה', en: 'Drawdown Depth Map' },
    home: 'risk',
    category: 'drawdown',
    unit: '%',
    explanationKey: 'drawdown',
  },
  {
    id: 'drawdownStructure',
    title: { he: 'מבנה נסיגות', en: 'Drawdown Structure Map' },
    home: 'risk',
    category: 'drawdown',
    unit: '%',
    explanationKey: 'drawdownStructure',
    tierAccess: 'ultimate',
  },
  {
    id: 'riskOfRuin',
    title: { he: 'סיכון/רוויה', en: 'Risk of Ruin Curve' },
    home: 'risk',
    category: 'risk',
    unit: '%',
    explanationKey: 'riskOfRuin',
  },
  {
    id: 'kellyOptimal',
    title: { he: 'אופטימום קלי', en: 'Kelly Optimal Sizing' },
    home: 'risk',
    category: 'sizing',
    unit: '%',
    explanationKey: 'kellyOptimal',
    tierAccess: 'ultimate',
  },
  {
    id: 'capitalEfficiency',
    title: { he: 'יעילות הון', en: 'Capital Efficiency' },
    home: 'risk',
    category: 'sizing',
    unit: 'R/σ',
    explanationKey: 'capitalEfficiency',
    tierAccess: 'ultimate',
  },
  {
    id: 'cumulativeMAR',
    title: { he: 'MAR מצטבר', en: 'Cumulative MAR (return/DD)' },
    home: 'risk',
    category: 'drawdown',
    unit: 'x',
    explanationKey: 'cumulativeMAR',
    tierAccess: 'ultimate',
  },


  // ── PSYCHOLOGY ───────────────────────────────────────────────────
  {
    id: 'disciplineTrend',
    title: { he: 'מגמת משמעת לאורך זמן', en: 'Discipline Trend Over Time' },
    home: 'psychology',
    category: 'discipline',
    unit: '%',
    explanationKey: 'disciplineMetric',
  },
  {
    id: 'lossStreakPressure',
    title: { he: 'לחץ רצף הפסדים', en: 'Loss Streak Pressure' },
    home: 'psychology',
    category: 'discipline',
    unit: '%',
    explanationKey: 'rDistribution',
  },
  {
    id: 'deviationDistribution',
    title: { he: 'התפלגות סטייה (R)', en: 'Deviation Distribution (R)' },
    home: 'psychology',
    category: 'discipline',
    unit: 'R',
    explanationKey: 'rDistribution',
  },
  {
    id: 'confidenceVsOutcome',
    title: { he: 'ביטחון מול תוצאה', en: 'Confidence vs Outcome Scatter' },
    home: 'psychology',
    category: 'discipline',
    unit: 'R',
    explanationKey: 'rDistribution',
    tiers: ['standard', 'alpha'],
  },
] as const;

// ── Index by ID for O(1) lookup ──────────────────────────────────────
const BY_ID: Record<string, ChartSpec> = Object.fromEntries(
  CHART_REGISTRY.map((c) => [c.id, c])
);

// ──────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────

export function chartHome(id: string): ChartHome | null {
  return BY_ID[id]?.home ?? null;
}

export function chartsFor(page: ChartHome): ChartSpec[] {
  return CHART_REGISTRY.filter(
    (c) => c.home === page || c.mirrorOn?.includes(page)
  );
}

/**
 * Guard for renderers: returns true if `page` is allowed to render `id`.
 * Use in tests / dev assertions to catch accidental duplicate placements.
 */
export function isChartOwnedBy(id: string, page: ChartHome): boolean {
  const spec = BY_ID[id];
  if (!spec) return false;
  return spec.home === page || (spec.mirrorOn?.includes(page) ?? false);
}

/** All chart IDs — useful for hide/restore persistence migrations. */
export const ALL_CHART_IDS: readonly string[] = CHART_REGISTRY.map((c) => c.id);

/**
 * Dev-only invariant check: warns in console if the registry contains
 * duplicate IDs or homes that violate the "one canonical home" rule.
 * Call once at app bootstrap if desired.
 */
export function assertRegistryIntegrity(): void {
  const seen = new Set<string>();
  for (const c of CHART_REGISTRY) {
    if (seen.has(c.id)) {
      // eslint-disable-next-line no-console
      console.warn(`[chart-registry] duplicate id: ${c.id}`);
    }
    seen.add(c.id);
    if (c.mirrorOn?.includes(c.home)) {
      // eslint-disable-next-line no-console
      console.warn(`[chart-registry] ${c.id}: home appears in mirrorOn`);
    }
  }
}
