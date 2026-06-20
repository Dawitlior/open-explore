// =====================================================================
//  ORCA · BUG ARENA — useBugCapture hook (the report flow)
// =====================================================================
//  Orchestrates the minimal-clicks reporting flow:
//    idle -> picking element -> draft (modal open w/ screenshot+context)
//         -> [optional dedup join] OR submit -> done
// =====================================================================
import { useCallback, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createBugArenaService } from './bugArenaService';
import {
  ElementPicker,
  captureViewport,
  captureElementRegion,
  collectContext,
  getCurrentRoute,
  getViewport,
  composeAnnotatedImage,
  normalizeUpload,
  type PickResult,
  type AnnoStroke,
  type Shot,
} from './bugCaptureEngine';
import type {
  BugSeverity,
  BugType,
  BugWithMeta,
  CreateBugInput,
  CaptureContext,
} from './bugArenaTypes';

export type CaptureStage = 'idle' | 'picking' | 'draft' | 'submitting';
export type CaptureMode = 'region' | 'full';
export type CaptureStatus = 'idle' | 'capturing' | 'ready' | 'skipped' | 'error';

export interface DraftState {
  pick: PickResult | null;
  shot: Shot | null;
  context: CaptureContext;
  section: string;
  /** Live status of the screenshot job (modal opens immediately). */
  captureStatus: CaptureStatus;
  captureMode: CaptureMode;
}

export interface SubmitArgs {
  description: string;
  bug_type: BugType;
  severity: BugSeverity;
  title?: string;
  section?: string;
  /** annotations drawn over the auto screenshot */
  annotations?: AnnoStroke[];
  /** extra image the user attached from their device */
  extraImage?: File | null;
}

export interface UseBugCapture {
  stage: CaptureStage;
  draft: DraftState | null;
  similar: BugWithMeta[];
  busy: boolean;
  error: string | null;

  /** Map a route to a human section name. Override per platform. */
  sectionResolver: (route: string) => string;

  /** Step 1: start picking the broken element. */
  beginCapture: () => void;
  /** Skip element picking, open the form directly (still grabs a screenshot). */
  quickCapture: () => Promise<void>;
  cancel: () => void;

  /** One-click "this is my bug too" from the dedup suggestions. */
  joinSimilar: (bug: BugWithMeta) => Promise<void>;

  /** Re-capture using a different mode (region vs. full-screen). */
  recapture: (mode: CaptureMode) => Promise<void>;
  /** User chose to skip the image entirely; text-only submit. */
  skipCapture: () => void;

  /** Final submit -> creates bug + uploads images. Returns the new bug id. */
  submit: (args: SubmitArgs) => Promise<string | null>;
}

const DEFAULT_SECTIONS: Record<string, string> = {
  '/': 'דשבורד',
  '/dashboard': 'דשבורד',
  '/journal': 'יומן מסחר',
  '/settings': 'הגדרות',
  '/charts': 'גרפים',
};

