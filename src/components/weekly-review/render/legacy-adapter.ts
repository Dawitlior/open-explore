// Wave-0 legacy adapter — bidirectional bridge between schema block IDs
// (using stable slugs) and the existing WeekDraft typed fields.
//
// Wave 0 keeps persistence on the existing draft keys; the renderer reads
// values through `read()` and writes through `write()`. The slug ↔ legacy
// label translation lives here, so adding new slug-keyed values in Wave 1
// is purely additive — this module's surface does not change.

import type { WeekDraft, ExecutionChecklist } from '../hooks/use-week-draft';
import type { ChecklistState, ReviewValues } from '../lib/wr-schema';

// ── Slug ↔ legacy-label tables ───────────────────────────────────────────
// Slugs are the canonical IDs (immutable). Legacy labels are what the live
// app stores in `draft.emotion`, `draft.bigMistake`, etc.

const EMOTION: Record<string, string> = {
  in_the_zone: 'In the Zone',
  neutral:     'Neutral',
  fearful:     'Fearful',
  confident:   'Confident',
  frustrated:  'Frustrated',
  calm:        'Calm',
};
const MINDSET_TAG: Record<string, string> = {
  tired: 'Tired', sharp: 'Sharp', overconfident: 'Overconfident', hesitant: 'Hesitant',
  disciplined: 'Disciplined', patient: 'Patient', revenge: 'Revenge', fomo: 'FOMO',
};
const MISTAKE: Record<string, string> = {
  none: 'None', chasing: 'Chasing', no_sl: 'No SL', oversize: 'Oversize', fomo: 'FOMO',
};
const ENV: Record<string, string> = {
  trending: 'Trending', ranging: 'Ranging', low_vol: 'Low Vol', high_vol: 'High Vol', choppy: 'Choppy',
};
const POS: Record<string, string> = {
  aggressive: 'Aggressive', passive: 'Passive', balanced: 'Balanced',
};
const DECISION: Record<string, WeekDraft['decisionQuality']> = {
  d: 'D', c: 'C', b: 'B', a_plus: 'A+',
};

function invert<T extends string>(m: Record<string, T>): Record<T, string> {
  const out = {} as Record<T, string>;
  for (const [slug, label] of Object.entries(m)) (out as Record<string, string>)[label] = slug;
  return out;
}
const EMOTION_R     = invert(EMOTION);
const MINDSET_TAG_R = invert(MINDSET_TAG);
const MISTAKE_R     = invert(MISTAKE);
const ENV_R         = invert(ENV);
const POS_R         = invert(POS);
const DECISION_R: Record<string, string> = {
  D: 'd', C: 'c', B: 'b', 'A+': 'a_plus', '': '',
};

// ── Tri-state mapping ────────────────────────────────────────────────────
// Prep / Strategy live encoding (cyclePrep / cycleEdge): 0=neutral, 1=done, 2=missed
const PREPLIKE_NUM_TO_STATE: ChecklistState[] = ['neutral', 'done', 'missed'];
const PREPLIKE_STATE_TO_NUM: Record<ChecklistState, number> = { neutral: 0, done: 1, missed: 2 };

// Execution live encoding (cycleExec): null=neutral, false=missed, true=done
function execValToState(v: boolean | null): ChecklistState {
  if (v === null) return 'neutral';
  return v ? 'done' : 'missed';
}
function execStateToVal(s: ChecklistState): boolean | null {
  if (s === 'neutral') return null;
  return s === 'done' ? true : false;
}

// Block-id ↔ checklist-item-slug mappings (positional in the legacy arrays)
const PREP_ITEM_IDS = ['coffee', 'open_stat', 'open_cal', 'open_mkt'] as const;
const STRATEGY_ITEM_IDS = ['setup_expected', 'normal_week', 'forced_trades', 'followed_rules'] as const;
const EXEC_ITEM_KEYS: { id: string; key: keyof ExecutionChecklist }[] = [
  { id: 'entry_followed_plan',   key: 'entryFollowedPlan' },
  { id: 'stop_loss_respected',   key: 'stopLossRespected' },
  { id: 'no_chasing_price',      key: 'noChasingPrice' },
  { id: 'correct_position_size', key: 'correctPositionSize' },
  { id: 'no_revenge_trade',      key: 'noRevengeTrade' },
];

// ── PUBLIC: read draft → schema-keyed values ─────────────────────────────

