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
//   3. If present and its templateVersion < default:
//        • when WR_MERGE_REQUIRES_CONSENT is true (default), compute the
//          additive merge PREVIEW, surface it as `pendingMerge`, but DO
//          NOT persist or replace the stored template. The user accepts
//          via `acceptPendingMerge()`.
//        • when false, auto-apply (legacy behavior, tests only).
//   4. If present and up to date → return as-is.

import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting } from '@/lib/storage';
import type { WeeklyReviewSchema } from '../lib/wr-schema';
import { ORCA_DEFAULT_TEMPLATE } from '../lib/wr-default-template';
import { mergeTemplate, type MergeResult } from '../lib/wr-merge';
import { WR_MERGE_REQUIRES_CONSENT } from '../lib/wr-flag';

const KEY = 'weekly_review.user_template.v1';

export interface UseUserTemplate {
  template: WeeklyReviewSchema;
  loaded: boolean;
  save: (next: WeeklyReviewSchema) => void;
  resetToDefault: () => Promise<void>;
  /** Wave-1 Item-3 guard — non-null when an additive default-template upgrade is awaiting user consent. */
  pendingMerge: MergeResult | null;
  acceptPendingMerge: () => Promise<void>;
  dismissPendingMerge: () => void;
}

export function useUserTemplate(): UseUserTemplate {
  const [template, setTemplate] = useState<WeeklyReviewSchema>(ORCA_DEFAULT_TEMPLATE);
  const [loaded, setLoaded] = useState(false);
  const [pendingMerge, setPendingMerge] = useState<MergeResult | null>(null);

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
          const merged = mergeTemplate(stored, ORCA_DEFAULT_TEMPLATE);
          if (WR_MERGE_REQUIRES_CONSENT) {
            // Consent-gated: keep stored shape live, expose preview.
            setTemplate(stored);
            setPendingMerge(merged);
            setLoaded(true);
            return;
          }
          await setSetting(KEY, merged.schema);
          if (!cancelled) {
            setTemplate(merged.schema);
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
    setPendingMerge(null);
    await setSetting(KEY, null);
  }, []);

  const acceptPendingMerge = useCallback(async () => {
    if (!pendingMerge) return;
    const next = pendingMerge.schema;
    setTemplate(next);
    setPendingMerge(null);
    await setSetting(KEY, next);
  }, [pendingMerge]);

  const dismissPendingMerge = useCallback(() => setPendingMerge(null), []);

  return { template, loaded, save, resetToDefault, pendingMerge, acceptPendingMerge, dismissPendingMerge };
}
