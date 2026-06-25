// ORCA Default Weekly Review template (Wave 0 seed, basedOn = orca_default_v1).
//
// Reconciled byte-for-byte against tabs/WeeklyTab.tsx — where §12 of the CWR
// spec disagreed with the live code, the live code wins. Notable corrections:
//   • Prep / Strategy cycle = ['neutral','done','missed']
//     Execution     cycle = ['neutral','missed','done']
//   • Strategy edge #3 (forced_trades) has inverted polarity (goodIs:'missed')
//   • Risk gauges and Grade live as their own sections, not inside `trades`
//   • Recurring violation pattern is a free-TEXT block (not binary)
//   • EN prep coffee = "Coffee ready ☕" (not "Make coffee ☕")
//   • Decision options carry HE+EN sub-labels (Option.sublabel)
//
// All IDs are STABLE SLUGS — they are the canonical immutable identifiers
// and MUST NEVER be renamed (Wave-2 merge is additive-only; rename would
// orphan historical values).

import type { WeeklyReviewSchema } from './wr-schema';
import { METRIC_KEYS } from './wr-metrics';

export const ORCA_DEFAULT_TEMPLATE: WeeklyReviewSchema = {
  schemaFormatVersion: 1,
  meta: {
    name: 'ORCA Weekly Review',
    localeDefault: 'he',
    basedOn: 'orca_default_v1',
    templateVersion: 1,
  },
  sections: [
    // ── 1. PREP ─────────────────────────────────────────────────────────
    {
      id: 'prep',
      icon: '✅',
      title: { he: 'הכנה', en: 'Preparation' },
      order: 10,
      blocks: [
        {
          id: 'prep_checklist',
          type: 'checklist',
          order: 10,
          helpText: {
            he: 'לחץ: — → ✅ בוצע → ❌ לא בוצע',
            en: 'Tap to cycle: — → ✅ done → ❌ missed',
          },
          config: {
            cycle: ['neutral', 'done', 'missed'],
            goodIs: 'done',
            items: [
              { id: 'coffee',    label: { he: 'הכנת קפה ☕', en: 'Coffee ready ☕' } },
              { id: 'open_stat', label: { he: 'פתיחת לוג סטטיסטי (Statistical Trade Log)', en: 'Open Statistical Trade Log' } },
              { id: 'open_cal',  label: { he: 'פתיחת יומן קלנדרי (Weekly Calendar)',         en: 'Open Weekly Calendar' } },
              { id: 'open_mkt',  label: { he: 'פתיחת Market Journal',                          en: 'Open Market Journal' } },
              // NOTE: prep deep-link `action` deferred to Wave-3 wiring per
              // Wave-0 zero-UX-change rule. Seed items remain plain checks.
            ],
          },
        },
      ],
    },

    // ── 2. TRADES (system spine) ────────────────────────────────────────
    {
      id: 'trades',
      icon: '📓',
      title: { he: 'עסקאות השבוע', en: 'Week trades' },
      system: true,
      removable: false,
      order: 20,
      blocks: [
        { id: 'trades_table', type: 'system-trades-table', order: 10, locked: true, removable: false, editable: false },
        { id: 'stat_chips',   type: 'system-stat-chips',   order: 20, locked: true, removable: false, editable: false,
          metricKey: METRIC_KEYS.NET_R /* representative; chips expose net_r/win_rate/avg_r/rr/trade_count */ },
      ],
    },

    // ── 3. RISK LIMITS (system, chromeless) ─────────────────────────────
    {
      id: 'risk',
      chromeless: true,
      removable: true,            // user may hide if they don't run limits
      order: 30,
      blocks: [
        { id: 'risk_gauges', type: 'system-risk-gauges', order: 10, editable: false },
      ],
    },

    // ── 4. EXECUTION QUALITY ────────────────────────────────────────────
    {
      id: 'execution',
      icon: '🎯',
      title: { he: 'איכות ביצוע', en: 'Execution quality' },
      order: 40,
      blocks: [
        {
          id: 'exec_score',
          type: 'score',
          order: 10,
          label: { he: 'Execution Score', en: 'Execution Score' },
          helpText: {
            he: 'ציון מבוסס צ׳קליסט (לחץ: — → ❌ → ✅)',
            en: 'Score from the checklist (tap: — → ❌ → ✅)',
          },
          metricKey: METRIC_KEYS.EXECUTION_SCORE,
          editable: false,
          config: { source: 'exec_checklist', method: 'checklist_percent', scoreMax: 100 },
        },
        {
          id: 'exec_checklist',
          type: 'checklist',
          order: 20,
          config: {
            cycle: ['neutral', 'missed', 'done'],
            goodIs: 'done',
            items: [
              { id: 'entry_followed_plan',   label: { he: 'כניסה עקבה אחרי התוכנית', en: 'Entry followed the plan' } },
              { id: 'stop_loss_respected',   label: { he: 'Stop Loss נשמר',          en: 'Stop Loss respected' } },
              { id: 'no_chasing_price',      label: { he: 'לא רדפתי אחרי מחיר',      en: 'Did not chase price' } },
              { id: 'correct_position_size', label: { he: 'גודל פוזיציה נכון',       en: 'Correct position size' } },
              { id: 'no_revenge_trade',      label: { he: 'ללא מסחר נקמה',            en: 'No revenge trade' } },
            ],
          },
        },
      ],
    },

    // ── 5. STRATEGY ADHERENCE ───────────────────────────────────────────
    {
      id: 'strategy',
      icon: '🎯',
      title: { he: 'איכות אסטרטגיה', en: 'Strategy adherence' },
      order: 50,
      blocks: [
        {
          id: 'strategy_adherence',
          type: 'checklist',
          order: 10,
          metricKey: METRIC_KEYS.STRATEGY_ADHERENCE,
          config: {
            cycle: ['neutral', 'done', 'missed'],
            goodIs: 'done',
            items: [
              { id: 'setup_expected', tag: 'P', goodIs: 'done',
                label: { he: 'האם ה-Primary Setup התנהג כצפוי?',         en: 'Did the Primary Setup behave as expected?' } },
              { id: 'normal_week',    tag: 'P', goodIs: 'done',
                label: { he: 'האם זה היה שבוע סטטיסטי נורמלי לסטאפ?',   en: 'Was this a statistically normal week for the setup?' } },
              { id: 'forced_trades',  tag: 'P', goodIs: 'missed',
                label: { he: 'האם כפיתי עסקאות לא נקיות (Forced Trades)?', en: 'Did I force any non-clean trades?' } },
              { id: 'followed_rules', tag: 'P', goodIs: 'done',
                label: { he: 'האם כל העסקאות עקבו אחרי החוקים?',         en: 'Did every trade follow the rules?' } },
            ],
          },
        },
        {
          id: 'violations',
          type: 'number',
          order: 20,
          label: { he: 'מספר הפרות משמעת', en: 'Discipline violations count' },
          metricKey: METRIC_KEYS.DISCIPLINE_VIOLATIONS,
          config: { min: 0, step: 1, placeholder: { he: '0', en: '0' } },
        },
        {
          id: 'violation_pattern',
          type: 'text',
          order: 30,
          label: { he: 'דפוס חוזר של הפרה?', en: 'Recurring violation pattern?' },
          config: { placeholder: { he: 'תאר...', en: 'Describe…' } },
        },
      ],
    },

    // ── 6. MARKET CONTEXT ───────────────────────────────────────────────
    {
      id: 'market',
      icon: '🌍',
      title: { he: 'הקשר שוק', en: 'Market context' },
      order: 60,
      blocks: [
        {
          id: 'environment',
          type: 'select',
          order: 10,
          label: { he: 'סביבת שוק', en: 'Market environment' },
          metricKey: METRIC_KEYS.MARKET_ENVIRONMENT,
          config: {
            variant: 'dropdown',
            placeholder: { he: '— בחר —', en: '— choose —' },
            options: [
              { id: 'trending', label: { he: 'Trending', en: 'Trending' } },
              { id: 'ranging',  label: { he: 'Ranging',  en: 'Ranging' } },
              { id: 'low_vol',  label: { he: 'Low Vol',  en: 'Low Vol' } },
              { id: 'high_vol', label: { he: 'High Vol', en: 'High Vol' } },
              { id: 'choppy',   label: { he: 'Choppy',   en: 'Choppy' } },
            ],
          },
        },
        {
          id: 'positioning',
          type: 'select',
          order: 20,
          label: { he: 'Execution Positioning', en: 'Execution positioning' },
          metricKey: METRIC_KEYS.EXECUTION_POSITIONING,
          config: {
            variant: 'dropdown',
            placeholder: { he: '— בחר —', en: '— choose —' },
            options: [
              { id: 'aggressive', label: { he: 'Aggressive', en: 'Aggressive' } },
              { id: 'passive',    label: { he: 'Passive',    en: 'Passive' } },
              { id: 'balanced',   label: { he: 'Balanced',   en: 'Balanced' } },
            ],
          },
        },
      ],
    },

    // ── 7. PSYCHOLOGY ───────────────────────────────────────────────────
    {
      id: 'psychology',
      icon: '🧠',
      title: { he: 'פסיכולוגיה וניהול עצמי', en: 'Mindset & self-management' },
      order: 70,
      blocks: [
        {
          id: 'emotion',
          type: 'select',
          order: 10,
          label: { he: 'איך הרגשת השבוע?', en: 'How did the week feel?' },
          helpText: { he: 'בחר את המצב הרגשי הדומיננטי שלך', en: 'Pick your dominant emotion' },
          metricKey: METRIC_KEYS.DOMINANT_EMOTION,
          config: {
            variant: 'pills',
            options: [
              { id: 'in_the_zone', label: { he: 'In the Zone', en: 'In the Zone' }, emoji: '🔥' },
              { id: 'neutral',     label: { he: 'Neutral',     en: 'Neutral' },     emoji: '🧊' },
              { id: 'fearful',     label: { he: 'Fearful',     en: 'Fearful' },     emoji: '😨' },
              { id: 'confident',   label: { he: 'Confident',   en: 'Confident' },   emoji: '💪' },
              { id: 'frustrated',  label: { he: 'Frustrated',  en: 'Frustrated' },  emoji: '😤' },
              { id: 'calm',        label: { he: 'Calm',        en: 'Calm' },        emoji: '😌' },
            ],
          },
        },
        {
          id: 'focus',
          type: 'scale',
          order: 20,
          label: { he: 'דירוג פוקוס השבוע', en: 'Focus rating' },
          helpText: { he: 'Low · 5 = Excellent | 1', en: 'Low · 5 = Excellent | 1' },
          metricKey: METRIC_KEYS.FOCUS_RATING,
          config: {
            scaleMin: 1,
            scaleMax: 5,
            minLabel: { he: 'Low', en: 'Low' },
            maxLabel: { he: 'Excellent', en: 'Excellent' },
          },
        },
        {
          id: 'biggest_mistake',
          type: 'select',
          order: 30,
          label: { he: 'הטעות הגדולה ביותר השבוע', en: 'Biggest mistake of the week' },
          helpText: { he: 'אם לא הייתה טעות — בחר None', en: 'If none — choose "None"' },
          metricKey: METRIC_KEYS.BIGGEST_MISTAKE,
          config: {
            variant: 'pills',
            options: [
              { id: 'none',     label: { he: 'None',     en: 'None' } },
              { id: 'chasing',  label: { he: 'Chasing',  en: 'Chasing' } },
              { id: 'no_sl',    label: { he: 'No SL',    en: 'No SL' } },
              { id: 'oversize', label: { he: 'Oversize', en: 'Oversize' } },
              { id: 'fomo',     label: { he: 'FOMO',     en: 'FOMO' } },
            ],
          },
        },
        {
          id: 'repeat_mistake',
          type: 'binary',
          order: 40,
          label: { he: 'חזרת על טעות מהשבוע הקודם?', en: "Repeated last week's mistake?" },
          helpText: { he: 'כנות עם עצמך היא הצעד הראשון לשיפור', en: 'Honesty is the first step to improvement' },
          metricKey: METRIC_KEYS.REPEATED_MISTAKE,
          config: {
            allowNeutral: true,
            // Live semantics: draft.repeatMistake === false  → "improved" (positive)
            //                 draft.repeatMistake === true   → "repeated" (negative)
            goodValue: 'no',
            valueMap: {
              no:  { he: 'לא, שיפרתי',   en: 'No, improved' },
              yes: { he: 'כן, חזרתי',     en: 'Yes, repeated' },
            },
          },
        },
        {
          id: 'mindset_tags',
          type: 'multiselect',
          order: 50,
          label: { he: 'תגיות מסחר', en: 'Trader tags' },
          helpText: { he: 'בחר כמה שרוצה', en: 'Pick as many as fit' },
          metricKey: METRIC_KEYS.MINDSET_TAGS,
          config: {
            variant: 'pills',
            options: [
              { id: 'tired',          label: { he: 'Tired',          en: 'Tired' } },
              { id: 'sharp',          label: { he: 'Sharp',          en: 'Sharp' } },
              { id: 'overconfident',  label: { he: 'Overconfident',  en: 'Overconfident' } },
              { id: 'hesitant',       label: { he: 'Hesitant',       en: 'Hesitant' } },
              { id: 'disciplined',    label: { he: 'Disciplined',    en: 'Disciplined' } },
              { id: 'patient',        label: { he: 'Patient',        en: 'Patient' } },
              { id: 'revenge',        label: { he: 'Revenge',        en: 'Revenge' } },
              { id: 'fomo',           label: { he: 'FOMO',           en: 'FOMO' } },
            ],
          },
        },
        {
          id: 'reflection',
          type: 'textarea',
          order: 60,
          label: { he: 'סיכום מחשבות חופשי', en: 'Free reflection' },
          helpText: { he: 'מה עבד? מה לא? מה לוקח לשבוע הבא?', en: "What worked? What didn't? What to bring next week?" },
          config: {
            maxLength: 5000,
            placeholder: { he: 'כתוב כאן בחופשיות...', en: 'Write freely…' },
          },
        },
      ],
    },

    // ── 8. DECISION QUALITY ─────────────────────────────────────────────
    {
      id: 'decision',
      icon: '📊',
      title: { he: 'איכות החלטות', en: 'Decision quality' },
      order: 80,
      blocks: [
        {
          id: 'decision_quality',
          type: 'select',
          order: 10,
          metricKey: METRIC_KEYS.DECISION_QUALITY,
          config: {
            variant: 'pills',
            // Live order: D, C, B, A+
            options: [
              { id: 'd',      label: { he: 'D',  en: 'D' },  sublabel: { he: 'מסחר רגשי',   en: 'Emotional trading' } },
              { id: 'c',      label: { he: 'C',  en: 'C' },  sublabel: { he: 'מספר טעויות', en: 'Several mistakes' } },
              { id: 'b',      label: { he: 'B',  en: 'B' },  sublabel: { he: 'משמעת טובה',  en: 'Good discipline' } },
              { id: 'a_plus', label: { he: 'A+', en: 'A+' }, sublabel: { he: 'ביצוע מושלם', en: 'Perfect execution' } },
            ],
          },
        },
      ],
    },

    // ── 9. FINAL GRADE (system) ─────────────────────────────────────────
    {
      id: 'grade',
      icon: '🏆',
      title: { he: 'ציון סופי', en: 'Final grade' },
      system: true,
      removable: false,
      order: 90,
      blocks: [
        { id: 'final_grade', type: 'system-grade', order: 10, locked: true, removable: false, editable: false,
          metricKey: METRIC_KEYS.GRADE },
      ],
    },

    // ── 10. AI INSIGHTS (system, removable) ─────────────────────────────
    {
      id: 'insights',
      icon: '🧊',
      title: { he: 'תובנות מערכת', en: 'System insights' },
      removable: true,
      order: 100,
      blocks: [
        { id: 'ai_insights', type: 'system-ai-insights', order: 10, editable: false },
      ],
    },
  ],
};
