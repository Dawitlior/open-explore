# Plan — Bug Arena Capture Hardening + Mobile UI Fixes

Per the master plan ("Return a short per-file plan for approval before writing any code"), here is the per-file plan for all four items in your message.

---

## Part A — Bug Arena Capture Flow (mobile/PWA hardening)

**Files touched (only these):**
- `src/features/bug-arena/bugCaptureEngine.ts`
- `src/features/bug-arena/BugArenaComponents.tsx`
- `src/features/bug-arena/useBugCapture.ts` (only if needed for loading state plumbing)

### `bugCaptureEngine.ts`
- **Task 1.1/1.2/1.5**: In `ElementPicker`, keep a ref `lockedElement` that is set by the same logic that draws the highlight ring. On `pointerup`/`touchend`, capture **that** ref — never a fresh `elementFromPoint`. Lock the `getBoundingClientRect()` snapshot at the moment of selection.
- **Task 1.3**: Before capture: `scrollIntoView({ block:'center', inline:'center' })`, remove overlay, `await rAF()`, then re-measure rect.
- **Task 1.4**: Add a small `גלול` (scroll) toggle pill in the overlay that temporarily releases `touch-action:none`, so the user can scroll to off-screen elements on mobile, then tap to lock.
- **Task 2.1–2.3 (core fix)**: New `captureElementRegion(el, { padding: 28 })` that calls `html2canvas` on the element node itself (or nearest container with a background) with `backgroundColor: '#0b111b'`. Replace default `captureViewport` usage with this region capture. Keep `useCORS`, `ignoreElements`, and existing attachment/upload contract unchanged.
- **Task 2.4**: Keep `captureViewport()` available behind an explicit `fullScreen: true` flag used only when the user toggles "צלם מסך מלא".
- **Task 2.5**: Cap `scale` — region: `Math.min(devicePixelRatio, 2)`; full-screen on mobile: `1.5`.
- **Task 4.4**: Throttle the `onMove` handler through `requestAnimationFrame` (single pending frame).

### `BugArenaComponents.tsx`
- **Task 3.1–3.4**: Open the capture modal **immediately** on selection with a spinner state (`status: 'capturing'`). Image area shows skeleton + "מכין צילום…". Add 7-second timeout → show "דלג על הצילום" button that flips the modal into text-only mode.
- **Task 2.4 UI**: Add a "צלם מסך מלא" toggle in the modal header that re-captures with `fullScreen: true`.
- **Task 3.3**: Move the dedup ("בעיות דומות") fetch out of the modal-open critical path; render its own small inline loader inside the suggestions section only.
- **Task 4.1**: FAB `bottom/left: max(20px, env(safe-area-inset-bottom/left))`. Modal footer + detail drawer: `padding-bottom: max(16px, env(safe-area-inset-bottom))`.
- **Task 4.2**: Use `visualViewport` resize listener to keep submit button above keyboard (`scrollIntoView` on focused textarea).
- **Task 4.3**: Annotation `<canvas>` gets `touch-action: none` (canvas only, not the scroll container).
- **Task 4.5**: Privacy notice line + one-tap "הסתר נתונים רגישים" shortcut that flips `user_preferences.privacy_mask` on, waits one frame, then re-captures so masked DOM is what gets rendered.

### `useBugCapture.ts`
- Minimal: expose `status` ('idle' | 'capturing' | 'ready' | 'skipped' | 'error') so the modal can render the spinner from the same source of truth. No service / schema / dedup-logic changes.

**Guardrail compliance**: no other files touched. No `data-bug-*` rename. Service, RPCs, dedup logic, deletion rules, board untouched.

---

## Part B — Open Positions mobile swipe (smooth touch)

**File**: `src/components/dashboard/OpenPositionsPanel.tsx` (+ small CSS).

Add proper touch-pan handling to the row:
- `touch-action: pan-y` on the scroll container, `touch-action: pan-x` on the swipe row so vertical scroll isn't hijacked.
- Replace the current mouse-only drag with `pointerdown/move/up` + `setPointerCapture`.
- Use `transform: translate3d()` with `will-change: transform` and a CSS transition on release for momentum-feel snap.
- Active swipe disables the row's `overflow: hidden` clipping flicker.

No business logic change — same swipe actions and thresholds.

---

## Part C — Best/Worst Window chart cut off on mobile

**File**: `src/components/dashboard/BestWorstWindowChart.tsx`.

- Switch the chart container from fixed `height` to `aspect-ratio` on mobile (`aspect-[4/3]`), with a `min-height` floor.
- Increase bottom `margin`/`XAxis` height on `<480px` so the day-of-week labels aren't clipped.
- Wrap in `ResponsiveContainer` with `100% / 100%` and let the parent control sizing (currently the parent caps it too tightly).

---

## Part D — Expectancy toggle: dedicated mobile UI

**Files**: `src/components/trading/DisplayModeToggle.tsx` (and the wrapper that renders it inside the dashboard header — found via `ExpectancyMode` usage).

- Detect mobile via existing `useIsMobile()` hook (already in repo).
- Desktop: keep current pill toggle exactly as is.
- Mobile: render two large stacked/segmented buttons (full-width, 56px tall, big icons `$` and `R`, clear active state with gold ring on navy). Same `onChange` handler — zero functional change.

---

## Out of scope (will not touch)

- Any backend, RLS, or service contracts.
- Any file not listed above.
- No "while I'm here" refactors.

Approve and I'll implement A → B → C → D in that order, with a smoke check after each.
