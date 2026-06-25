// WE-2 — user-configurable close-week days (subset of 0..6). Default [5,6]
// (Fri + Sat), reproducing today's byte-exact behavior for Monday-default
// users. Decoupled from week-start — explicitly user-controlled.

import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting } from '@/lib/storage';
import { DEFAULT_CLOSE_DAYS } from '../lib/week-key';

const KEY = 'weekly_review.close_days';
const DEFAULT = Array.from(DEFAULT_CLOSE_DAYS) as number[];

export interface UseCloseDays {
  closeDays: number[];
  loaded: boolean;
  setCloseDays: (days: number[]) => Promise<void>;
}

function sanitize(input: unknown): number[] {
  if (!Array.isArray(input)) return DEFAULT;
  const set = new Set<number>();
  for (const v of input) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0 && n <= 6) set.add(Math.floor(n));
  }
  if (set.size === 0) return DEFAULT; // never leave the user without a close day
  return Array.from(set).sort((a, b) => a - b);
}

export function useCloseDays(): UseCloseDays {
  const [closeDays, setLocal] = useState<number[]>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await getSetting<number[]>(KEY);
      if (cancelled) return;
      setLocal(v == null ? DEFAULT : sanitize(v));
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const set = useCallback(async (days: number[]) => {
    const v = sanitize(days);
    setLocal(v);
    await setSetting(KEY, v);
  }, []);

  return { closeDays, loaded, setCloseDays: set };
}
