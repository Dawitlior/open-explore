// Wave-2 Item 4 — per-user template persistence.
//
// The renderer needs a stable place to read/write the user's customized
// template. Storage is the same Cloud-backed `getSetting/setSetting`
// surface the rest of the weekly review already uses. The template is
// global per user (not per week), so the key has no week suffix.
//
// On load:
//   1. Read stored template.
//   2. If absent → adopt ORCA_DEFAULT_TEMPLATE verbatim (no merge needed).
//   3. If present and its templateVersion < default → run mergeTemplate
//      (Item 3) and persist the upgraded shape.
//   4. If present and up to date → return as-is.

import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting } from '@/lib/storage';
import type { WeeklyReviewSchema } from '../lib/wr-schema';
import { ORCA_DEFAULT_TEMPLATE } from '../lib/wr-default-template';
import { mergeTemplate } from '../lib/wr-merge';

const KEY = 'weekly_review.user_template.v1';

export interface UseUserTemplate {
  template: WeeklyReviewSchema;
  loaded: boolean;
  save: (next: WeeklyReviewSchema) => void;
  resetToDefault: () => Promise<void>;
}

export function useUserTemplate(): UseUserTemplate {
  const [template, setTemplate] = useState<WeeklyReviewSchema>(ORCA_DEFAULT_TEMPLATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getSetting<WeeklyReviewSchema>(KEY);
      if (cancelled) return;
      if (!stored) {
        setTemplate(ORCA_DEFAULT_TEMPLATE);
        setLoaded(true);
        return;
      }
      if ((stored.meta?.templateVersion ?? 0) < ORCA_DEFAULT_TEMPLATE.meta.templateVersion) {
        try {
          const merged = mergeTemplate(stored, ORCA_DEFAULT_TEMPLATE).schema;
          await setSetting(KEY, merged);
          if (!cancelled) {
            setTemplate(merged);
            setLoaded(true);
          }
          return;
        } catch (err) {
          // Rename collision or other contract violation — fall back to default.
          // eslint-disable-next-line no-console
          console.error('[wr] template merge failed, keeping stored shape', err);
        }
      }
      setTemplate(stored);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const save = useCallback((next: WeeklyReviewSchema) => {
    setTemplate(next);
    void setSetting(KEY, next);
  }, []);

  const resetToDefault = useCallback(async () => {
    setTemplate(ORCA_DEFAULT_TEMPLATE);
    await setSetting(KEY, null);
  }, []);

  return { template, loaded, save, resetToDefault };
}
