// WE-2 — user-configurable week-start day (0=Sun..6=Sat). Default 1 (Mon).
//
// Stored in Cloud via `getSetting/setSetting`. Single setting, global to
// the user. The picker lives inside the Weekly Customize header.

import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting } from '@/lib/storage';

const KEY = 'weekly_review.week_start';
export const DEFAULT_WEEK_START = 1; // Monday

export interface UseWeekStart {
  weekStart: number;
  loaded: boolean;
  setWeekStart: (n: number) => Promise<void>;
}

function clamp(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return DEFAULT_WEEK_START;
  const i = Math.floor(x);
  return i >= 0 && i <= 6 ? i : DEFAULT_WEEK_START;
}

export function useWeekStart(): UseWeekStart {
  const [weekStart, setLocal] = useState<number>(DEFAULT_WEEK_START);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await getSetting<number>(KEY);
      if (cancelled) return;
      setLocal(v == null ? DEFAULT_WEEK_START : clamp(v));
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const set = useCallback(async (n: number) => {
    const v = clamp(n);
    setLocal(v);
    await setSetting(KEY, v);
  }, []);

  return { weekStart, loaded, setWeekStart: set };
}
