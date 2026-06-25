// Wave-0 adapter round-trip proof.
//
// For every slug-keyed block, `read(write(value, draft))` must yield back
// the same value, and `write(read(draft), draft)` must produce a patch that
// — when merged onto the draft — leaves `read(draft)` byte-identical.
// This is the institutional guarantee that the schema renderer cannot
// silently corrupt the existing draft shape.

import { describe, it, expect } from 'vitest';
import { readDraft, writeBlock } from '../legacy-adapter';
import { EMPTY_DRAFT, type WeekDraft } from '../../hooks/use-week-draft';

function withPatch(draft: WeekDraft, patch: Partial<WeekDraft> | null): WeekDraft {
  if (!patch) return draft;
  return {
    ...draft,
    ...patch,
    executionChecklist: { ...draft.executionChecklist, ...(patch.executionChecklist ?? {}) },
    values: { ...draft.values, ...(patch.values ?? {}) },
  };
}

const FILLED: WeekDraft = {
  ...EMPTY_DRAFT,
  preps: [1, 2, 0, 1],
  edges: [1, 0, 2, 1],
  violations: '3',
  violationPattern: 'late entries on Tuesday',
  env: 'Trending',
  pos: 'Balanced',
  emotion: 'In the Zone',
  focusRating: 4,
  bigMistake: 'No SL',
  repeatMistake: false,
  mindsetTags: ['Sharp', 'Disciplined'],
  mindset: 'Solid week, kept SLs honest.',
  executionChecklist: {
    entryFollowedPlan: true,
    stopLossRespected: true,
    noChasingPrice: null,
    correctPositionSize: false,
    noRevengeTrade: true,
  },
  decisionQuality: 'A+',
  grade: '',
};

describe('CWR · Wave-0 adapter round-trip', () => {
  it('reads a filled draft into slug-keyed values', () => {
    const v = readDraft(FILLED);
    expect(v.emotion).toBe('in_the_zone');
    expect(v.environment).toBe('trending');
    expect(v.positioning).toBe('balanced');
    expect(v.biggest_mistake).toBe('no_sl');
    expect(v.mindset_tags).toEqual(['sharp', 'disciplined']);
    expect(v.repeat_mistake).toBe('no');
    expect(v.decision_quality).toBe('a_plus');
    expect(v.violations).toBe(3);
    expect(v.violation_pattern).toBe('late entries on Tuesday');
    expect(v.focus).toBe(4);
    expect(v.reflection).toBe('Solid week, kept SLs honest.');
    expect(v.prep_checklist).toEqual({
      coffee: 'done', open_stat: 'missed', open_cal: 'neutral', open_mkt: 'done',
    });
    expect(v.strategy_adherence).toEqual({
      setup_expected: 'done', normal_week: 'neutral', forced_trades: 'missed', followed_rules: 'done',
    });
    expect(v.exec_checklist).toEqual({
      entry_followed_plan: 'done',
      stop_loss_respected: 'done',
      no_chasing_price: 'neutral',
      correct_position_size: 'missed',
      no_revenge_trade: 'done',
    });
  });

  it('round-trips every block: write(value) preserves read(value)', () => {
    const before = readDraft(FILLED);
    const blockIds = Object.keys(before);
    let work = FILLED;
    for (const blockId of blockIds) {
      const patch = writeBlock(blockId, before[blockId], work);
      work = withPatch(work, patch);
    }
    const after = readDraft(work);
    expect(after).toEqual(before);
  });

  it('returns null for system / read-only blocks', () => {
    for (const id of ['exec_score', 'final_grade', 'trades_table', 'stat_chips', 'risk_gauges', 'ai_insights']) {
      expect(writeBlock(id, 'anything', FILLED)).toBeNull();
    }
  });

  it('handles empty draft cleanly (null/empty values, no crashes)', () => {
    const v = readDraft(EMPTY_DRAFT);
    expect(v.emotion).toBe('');
    expect(v.violations).toBeNull();
    expect(v.repeat_mistake).toBe('');
    expect(v.decision_quality).toBe('');
    expect(v.mindset_tags).toEqual([]);
  });

  it('unknown options translate to empty (defensive against corrupted drafts)', () => {
    const corrupt: WeekDraft = { ...EMPTY_DRAFT, emotion: 'Made Up Mood', bigMistake: 'BogusOption' };
    const v = readDraft(corrupt);
    expect(v.emotion).toBe('');
    expect(v.biggest_mistake).toBe('');
  });
});
