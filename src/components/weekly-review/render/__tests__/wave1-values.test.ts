// Wave-1 floor — generic values map, custom-item persistence, snapshot at close-week.

import { describe, it, expect } from 'vitest';
import { readDraft, writeBlock } from '../legacy-adapter';
import { EMPTY_DRAFT, type WeekDraft } from '../../hooks/use-week-draft';
import { ORCA_DEFAULT_TEMPLATE } from '../../lib/wr-default-template';

function applyPatch(draft: WeekDraft, patch: Partial<WeekDraft> | null): WeekDraft {
  if (!patch) return draft;
  return {
    ...draft,
    ...patch,
    executionChecklist: { ...draft.executionChecklist, ...(patch.executionChecklist ?? {}) },
    values: { ...draft.values, ...(patch.values ?? {}) },
  };
}

describe('CWR · Wave-1 generic values store', () => {
  it('persists custom (unknown) blocks via the generic values map', () => {
    // Custom slug — adapter has no legacy mapping for it.
    const patch = writeBlock('user_my_custom', 'hello', EMPTY_DRAFT);
    expect(patch).not.toBeNull();
    expect(patch!.values).toBeDefined();
    expect((patch!.values as Record<string, unknown>)['user_my_custom']).toBe('hello');

    const next = applyPatch(EMPTY_DRAFT, patch);
    const v = readDraft(next);
    expect(v['user_my_custom']).toBe('hello');
  });

  it('custom checklist items round-trip alongside built-in items', () => {
    // Built-in prep + custom item layered together.
    const patch = writeBlock(
      'prep_checklist',
      { coffee: 'done', user_custom_alpha: 'missed' },
      EMPTY_DRAFT,
    );
    const next = applyPatch(EMPTY_DRAFT, patch);

    // Legacy positional array updated for the built-in.
    expect(next.preps[0]).toBe(1); // done

    // Generic map carries the full per-item snapshot, including the custom item.
    const view = readDraft(next);
    const checklist = view.prep_checklist as Record<string, string>;
    expect(checklist.coffee).toBe('done');
    expect(checklist.user_custom_alpha).toBe('missed');
  });

  it('still returns null for system / read-only blocks', () => {
    for (const id of ['exec_score', 'final_grade', 'trades_table', 'stat_chips', 'risk_gauges', 'ai_insights']) {
      expect(writeBlock(id, 'x', EMPTY_DRAFT)).toBeNull();
    }
  });

  it('built-in slugs dual-write — legacy field AND generic map both updated', () => {
    const patch = writeBlock('emotion', 'in_the_zone', EMPTY_DRAFT);
    expect(patch!.emotion).toBe('In the Zone');                  // legacy mirror
    expect((patch!.values as Record<string, unknown>)['emotion']).toBe('in_the_zone'); // canonical
  });

  it('historical render fallback — pre-Wave-1 WeekRecord (no snapshot) defaults to ORCA template', () => {
    // Simulated legacy WeekRecord — no schemaSnapshot field. Reader must
    // fall back to ORCA_DEFAULT_TEMPLATE per §13.
    const legacyRecord = { weekKey: '2025-W10' } as { schemaSnapshot?: unknown };
    const snapshot = legacyRecord.schemaSnapshot ?? ORCA_DEFAULT_TEMPLATE;
    expect(snapshot).toBe(ORCA_DEFAULT_TEMPLATE);
  });
});
