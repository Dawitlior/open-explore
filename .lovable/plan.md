# Two separate plans — please approve each independently

---

## PLAN 1 — Reflection Room: one coherent layout system (fill + customize)

Stop patching card-by-card. Rebuild the Weekly Review surface to a single layout spec shared by fill mode and customize mode. Customize mode = fill mode + edit affordances layered on top, not a different screen.

### 1. Shared layout primitives (one source of truth)

New folder `src/components/weekly-review/render/layout/`:

- `ReflectionBoard.tsx` — top-level layout. Renders the three layout bands in fixed order:
  1. **Risk band** (full-width row of 3 equal cards: Daily / Weekly / Monthly)
  2. **Main grid** (auto-fill, minmax(320px,1fr), `align-items: stretch`, `grid-auto-flow: dense`)
  3. **Footer band** (Decision Quality → Final Grade → AI Insights → Close-Week bar, full-width stack)
- `ReflectionCard.tsx` — the ONE card primitive used everywhere. MUI `Card variant="outlined"` with strict anatomy:
  - Header row: emoji + title + optional secondary line + underline divider (legacy look)
  - Content slot
  - Optional actions slot (used by customize mode)
  - Watermark step-number badge (top-trailing, low opacity, derived from render order)
  - `height: 100%` so siblings in a row are equal height
  - Consistent padding/radius/elevation from `REFLECTION_TOKENS`
- `useStepNumbers.ts` — walks the visible section list in render order and yields `{id → n}`. Auto-renumbers when sections are hidden/reordered. Risk band and footer band are excluded from numbering (or numbered separately — TBD by Lior; default: numbered with main grid only).
- `card-slots.ts` — replaces `layout-span.ts`. Maps each section id to: `{ band: 'risk' | 'main' | 'footer', span: 'full' | 'cell', priority: number }`. Single source the renderer reads.

### 2. Section assignment (mirrors legacy top-to-bottom)

| Band   | Sections                                                                              |
| ------ | ------------------------------------------------------------------------------------- |
| risk   | Daily Risk, Weekly Risk, Monthly Risk (3 equal cards, full-width band)                |
| main   | Prep, Execution Quality, Strategy/Edge, Market Context, Mindset sub-cards, Trades table (full), Reflection textarea (full) |
| footer | Decision Quality, Final Grade, AI Insights, Close-Week bar                            |

Within `main`, order = legacy order; trades table + reflection textarea remain `span:'full'`.

### 3. Split the Mindset monolith

Replace the single 🧠 Mindset section with separate sibling sections, each a standard `ReflectionCard` participating in the main grid with its own step number:

- Mindset · Emotion ("how did the week feel")
- Mindset · Focus (focus rating)
- Mindset · Biggest Mistake
- Mindset · Repeat Mistake
- Mindset · Tags
- Mindset · Reflection (textarea, `span:'full'`)

Implemented by updating the default template (`wr-default-template.ts`) — schema unchanged.

### 4. Responsiveness INSIDE each card

Every internal control must reflow at any card width (full / half / third / mobile):

- Chips/pills → MUI `Stack` with `flexWrap: 'wrap'` and `useFlexGap`
- Selects, scales, checklists → 100% width, no fixed pixel widths
- Risk gauges → `ResponsiveContainer` or SVG with `viewBox` + `width: 100%`
- Numbers/labels → `clamp()` font sizes from tokens
- Container queries (`@container`) on `ReflectionCard` so internal layout responds to card width, not viewport
- Audit pass on every block component in `render/blocks/` — remove fixed `minWidth`/`width` pixels, replace with token-based clamps

### 5. Customize mode = same board + edit layer

Delete the old raw single-column edit view. Customize mode renders the exact same `ReflectionBoard` with an `editMode` flag that:

- Wraps each `ReflectionCard` in an `EditableCardShell` adding a MUI action row: drag handle (`DragIndicator`), visibility toggle (`Visibility` / `VisibilityOff` — replaces red 🚫), delete (`DeleteOutline`), all as `IconButton` + `Tooltip`, token colors
- Hidden cards stay in the grid at `opacity: 0.4` with a "show" `IconButton`
- Delete confirmation → MUI `Dialog`
- Add-custom-item → MUI `TextField` + `Button` inside an `EditableCardShell` slot
- Week-start picker → MUI `ToggleButtonGroup`; close-days → MUI `Select` (multiple)
- Reset / Done → MUI `Button` (`variant="outlined"` / `"contained"`)
- Merge-consent banner → MUI `Alert` with token styling
- Mode transition: `Collapse` / `Fade` on the action row only; the board itself does not jump
- Strip ALL literal leaked strings ("hidden", "HIDDEN", "RISK", "P", red 🚫) — replaced by icons + `sr-only` labels

