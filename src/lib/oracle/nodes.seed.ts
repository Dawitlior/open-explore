/**
 * Oracle Core — Seed scenarios (Phase 1).
 * A small but representative catalog covering 5 macro clusters,
 * with one trap pair and one depth-probe template per dimension.
 *
 * Inserted into `oracle_nodes` via a follow-up data migration.
 * Kept in-code as well so the engine can run offline / in tests.
 */

import type { OracleNode } from './types';

export const ORACLE_SEED_NODES: OracleNode[] = [
  // ─── Cluster: Impulsivity ──────────────────────────────────────
  {
    code: 'IMP_01_BREAKOUT',
    category: 'impulsivity',
    tier: 1,
    prompt_he: 'BTC פורץ התנגדות מרכזית בנפח עולה. אין לך תכנית מוקדמת לרמה הזו. מה אתה עושה ב-3 השניות הבאות?',
    prompt_en: 'BTC breaks a key resistance on rising volume. You had no plan for this level. What do you do in the next 3 seconds?',
    options: [
      { id: 'enter_market', label_he: 'נכנס מיד ב-Market', label_en: 'Enter immediately at market',
        weights: { impulsivity: 0.8, plan_drift: 0.6, fomo_amplitude: 0.7 } },
      { id: 'small_probe',  label_he: 'נכנס בפוזיציה קטנה לבדיקה', label_en: 'Enter a small probe position',
        weights: { impulsivity: 0.3, rule_adherence: 0.2 } },
      { id: 'wait_retest',  label_he: 'מחכה לרי-טסט', label_en: 'Wait for a retest',
        weights: { impulsivity: -0.5, rule_adherence: 0.6, decision_fatigue_slope: 0.1 } },
      { id: 'skip_setup',   label_he: 'לא נכנס — אין תכנית', label_en: 'Skip — no plan',
        weights: { impulsivity: -0.8, rule_adherence: 0.9, plan_drift: -0.7 } },
    ],
    branches: {
      enter_market: 'LOSS_01_IMMEDIATE_RED',
      small_probe:  'LOSS_01_IMMEDIATE_RED',
      wait_retest:  'NAR_01_STORY',
      skip_setup:   'NAR_01_STORY',
      '*':          'NAR_01_STORY',
    },
  },

  // ─── Cluster: Loss Aversion ────────────────────────────────────
  {
    code: 'LOSS_01_IMMEDIATE_RED',
    category: 'loss_aversion',
    tier: 1,
    prompt_he: 'דקה אחרי הכניסה אתה ב-0.7R הפסד. הסטופ עוד לא נגוע. גופך מגיב לפני הראש. מה הצעד?',
    prompt_en: 'A minute after entry you are at -0.7R. Stop is not touched. Your body reacts before your mind. What do you do?',
    options: [
      { id: 'tighten_stop', label_he: 'מקרב סטופ כדי "להגן"', label_en: 'Tighten stop to "protect"',
        weights: { loss_aversion: 0.8, stop_moving_tendency: 0.9, freeze_at_red: 0.3 } },
      { id: 'add_average',  label_he: 'מוסיף — אני "צודק"', label_en: 'Add to position — I\'m "right"',
        weights: { loss_aversion: 0.4, impulsivity: 0.6, win_attribution_self: 0.7 } },
      { id: 'hold_plan',    label_he: 'נשאר עם התכנית, יושב על הידיים', label_en: 'Stick to plan, sit on hands',
        weights: { loss_aversion: -0.6, rule_adherence: 0.9, drawdown_pain_curve: -0.4 } },
      { id: 'exit_early',   label_he: 'יוצא עכשיו, "להפסיק את הכאב"', label_en: 'Exit now to "stop the pain"',
        weights: { loss_aversion: 0.9, freeze_at_red: 0.7, rule_adherence: -0.6 } },
    ],
    branches: { '*': 'EGO_01_BLAME' },
  },

  // ─── Cluster: Narrative vs Quant ───────────────────────────────
  {
    code: 'NAR_01_STORY',
    category: 'narrative_quant',
    tier: 1,
    prompt_he: 'חבר שולח לך טוויט של אנליסט מפורסם: "BTC ל-200K עד סוף הרבעון". איזו תגובה הכי מדויקת?',
    prompt_en: 'A friend forwards a tweet from a famous analyst: "BTC to 200K by quarter end." Which response is most accurate to you?',
    options: [
      { id: 'believe_act', label_he: 'מגדיל אקספוז\'ר על בסיס זה', label_en: 'Increase exposure based on this',
        weights: { story_dependency: 0.9, news_anchoring: 0.7, leverage_hubris: 0.5 } },
      { id: 'verify_data', label_he: 'בודק את הדאטה לבד לפני כל פעולה', label_en: 'Verify the data myself first',
        weights: { story_dependency: -0.7, chart_pattern_overfit: 0.2, rule_adherence: 0.4 } },
      { id: 'ignore',      label_he: 'מתעלם — לא רלוונטי לתכנית שלי', label_en: 'Ignore — irrelevant to my plan',
        weights: { story_dependency: -0.9, plan_drift: -0.6 } },
      { id: 'fade',        label_he: 'מנגד — אם זה ויראלי, השוק כבר תמחר', label_en: 'Fade — if it\'s viral, market already priced it',
        weights: { story_dependency: -0.4, news_anchoring: -0.5, win_attribution_self: 0.3 } },
    ],
    branches: { '*': 'RISK_01_MISMATCH' },
  },

  // ─── Cluster: Risk-Reality Mismatch ────────────────────────────
  {
    code: 'RISK_01_MISMATCH',
    category: 'risk_mismatch',
    tier: 1,
    prompt_he: 'אמרת שאתה סוחר ב-1% סיכון. הטרייד הבא הוא "סטאפ A+". כמה אתה באמת מסכן?',
    prompt_en: 'You said you risk 1% per trade. The next setup is "A+ conviction." How much do you actually risk?',
    options: [
      { id: 'one',     label_he: 'בדיוק 1%', label_en: 'Exactly 1%',
        weights: { rule_adherence: 0.9, 'self_reported_R vs chosen_R': -0.8 } },
      { id: 'one_five',label_he: '1.5% — סטאפ חזק יותר',  label_en: '1.5% — stronger setup',
        weights: { rule_adherence: -0.3, 'self_reported_R vs chosen_R': 0.4, leverage_hubris: 0.3 } },
      { id: 'two_plus',label_he: '2-3% — "אני בטוח"', label_en: '2-3% — "I\'m sure"',
        weights: { rule_adherence: -0.8, leverage_hubris: 0.9, 'self_reported_R vs chosen_R': 0.9 } },
      { id: 'half',    label_he: 'פחות — אני מפחד', label_en: 'Less — I\'m scared',
        weights: { loss_aversion: 0.7, freeze_at_red: 0.4 } },
    ],
    branches: { '*': 'IMP_02_TRAP' },
  },

  // ─── Trap pair for IMP_01 ──────────────────────────────────────
  {
    code: 'IMP_02_TRAP',
    category: 'impulsivity',
    tier: 2,
    trap: true,
    trap_pair: 'IMP_01_BREAKOUT',
    prompt_he: 'תרחיש: זיהית סטאפ מושלם לפי המערכת שלך, אבל הוא קופץ 1.2% לפני שאתה לוחץ "שלח". מה אתה עושה?',
    prompt_en: 'Scenario: you spot a perfect setup by your system, but it gaps 1.2% before you click "submit." What do you do?',
    options: [
      { id: 'chase',  label_he: 'רודף — לא רוצה לפספס', label_en: 'Chase — don\'t want to miss',
        weights: { impulsivity: 0.9, fomo_amplitude: 0.9 } },
      { id: 'reduce', label_he: 'נכנס בגודל קטן יותר',    label_en: 'Enter with reduced size',
        weights: { impulsivity: 0.2, rule_adherence: 0.4 } },
      { id: 'pass',   label_he: 'מוותר — הסטאפ נפגע',     label_en: 'Pass — setup invalidated',
        weights: { impulsivity: -0.9, rule_adherence: 0.9, plan_drift: -0.8 } },
    ],
    branches: { '*': 'EGO_01_BLAME' },
  },

  // ─── Cluster: Ego attribution ──────────────────────────────────
  {
    code: 'EGO_01_BLAME',
    category: 'ego',
    tier: 2,
    prompt_he: 'הפסדת 3 טריידים ברצף. השבוע סגרת -4R. מה הכי קרוב לאמת שלך הפנימית?',
    prompt_en: 'You lost 3 trades in a row. The week closed at -4R. What\'s closest to your inner truth?',
    options: [
      { id: 'market_fault', label_he: 'השוק לא הגיוני השבוע', label_en: 'The market made no sense this week',
        weights: { win_attribution_self: 0.6, loss_attribution_external: 0.9, rule_adherence: -0.3 } },
      { id: 'me_fault',     label_he: 'אני סטיתי מהמערכת',     label_en: 'I drifted from my system',
        weights: { loss_attribution_external: -0.8, plan_drift: 0.6, rule_adherence: 0.5 } },
      { id: 'mixed',        label_he: 'גם וגם — וזה בסדר',     label_en: 'Both — and that\'s ok',
        weights: { loss_attribution_external: -0.2, decision_fatigue_slope: 0.3 } },
      { id: 'no_loss',      label_he: 'לא נסגרתי באמת — עוד אחזיר', label_en: 'I haven\'t really lost — I\'ll get it back',
        weights: { loss_attribution_external: 0.9, win_attribution_self: 0.9, impulsivity: 0.4, revenge_trade_propensity: 0.9 } },
    ],
    branches: {},
  },

  // ─── Depth probes (referenced by engine.detectTrapContradiction) ─
  {
    code: 'PROBE_IMPULSIVITY_QUANT',
    category: 'depth_probe',
    tier: 3,
    prompt_he: 'בכמה אחוזים מהטריידים שלך ב-30 הימים האחרונים נכנסת בלי תכנית כתובה מראש?',
    prompt_en: 'In what % of your trades over the last 30 days did you enter without a written plan?',
    options: [
      { id: 'lt10',  label_he: 'פחות מ-10%',  label_en: 'Less than 10%',
        weights: { impulsivity: -0.8, rule_adherence: 0.7 } },
      { id: 'p10_30',label_he: '10-30%',     label_en: '10-30%',
        weights: { impulsivity: 0.3, rule_adherence: 0.1 } },
      { id: 'p30_60',label_he: '30-60%',     label_en: '30-60%',
        weights: { impulsivity: 0.7, plan_drift: 0.6 } },
      { id: 'gt60',  label_he: 'מעל 60%',    label_en: 'Above 60%',
        weights: { impulsivity: 1.0, plan_drift: 0.9, rule_adherence: -0.9 } },
    ],
    branches: {},
  },
  {
    code: 'PROBE_LOSS_AVERSION_QUANT',
    category: 'depth_probe',
    tier: 3,
    prompt_he: 'נתון: מתוך 100 הטריידים האחרונים, באיזה אחוז הזזת את הסטופ אחורה (הרחקת)?',
    prompt_en: 'Of your last 100 trades, in what % did you move your stop further away?',
    options: [
      { id: 'never', label_he: '0%',     label_en: '0%',
        weights: { stop_moving_tendency: -1.0, rule_adherence: 0.9 } },
      { id: 'few',   label_he: 'מתחת 10%', label_en: 'Under 10%',
        weights: { stop_moving_tendency: 0.2 } },
      { id: 'some',  label_he: '10-30%',  label_en: '10-30%',
        weights: { stop_moving_tendency: 0.7, loss_aversion: 0.6 } },
      { id: 'often', label_he: 'מעל 30%', label_en: 'Above 30%',
        weights: { stop_moving_tendency: 1.0, loss_aversion: 0.9, rule_adherence: -0.8 } },
    ],
    branches: {},
  },
];

/** Map of code → node, for O(1) engine lookups. */
export const ORACLE_NODES_BY_CODE: Record<string, OracleNode> = ORACLE_SEED_NODES.reduce(
  (acc, n) => { acc[n.code] = n; return acc; },
  {} as Record<string, OracleNode>,
);

/** Map a dimension key → the depth-probe node code that targets it. */
export function depthProbeForDimension(dim: string): string | null {
  const map: Record<string, string> = {
    impulsivity: 'PROBE_IMPULSIVITY_QUANT',
    fomo_amplitude: 'PROBE_IMPULSIVITY_QUANT',
    plan_drift: 'PROBE_IMPULSIVITY_QUANT',
    loss_aversion: 'PROBE_LOSS_AVERSION_QUANT',
    stop_moving_tendency: 'PROBE_LOSS_AVERSION_QUANT',
    freeze_at_red: 'PROBE_LOSS_AVERSION_QUANT',
  };
  return map[dim] ?? null;
}