export function useBugCapture(
  supabase: SupabaseClient,
  currentUserId: string,
  config?: {
    accent?: string;
    sectionResolver?: (route: string) => string;
    onDone?: (bugId: string) => void;
  }
): UseBugCapture {
  const api = useMemo(() => createBugArenaService(supabase), [supabase]);
  const pickerRef = useRef<ElementPicker | null>(null);

  const [stage, setStage] = useState<CaptureStage>('idle');
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [similar, setSimilar] = useState<BugWithMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sectionResolver = useCallback(
    (route: string) => {
      if (config?.sectionResolver) return config.sectionResolver(route);
      // longest-prefix match against the default map
      const keys = Object.keys(DEFAULT_SECTIONS).sort(
        (a, b) => b.length - a.length
      );
      const hit = keys.find((k) => route === k || route.startsWith(k + '/'));
      return hit ? DEFAULT_SECTIONS[hit] : 'כללי';
    },
    [config]
  );

  /** Run the requested capture and patch the draft when it lands. */
  const runCapture = useCallback(
    async (pick: PickResult | null, mode: CaptureMode) => {
      setDraft((d) => (d ? { ...d, captureStatus: 'capturing', captureMode: mode, shot: null } : d));
      let shot: Shot | null = null;
      try {
        if (mode === 'region' && pick?.element) {
          shot = await captureElementRegion(pick.element, { accent: config?.accent });
        }
        if (!shot) {
          // Either user picked full-screen, or region failed → viewport fallback
          shot = await captureViewport(pick?.rect ?? null, config?.accent);
        }
      } catch {
        shot = null;
      }
      setDraft((d) =>
        d ? { ...d, shot, captureStatus: shot ? 'ready' : 'error', captureMode: mode } : d,
      );
    },
    [config?.accent],
  );

  const openDraft = useCallback(
    async (pick: PickResult | null) => {
      const route = getCurrentRoute();
      const section = sectionResolver(route);
      const initialMode: CaptureMode = pick?.element ? 'region' : 'full';

      // Open the modal IMMEDIATELY with a "capturing" placeholder so the user
      // sees feedback the instant they tap. The shot fills in asynchronously.
      setDraft({
        pick,
        shot: null,
        context: collectContext(),
        section,
        captureStatus: 'capturing',
        captureMode: initialMode,
      });
      setStage('draft');

      // Kick off capture (no await — modal is already open).
      void runCapture(pick, initialMode);

      // Dedup suggestions load in the background — must not block the modal.
      api
        .findSimilarBugs({
          route,
          selector: pick?.selector ?? null,
          section,
        })
        .then((sims) => setSimilar(sims))
        .catch(() => setSimilar([]));
    },
    [api, sectionResolver, runCapture],
  );


  const beginCapture = useCallback(() => {
    setError(null);
    setSimilar([]);
    setStage('picking');
    const picker = new ElementPicker({ accent: config?.accent });
    pickerRef.current = picker;
    picker.start(
      (result) => {
        pickerRef.current = null;
        openDraft(result);
      },
      () => {
        pickerRef.current = null;
        setStage('idle');
      }
    );
  }, [openDraft, config?.accent]);

  const quickCapture = useCallback(async () => {
    setError(null);
    setSimilar([]);
    await openDraft(null);
  }, [openDraft]);

  const cancel = useCallback(() => {
    pickerRef.current?.stop();
    pickerRef.current = null;
    setStage('idle');
    setDraft(null);
    setSimilar([]);
    setError(null);
  }, []);

  const joinSimilar = useCallback(
    async (bug: BugWithMeta) => {
      try {
        setBusy(true);
        await api.joinBug(bug.id);
        config?.onDone?.(bug.id);
        cancel();
      } catch (e: any) {
        setError(e?.message || 'שגיאה בהצטרפות לדיווח');
      } finally {
        setBusy(false);
      }
    },
    [api, cancel, config]
  );

  const submit = useCallback(
    async (args: SubmitArgs): Promise<string | null> => {
      if (!draft) return null;
      if (!args.description.trim()) {
        setError('צריך תיאור קצר של הבאג');
        return null;
      }
      setBusy(true);
      setStage('submitting');
      setError(null);
      try {
        const input: CreateBugInput = {
          description: args.description.trim(),
          title: args.title?.trim() || null,
          section: args.section || draft.section,
          route: draft.context.route,
          bug_type: args.bug_type,
          severity: args.severity,
          element_selector: draft.pick?.selector ?? null,
          element_label: draft.pick?.label ?? null,
          element_rect: draft.pick?.rect ?? null,
          viewport: getViewport(),
          diagnostics: draft.context,
        };

        const bug = await api.createBugReport(input);

        // upload images (best-effort; the text report is what matters)
        try {
          const hasAnno = args.annotations && args.annotations.length > 0;
          if (draft.shot && hasAnno) {
            const composed = await composeAnnotatedImage(
              draft.shot.dataUrl,
              args.annotations!
            );
            await api.uploadAttachment(
              bug.id,
              currentUserId,
              composed.blob,
              'annotation',
              { width: composed.width, height: composed.height }
            );
          } else if (draft.shot) {
            await api.uploadAttachment(
              bug.id,
              currentUserId,
              draft.shot.blob,
              'screenshot',
              { width: draft.shot.width, height: draft.shot.height }
            );
          }
          if (args.extraImage) {
            const norm = await normalizeUpload(args.extraImage);
            await api.uploadAttachment(
              bug.id,
              currentUserId,
              norm.blob,
              'illustration',
              { width: norm.width, height: norm.height }
            );
          }
        } catch {
          /* image upload failed — bug still created */
        }

        config?.onDone?.(bug.id);
        cancel();
        return bug.id;
      } catch (e: any) {
        setError(e?.message || 'שגיאה בשליחת הדיווח');
        setStage('draft');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [api, draft, currentUserId, cancel, config]
  );

  const recapture = useCallback(
    async (mode: CaptureMode) => {
      const d = draft;
      if (!d) return;
      await runCapture(d.pick, mode);
    },
    [draft, runCapture],
  );

  const skipCapture = useCallback(() => {
    setDraft((d) => (d ? { ...d, shot: null, captureStatus: 'skipped' } : d));
  }, []);

  return {
    stage,
    draft,
    similar,
    busy,
    error,
    sectionResolver,
    beginCapture,
    quickCapture,
    cancel,
    joinSimilar,
    recapture,
    skipCapture,
    submit,
  };
}
