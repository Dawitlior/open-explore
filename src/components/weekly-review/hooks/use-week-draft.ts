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

  return { draft, update, reset, loaded };
}