export function readDraft(draft: WeekDraft): ReviewValues {
  const prepChecklist: Record<string, ChecklistState> = {};
  draft.preps.forEach((n, i) => {
    const id = PREP_ITEM_IDS[i];
    if (id) prepChecklist[id] = PREPLIKE_NUM_TO_STATE[n] ?? 'neutral';
  });

  const strategyChecklist: Record<string, ChecklistState> = {};
  draft.edges.forEach((n, i) => {
    const id = STRATEGY_ITEM_IDS[i];
    if (id) strategyChecklist[id] = PREPLIKE_NUM_TO_STATE[n] ?? 'neutral';
  });

  const execChecklist: Record<string, ChecklistState> = {};
  for (const { id, key } of EXEC_ITEM_KEYS) {
    execChecklist[id] = execValToState(draft.executionChecklist[key]);
  }

  const legacy: ReviewValues = {
    prep_checklist:     prepChecklist,
    exec_checklist:     execChecklist,
    strategy_adherence: strategyChecklist,
    violations:         draft.violations === '' ? null : Number(draft.violations) || 0,
    violation_pattern:  draft.violationPattern,
    environment:        ENV_R[draft.env] ?? '',
    positioning:        POS_R[draft.pos] ?? '',
    emotion:            EMOTION_R[draft.emotion] ?? '',
    focus:              draft.focusRating || 0,
    biggest_mistake:    MISTAKE_R[draft.bigMistake] ?? '',
    repeat_mistake:     draft.repeatMistake === null
      ? ''
      : draft.repeatMistake === false ? 'no' : 'yes',
    mindset_tags:       draft.mindsetTags.map(t => MINDSET_TAG_R[t]).filter(Boolean),
    reflection:         draft.mindset,
    decision_quality:   DECISION_R[draft.decisionQuality] ?? '',
  };

  // Wave-1 — generic values map layered ON TOP. For built-in slugs both stores
  // are dual-written; the generic map is authoritative. For checklist blocks
  // we MERGE (not replace) so custom-added items appear alongside built-ins.
  const generic = draft.values || {};
  const out: ReviewValues = { ...legacy };
  for (const [k, v] of Object.entries(generic)) {
    if (v == null) continue;
    const prev = out[k];
    if (prev && typeof prev === 'object' && !Array.isArray(prev) && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = { ...(prev as Record<string, ChecklistState>), ...(v as Record<string, ChecklistState>) };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      out[k] = v as any;
    }
  }
  return out;
}

// ── PUBLIC: write a single block update back to the legacy draft ─────────

export type DraftPatch = Partial<WeekDraft>;

/**
 * Translate a schema-block change into the equivalent draft patch.
 *
 * Wave-1: ALWAYS dual-writes into `current.values[blockId]` so unknown
 * (custom-added) blocks persist via the generic store and built-ins
 * survive a legacy→generic transition cleanly.
 *
 * Returns `null` ONLY for system / computed blocks (read-only).
 */
export function writeBlock(
  blockId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  current: WeekDraft,
): DraftPatch | null {
  // System / computed blocks remain read-only.
  switch (blockId) {
    case 'exec_score':
    case 'final_grade':
    case 'trades_table':
    case 'stat_chips':
    case 'risk_gauges':
    case 'ai_insights':
      return null;
  }

  // Always dual-write into the generic values map (Wave-1 canonical store).
  const baseValues = (current.values && typeof current.values === 'object') ? current.values : {};
  const nextValues: Record<string, unknown> = { ...baseValues, [blockId]: value };
  const legacyPatch: DraftPatch = {};

  switch (blockId) {
    case 'prep_checklist': {
      const itemMap = value as Record<string, ChecklistState>;
      const next = [...current.preps];
      PREP_ITEM_IDS.forEach((id, i) => {
        const s = itemMap?.[id];
        if (s) next[i] = PREPLIKE_STATE_TO_NUM[s];
      });
      legacyPatch.preps = next;
      break;
    }
    case 'strategy_adherence': {
      const itemMap = value as Record<string, ChecklistState>;
      const next = [...current.edges];
      STRATEGY_ITEM_IDS.forEach((id, i) => {
        const s = itemMap?.[id];
        if (s) next[i] = PREPLIKE_STATE_TO_NUM[s];
      });
      legacyPatch.edges = next;
      break;
    }
    case 'exec_checklist': {
      const itemMap = value as Record<string, ChecklistState>;
      const next: ExecutionChecklist = { ...current.executionChecklist };
      for (const { id, key } of EXEC_ITEM_KEYS) {
        const s = itemMap?.[id];
        if (s) next[key] = execStateToVal(s);
      }
      legacyPatch.executionChecklist = next;
      break;
    }
    case 'violations':
      legacyPatch.violations = value == null ? '' : String(value); break;
    case 'violation_pattern':
      legacyPatch.violationPattern = String(value ?? ''); break;
    case 'environment':
      legacyPatch.env = ENV[String(value)] ?? ''; break;
    case 'positioning':
      legacyPatch.pos = POS[String(value)] ?? ''; break;
    case 'emotion':
      legacyPatch.emotion = EMOTION[String(value)] ?? ''; break;
    case 'focus':
      legacyPatch.focusRating = Number(value) || 0; break;
    case 'biggest_mistake':
      legacyPatch.bigMistake = MISTAKE[String(value)] ?? ''; break;
    case 'repeat_mistake':
      legacyPatch.repeatMistake = (value === '' || value == null) ? null : value === 'yes'; break;
    case 'mindset_tags': {
      const slugs = (value as string[]) ?? [];
      legacyPatch.mindsetTags = slugs.map(s => MINDSET_TAG[s]).filter(Boolean); break;
    }
    case 'reflection':
      legacyPatch.mindset = String(value ?? '').slice(0, 5000); break;
    case 'decision_quality':
      legacyPatch.decisionQuality = DECISION[String(value)] ?? ''; break;
    default:
      // Custom / schema-only block — generic store carries it alone.
      break;
  }

  return { ...legacyPatch, values: nextValues };
}

// Internal exports for tests
export const __internals = {
  EMOTION, MINDSET_TAG, MISTAKE, ENV, POS, DECISION,
  PREP_ITEM_IDS, STRATEGY_ITEM_IDS, EXEC_ITEM_KEYS,
};