### 6. Two real bugs (folded into this pass)

- **Execution Score "100 / 0"** — fix the score block: render a single value (`{score}%` inside the ring), choose color by threshold (≥80 success, ≥50 warning, else muted — never red on an unfilled/zero state). Locate in `render/blocks/ScoreBlock.tsx` / equivalent.
- **R:R = 0.00 with no losses** — in `wr-metrics.ts` (or the R:R compute), if `avgLoss === 0` return `null`; the gauge renders "—" (or ∞ when there are wins but zero losses, per Lior's preference — default to "—").

### 7. RTL + mobile (verified, not assumed)

- `ReflectionBoard` sets `direction` from `ReflectionThemeProvider`; CSS Grid handles RTL natively (first card top-trailing in HE)
- Mobile (<900px): risk band collapses to 1 column, main grid to 1 column, footer stacks; no horizontal scroll
- Bake screenshots: fill + customize × HE + EN × desktop + mobile (8 shots) via Playwright

### 8. Guardrails

- Parity gate stays green (same blocks rendered, same data wired)
- Flags untouched
- Locked spine intact
- All 884 tests stay green; add tests for: step-number derivation, band assignment, equal-height contract (data attribute check), no-leak-string assertion in customize mode

### Technical notes

- Files created: `ReflectionBoard.tsx`, `ReflectionCard.tsx`, `EditableCardShell.tsx`, `useStepNumbers.ts`, `card-slots.ts`
- Files edited: `WeeklyReviewRenderer.tsx` (delegates to board), `BlockSection.tsx` (becomes a thin adapter or is replaced by `ReflectionCard`), `ReflectionGrid.tsx` (absorbed into board or kept as `main` band's grid), `layout-span.ts` (replaced by `card-slots.ts`), `wr-default-template.ts` (Mindset split), `ScoreBlock` + R:R metric (bug fixes), all `render/blocks/*` (internal responsiveness audit)
- Customize-mode legacy raw renderer is deleted, not branched

---

## PLAN 2 — Calendar zoom-out (separate task, separate PR mindset)

Apple-Calendar-style zoom-out in the existing Calendar Hub. Fully isolated from the Weekly Review work above.

### Zoom levels

`Day → Week → Month → Year` (4 levels). Day is the existing default.

| Level | Shows                                                                  |
| ----- | ---------------------------------------------------------------------- |
| Day   | Existing day view, unchanged                                           |
| Week  | 7-column strip, P&L per day, click a day → zoom into Day               |
| Month | Current month grid (already partially exists) with P&L heatmap cells   |
| Year  | 12 mini-month grids in a 4×3 layout, each cell color-coded by daily P&L|

### Triggers (both)

- **Control**: segmented `ToggleButtonGroup` in the calendar header: `D · W · M · Y`
- **Gesture**:
  - Desktop: ⌘/Ctrl + scroll-wheel zooms in/out one level per detent; pinch-zoom on trackpads via `wheel` event with `ctrlKey`
  - Mobile: pinch gesture (`touchstart`/`touchmove` two-finger distance delta) zooms one level per threshold crossed
  - Keyboard: `⌘+` / `⌘-` step zoom

### Interaction feel (Apple parity)

- Transition between levels: `framer-motion` shared-layout scale+fade, 220ms ease-out, anchored on the focused date so it "zooms into" the cell under cursor
- Clicking a cell at any level zooms in one step centered on that cell
- Back button / `Esc` zooms out one step
- Current zoom level + focused date persisted in URL search params (`?zoom=month&date=2026-06-15`) so refresh keeps state

### Files (planned)

- `src/components/calendar/CalendarZoomProvider.tsx` — zoom state + gesture handlers
- `src/components/calendar/views/YearView.tsx` (new)
- `src/components/calendar/views/WeekStripView.tsx` (new if missing)
- Update existing month/day view components to read zoom from context and render the segmented control
- No backend changes — reuses existing trades query

### Out of scope for this plan

- New event types
- Editing/creating events at year/month levels (read-only zoom-out; editing happens at day level as today)

---

**Please approve Plan 1 and/or Plan 2 (independently). I'll build only what you green-light, in the order you choose.**
