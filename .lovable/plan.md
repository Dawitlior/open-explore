## Goal
Make sure that closing a week actually wipes every input in the Weekly Review, and give the user an explicit, always-available "Reset all inputs" button they can press at any time.

## Why it currently feels broken
`closeWeek()` already calls `resetDraft()` after `saveArchive()`, and `resetDraft()` writes `EMPTY_DRAFT` to Cloud and sets local state to `EMPTY_DRAFT`. But:
- `useWeekDraft(weekKey)` is keyed by the current ISO week. After closing Friday's week the user typically still sees the same `weekKey` until the new week starts, so the form re-mounts with the just-reset draft — that part should work.
- However, several visible inputs are not part of `WeekDraft` and therefore are *not* touched by `resetDraft()` (e.g. they may live in sibling widgets / per-week settings). That is why some fields appear "sticky" after close.
- There is no manual escape hatch, so if anything is left behind the user has to clear fields one by one.

## Changes (frontend only, `src/components/weekly-review/tabs/WeeklyTab.tsx` + draft hook)

1. **Hard, field-by-field reset helper** in `src/components/weekly-review/hooks/use-week-draft.ts`
   - Keep `EMPTY_DRAFT` as the single source of truth.
   - Add `hardReset()` that:
     a. Sets local state to `EMPTY_DRAFT`.
     b. Writes `EMPTY_DRAFT` to `weekly_review.draft.<weekKey>` in Cloud.
     c. Also deletes any *legacy* per-week keys that older versions of the form may still read from (sweep a known list: `weekly_review.prep.*`, `weekly_review.edges.*`, `weekly_review.exec.*`, `weekly_review.mindset.*`, `weekly_review.reflection.*`, `weekly_review.tags.*` for the current `weekKey`).
   - Export `hardReset` alongside `reset`.

2. **Global "Reset all inputs" button** in `WeeklyTab.tsx` header bar
   - Place next to the existing "Close week" / grade chip area.
   - Label: HE `איפוס כל האינפוטים` · EN `Reset all inputs`. Icon: 🧹.
   - Style: danger-outline button (red border, transparent bg), matches existing header chips.
   - On click → `confirm()` dialog (HE/EN) → call `hardReset()`.
   - Always enabled, regardless of Friday/Saturday gating or `alreadyClosed`.

3. **Close-week flow uses the same hard reset**
   - In `closeWeek()` replace `await resetDraft()` with `await hardReset()` so the on-close path and the manual button are byte-identical. Guarantees every input field — including the legacy ones — is cleared after `saveArchive`.

4. **Loader respects empty draft**
   - The existing `useEffect` already replaces state with `EMPTY_DRAFT` when nothing is stored — no change needed, but verify after `hardReset()` the component re-renders with empty values for: preps, edges, executionChecklist, violations, violationPattern, env, pos, emotion, focusRating, bigMistake, repeatMistake, mindsetTags, mindset, decisionQuality, grade.

## Out of scope
- No backend / RLS changes.
- No change to archive records — archived weeks remain intact.
- No change to Saturday/Friday close-week gating (handled in a previous turn).

## Acceptance
- Pressing "🧹 Reset all inputs" instantly clears every visible field in the Weekly Review form and persists empty state across refresh.
- Closing a week (Friday or Saturday) leaves the form completely empty without a refresh.
