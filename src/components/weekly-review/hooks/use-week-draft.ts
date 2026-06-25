// Per-week draft storage. Lets the user fill the form across sessions
// before closing the week. Snapshotted into the archive on close-week.

import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting } from '@/lib/storage';

export interface ExecutionChecklist {
  entryFollowedPlan: boolean | null;
  stopLossRespected: boolean | null;
  noChasingPrice: boolean | null;
  correctPositionSize: boolean | null;
  noRevengeTrade: boolean | null;
}

export interface WeekDraft {
  preps: number[];          // tri-state per item: 0 — / 1 ✅ / 2 ❌
  edges: number[];          // same shape, 4 items
  violations: string;       // mistake count
  violationPattern: string; // recurring pattern text
  env: string;              // market environment
  pos: string;              // execution positioning
  emotion: string;          // emotion label
  focusRating: number;      // 0..5
  bigMistake: string;       // chip pick
  repeatMistake: boolean | null;
  mindsetTags: string[];
  mindset: string;          // free reflection
  executionChecklist: ExecutionChecklist;
  decisionQuality: 'A+' | 'B' | 'C' | 'D' | '';
  grade: string;
  /** Wave-1 generic values map — canonical store keyed by Block.id (and per-checklist itemId for checklist blocks). Holds user-added custom items and any future schema-only blocks. Dual-written alongside legacy fields for built-in slugs; sole-store for custom slugs. */
  values: Record<string, unknown>;
}

export const EMPTY_EXEC: ExecutionChecklist = {
  entryFollowedPlan: null, stopLossRespected: null,
  noChasingPrice: null, correctPositionSize: null, noRevengeTrade: null,
};

export const EMPTY_DRAFT: WeekDraft = {
  preps: [0, 0, 0, 0],
  edges: [0, 0, 0, 0],
  violations: '',
  violationPattern: '',
  env: '', pos: '',
  emotion: '', focusRating: 0,
  bigMistake: '', repeatMistake: null,
  mindsetTags: [], mindset: '',
  executionChecklist: { ...EMPTY_EXEC },
  decisionQuality: '', grade: '',
  values: {},
};

const KEY = (weekKey: string) => `weekly_review.draft.${weekKey}`;

export function useWeekDraft(weekKey: string) {
  const [draft, setDraft] = useState<WeekDraft>(EMPTY_DRAFT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const v = await getSetting<WeekDraft>(KEY(weekKey));
      if (cancelled) return;
      setDraft(v ? { ...EMPTY_DRAFT, ...v, executionChecklist: { ...EMPTY_EXEC, ...(v.executionChecklist || {}) } } : EMPTY_DRAFT);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [weekKey]);

  const update = useCallback((patch: Partial<WeekDraft>) => {
    setDraft(prev => {
      const next = { ...prev, ...patch };
      // Fire & forget — Cloud write
      setSetting(KEY(weekKey), next);
      return next;
    });
  }, [weekKey]);

  const reset = useCallback(async () => {
    setDraft(EMPTY_DRAFT);
    await setSetting(KEY(weekKey), EMPTY_DRAFT);
  }, [weekKey]);

  // Field-by-field hard reset. Writes EMPTY_DRAFT and sweeps any legacy
  // per-week keys that earlier versions of the form persisted separately.
  const hardReset = useCallback(async () => {
    const empty: WeekDraft = {
      ...EMPTY_DRAFT,
      preps: [0, 0, 0, 0],
      edges: [0, 0, 0, 0],
      mindsetTags: [],
      executionChecklist: { ...EMPTY_EXEC },
    };
    setDraft(empty);
    await setSetting(KEY(weekKey), empty);
    // Sweep legacy per-week keys (no-ops if absent).
    const legacy = [
      `weekly_review.prep.${weekKey}`,
      `weekly_review.edges.${weekKey}`,
      `weekly_review.exec.${weekKey}`,
      `weekly_review.mindset.${weekKey}`,
      `weekly_review.reflection.${weekKey}`,
      `weekly_review.tags.${weekKey}`,
      `weekly_review.violations.${weekKey}`,
      `weekly_review.env.${weekKey}`,
      `weekly_review.pos.${weekKey}`,
      `weekly_review.emotion.${weekKey}`,
      `weekly_review.focus.${weekKey}`,
      `weekly_review.bigMistake.${weekKey}`,
    ];
    await Promise.all(legacy.map(k => setSetting(k, null).catch(() => {})));
  }, [weekKey]);

  return { draft, update, reset, hardReset, loaded };
}
