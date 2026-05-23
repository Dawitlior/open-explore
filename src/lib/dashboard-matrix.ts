/**
 * ──────────────────────────────────────────────────────────────────────
 * ORCA DASHBOARD MATRIX — single source of truth for widget visibility
 * ──────────────────────────────────────────────────────────────────────
 * Phase 2 of the Architectural Overhaul.
 *
 * Two orthogonal axes:
 *   • Experience  — beginner | standard | alpha   (depth of analytics)
 *   • State       — live     | review   | research (intent of the moment)
 *
 * Each (exp, state) cell has an allowlist of canonical widget IDs.
 * This file is purely declarative — components consume it via
 * `useWidgetVisibility()` and never branch on `opMode`/`isAlpha` directly.
 *
 * RULE: every widget has exactly ONE canonical home. If a widget needs
 * to appear in multiple states, it lives in multiple cells of the matrix —
 * never rendered twice on the same surface.
 * ──────────────────────────────────────────────────────────────────────
 */

export type Experience = 'beginner' | 'standard' | 'alpha';
export type DashState  = 'live' | 'review' | 'research';

/** Canonical widget catalog. Add a new ID here before rendering it. */
export const WIDGETS = {
  // ── Core KPIs ──────────────────────────────────────────────────
  kpi_expectancy:        'kpi_expectancy',
  kpi_winrate:           'kpi_winrate',
  kpi_pnl:               'kpi_pnl',
  kpi_streak:            'kpi_streak',
  kpi_risk_used:         'kpi_risk_used',
  kpi_avg_r:             'kpi_avg_r',
  kpi_profit_factor:     'kpi_profit_factor',
  kpi_sharpe:            'kpi_sharpe',

  // ── Live / execution ──────────────────────────────────────────
  live_risk_meter:       'live_risk_meter',
  live_session_clock:    'live_session_clock',
  live_economic_alert:   'live_economic_alert',
  live_open_positions:   'live_open_positions',
  live_limit_tiers:      'live_limit_tiers',

  // ── Review / debrief ──────────────────────────────────────────
  review_pnl_curve:      'review_pnl_curve',
  review_calendar:       'review_calendar',
  review_trade_table:    'review_trade_table',
  review_phase_split:    'review_phase_split',
  review_emotion_log:    'review_emotion_log',
  review_weekly_ai:      'review_weekly_ai',

  // ── Research / quant ──────────────────────────────────────────
  research_setup_matrix:    'research_setup_matrix',
  research_time_of_day:     'research_time_of_day',
  research_mae_mfe:         'research_mae_mfe',
  research_correlation:     'research_correlation',
  research_volatility_clus: 'research_volatility_clus',
  research_orderflow_imb:   'research_orderflow_imb',
  research_regime_map:      'research_regime_map',
  research_drawdown_dist:   'research_drawdown_dist',
} as const;

export type WidgetId = keyof typeof WIDGETS;

/**
 * Visibility matrix: experience → state → allowed widget IDs.
 * `null` means the cell is locked (show upsell card instead).
 */
type Cell = ReadonlyArray<WidgetId> | null;
type Matrix = Record<Experience, Record<DashState, Cell>>;

export const DASHBOARD_MATRIX: Matrix = {
  beginner: {
    live: [
      'kpi_pnl', 'kpi_winrate', 'kpi_streak',
      'live_risk_meter', 'live_limit_tiers', 'live_economic_alert',
    ],
    review: [
      'kpi_pnl', 'kpi_expectancy', 'kpi_winrate',
      'review_pnl_curve', 'review_calendar', 'review_emotion_log',
    ],
    research: null, // locked → upsell to Standard/Alpha
  },

  standard: {
    live: [
      'kpi_pnl', 'kpi_risk_used', 'kpi_streak', 'kpi_winrate',
      'live_risk_meter', 'live_limit_tiers',
      'live_session_clock', 'live_economic_alert', 'live_open_positions',
    ],
    review: [
      'kpi_expectancy', 'kpi_winrate', 'kpi_avg_r', 'kpi_profit_factor',
      'review_pnl_curve', 'review_calendar', 'review_trade_table',
      'review_phase_split', 'review_weekly_ai',
    ],
    research: [
      'kpi_expectancy', 'kpi_profit_factor', 'kpi_sharpe',
      'research_setup_matrix', 'research_time_of_day',
      'research_mae_mfe', 'research_drawdown_dist',
    ],
  },

  alpha: {
    live: [
      'kpi_pnl', 'kpi_risk_used', 'kpi_avg_r', 'kpi_streak', 'kpi_winrate',
      'live_risk_meter', 'live_limit_tiers',
      'live_session_clock', 'live_economic_alert', 'live_open_positions',
      'research_volatility_clus', 'research_orderflow_imb',
    ],
    review: [
      'kpi_expectancy', 'kpi_winrate', 'kpi_avg_r',
      'kpi_profit_factor', 'kpi_sharpe',
      'review_pnl_curve', 'review_calendar', 'review_trade_table',
      'review_phase_split', 'review_emotion_log', 'review_weekly_ai',
    ],
    research: [
      'kpi_expectancy', 'kpi_profit_factor', 'kpi_sharpe',
      'research_setup_matrix', 'research_time_of_day',
      'research_mae_mfe', 'research_correlation',
      'research_volatility_clus', 'research_orderflow_imb',
      'research_regime_map', 'research_drawdown_dist',
    ],
  },
};

// ── Derivation helpers ───────────────────────────────────────────────

/** Map (opMode, isAlpha) from settings to a normalized Experience. */
export function deriveExperience(opMode: string, isAlpha: boolean): Experience {
  if (opMode === 'beginner') return 'beginner';
  if (isAlpha) return 'alpha';
  return 'standard';
}

/** Map opMode to a dashboard State. Beginner collapses to 'live'/'review'. */
export function deriveState(opMode: string): DashState {
  if (opMode === 'research') return 'research';
  if (opMode === 'review')   return 'review';
  return 'live'; // 'live' OR 'beginner' default
}

/** True if widget is allowed in the current (exp, state) cell. */
export function isWidgetVisible(
  widget: WidgetId,
  exp: Experience,
  state: DashState
): boolean {
  const cell = DASHBOARD_MATRIX[exp][state];
  return cell !== null && cell.includes(widget);
}

/** True if the entire cell is locked (e.g. beginner × research). */
export function isCellLocked(exp: Experience, state: DashState): boolean {
  return DASHBOARD_MATRIX[exp][state] === null;
}

/** Returns the ordered allowlist (or [] if locked). */
export function widgetsFor(exp: Experience, state: DashState): readonly WidgetId[] {
  return DASHBOARD_MATRIX[exp][state] ?? [];
}
