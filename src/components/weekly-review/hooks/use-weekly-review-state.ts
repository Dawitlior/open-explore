// Cloud-backed weekly-review state (archive + setups + recaps).
// Replaces the iframe app's per-browser localStorage with per-user JSONB
// stored in `user_settings`, gated by RLS.

import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting } from '@/lib/storage';
import type { MonthlyRecap, Setup, WeekRecord, WeeklyReviewState } from '../lib/types';

const KEY_ARCHIVE = 'weekly_review.archive';
const KEY_SETUPS  = 'weekly_review.setups';
const KEY_RECAPS  = 'weekly_review.recaps';

const EMPTY: WeeklyReviewState = { archive: [], setups: [], recaps: {} };

export function useWeeklyReviewState() {
  const [state, setState] = useState<WeeklyReviewState>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [a, s, r] = await Promise.all([
        getSetting<WeekRecord[]>(KEY_ARCHIVE),
        getSetting<Setup[]>(KEY_SETUPS),
        getSetting<Record<string, MonthlyRecap>>(KEY_RECAPS),
      ]);
      if (cancelled) return;
      setState({
        archive: Array.isArray(a) ? a : [],
        setups:  Array.isArray(s) ? s : [],
        recaps:  (r && typeof r === 'object') ? r : {},
      });
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const saveArchive = useCallback(async (archive: WeekRecord[]) => {
    setState(prev => ({ ...prev, archive }));
    await setSetting(KEY_ARCHIVE, archive);
  }, []);

  const saveSetups = useCallback(async (setups: Setup[]) => {
    setState(prev => ({ ...prev, setups }));
    await setSetting(KEY_SETUPS, setups);
  }, []);

  const saveRecaps = useCallback(async (recaps: Record<string, MonthlyRecap>) => {
    setState(prev => ({ ...prev, recaps }));
    await setSetting(KEY_RECAPS, recaps);
  }, []);

  return { ...state, loaded, saveArchive, saveSetups, saveRecaps };
}
