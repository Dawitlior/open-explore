// Semantic metric registry — the analytics safeguard against customization.
//
// Dashboards and on-device AI MUST read review data via these keys, never by
// label or position. When a customized template omits a metric, consumers
// render a "not tracked this period" gap — never fabricate, never crash.
//
// Wave 0 ships the registry as constants only; no consumers are wired yet.
// Wave 5 rewires dashboards/AI against this contract.

export const METRIC_KEYS = {
  EXECUTION_SCORE: 'execution_score',
  GRADE: 'grade',
  NET_R: 'net_r',
  WIN_RATE: 'win_rate',
  AVG_R: 'avg_r',
  RR: 'rr',
  TRADE_COUNT: 'trade_count',
  RULES_COMPLIANCE: 'rules_compliance',
  DISCIPLINE_VIOLATIONS: 'discipline_violations',
  DOMINANT_EMOTION: 'dominant_emotion',
  FOCUS_RATING: 'focus_rating',
  BIGGEST_MISTAKE: 'biggest_mistake',
  REPEATED_MISTAKE: 'repeated_mistake',
  MINDSET_TAGS: 'mindset_tags',
  MARKET_ENVIRONMENT: 'market_environment',
  EXECUTION_POSITIONING: 'execution_positioning',
  DECISION_QUALITY: 'decision_quality',
  STRATEGY_ADHERENCE: 'strategy_adherence',
} as const;

export type MetricKey = typeof METRIC_KEYS[keyof typeof METRIC_KEYS];

export interface MetricSpec {
  key: MetricKey;
  /** Storage type of the value the consumer will read. */
  type: 'number' | 'ratio' | 'enum' | 'enum[]' | 'bool' | 'string';
  /** Human-friendly description for dashboards and AI. */
  description: string;
  /** True if missing the metric should render a "not tracked" gap rather than zero. */
  gapOnMissing: boolean;
}

export const METRIC_REGISTRY: Record<MetricKey, MetricSpec> = {
  execution_score:        { key: 'execution_score',        type: 'number', description: 'Self-rated execution checklist score, 0–100.', gapOnMissing: true },
  grade:                  { key: 'grade',                  type: 'enum',   description: 'A+ … F from gradeWeek().',                       gapOnMissing: false },
  net_r:                  { key: 'net_r',                  type: 'number', description: 'Sum of returnR for the week.',                   gapOnMissing: false },
  win_rate:               { key: 'win_rate',               type: 'ratio',  description: 'Wins / (wins + losses).',                        gapOnMissing: false },
  avg_r:                  { key: 'avg_r',                  type: 'number', description: 'Average R per trade for the week.',              gapOnMissing: false },
  rr:                     { key: 'rr',                     type: 'number', description: 'Average win R / average loss R.',                gapOnMissing: false },
  trade_count:            { key: 'trade_count',            type: 'number', description: 'Number of trades in the week.',                  gapOnMissing: false },
  rules_compliance:       { key: 'rules_compliance',       type: 'ratio',  description: 'Ratio of trades that followed the rules.',        gapOnMissing: false },
  discipline_violations:  { key: 'discipline_violations',  type: 'number', description: 'Self-reported discipline violation count.',      gapOnMissing: true },
  dominant_emotion:       { key: 'dominant_emotion',       type: 'enum',   description: 'Slug of the dominant emotion option.',           gapOnMissing: true },
  focus_rating:           { key: 'focus_rating',           type: 'number', description: 'Focus rating 1–5 (0 = not set).',                gapOnMissing: true },
  biggest_mistake:        { key: 'biggest_mistake',        type: 'enum',   description: 'Slug of the biggest-mistake option.',            gapOnMissing: true },
  repeated_mistake:       { key: 'repeated_mistake',       type: 'bool',   description: 'true = repeated last week, false = improved.',   gapOnMissing: true },
  mindset_tags:           { key: 'mindset_tags',           type: 'enum[]', description: 'Selected mindset tag slugs.',                    gapOnMissing: true },
  market_environment:     { key: 'market_environment',     type: 'enum',   description: 'Slug of the market-environment option.',         gapOnMissing: true },
  execution_positioning:  { key: 'execution_positioning',  type: 'enum',   description: 'Slug of the positioning option.',                gapOnMissing: true },
  decision_quality:       { key: 'decision_quality',       type: 'enum',   description: 'Slug of the decision-quality bucket.',           gapOnMissing: true },
  strategy_adherence:     { key: 'strategy_adherence',     type: 'ratio',  description: 'Ratio of strategy edges marked positive.',       gapOnMissing: true },
};
