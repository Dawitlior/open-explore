# Phase 1d — Responsive Grid for Fill-Mode Display

Pure layout change to the fill-mode render path. No data, no adapter, no system-slot markers, no input behavior, no customize-mode changes.

## Scope guardrails

- Fill mode only: `editMode === false` path in `WeeklyReviewRenderer`.
- Customize mode (`editMode === true`): **untouched** — keeps current single-column stack so drag-reorder stays trivial. Phase 3 owns any grid-in-edit-mode work.
- Locked spine still renders unchanged; `data-system-slot` markers preserved verbatim. Wiring tests stay green.
- Tokens only — gap uses `space.lg` from `REFLECTION_TOKENS`. No hardcoded spacing.

## Two-tier grid (both tiers, per request)

1. **Section-level grid** — sections render as cards inside a responsive `<Grid container>` on the tab root.
2. **Block-level grid** — inside a section card, blocks render inside a nested `<Grid container>`. Short blocks sit side-by-side; wide blocks span full row.

## Breakpoints

- `xs` (<600px): 1 column. Single stack, correct semantic order, no horizontal scroll.
- `sm` (600–899): 1 column still (forms read better full-width on small tablets).
- `md+` (≥900px): 2 columns. Gap = `space.lg` (16px) horizontally and vertically.

Implemented via MUI `<Grid container spacing>` with `xs={12} md={6}` for cell blocks and `xs={12}` for full-width blocks. MUI Grid is RTL-aware out of the box via the theme `direction` already wired in Phase 0 — first card lands top-right in HE, top-left in EN. No manual `flex-direction: row-reverse` anywhere.

## Width classification (`layoutSpan`)

New optional hint on block/section descriptors:

```ts
type LayoutSpan = "full" | "cell";
```

Resolution order in the renderer:
1. Explicit `block.layoutSpan` if present.
2. Otherwise, `BLOCK_SPAN_DEFAULTS[block.type]` lookup.
3. Fallback rule: tables, long checklists, textareas → `"full"`; everything else → `"cell"`.

### Default map (fill-mode display)

**Full-width (span 12):**
- `trades-table` (system slot)
- `reflection-textarea` / any `textarea` block
- `checklist` blocks: prep, execution, strategy edges, lessons (long lists)
- `ai-insights` Alert
- Any block flagged `wide: true` in schema

**Grid-cell (xs=12, md=6):**
- `score-ring`
- `final-grade` / grade buckets
- `stat-chips` group
- `risk-gauges`
- `market-context` selects
- `emotion-pills`, `mistake-pills`, `decision-pills`
- `focus-scale`
- `tags`
- Any short single-value or compact-control block

Section-level defaults mirror block defaults: a section whose dominant block is full → section spans full; otherwise section is a grid cell. Authors can override via `section.layoutSpan`.

## RTL handling

- Grid container inherits theme `direction` already set by `ReflectionThemeProvider` from `isRTL`. MUI flips flow automatically.
- All inner spacing uses MUI `sx` shorthand (`p`, `px`, `py`, `gap`) which compiles to logical properties via the existing stylis-RTL plugin from Phase 0.
- Zero `marginLeft`/`paddingRight` literals introduced. Lint-style grep check in the test suite.

## Test plan (added before bake)

`layout-grid.test.tsx`:
1. Renders fill mode with a mixed schema; asserts trades-table block container has `data-layout-span="full"` and its grid item carries `xs={12}` (no md override).
2. Asserts score-ring, stat-chips, risk-gauges render with `data-layout-span="cell"` and grid items expose `md=6`.
3. RTL: wraps render in `dir="rtl"` ReflectionThemeProvider; asserts grid container resolves to `direction: rtl` computed style.
4. xs collapse: renders inside a container forced to <600px; asserts every grid item resolves to full width (single column).
5. Customize-mode guard: `editMode={true}` renders **without** the grid container — sections remain a vertical stack.

Existing 872 tests must stay green. Add ~5 new tests → target 877+.

## Files

- `src/components/weekly-review/render/layout/layout-span.ts` (new) — `LayoutSpan` type + `BLOCK_SPAN_DEFAULTS` map + `resolveLayoutSpan(block)` helper.
- `src/components/weekly-review/render/layout/ReflectionGrid.tsx` (new) — thin wrapper over MUI `<Grid container>` bound to `space.lg`.
- `src/components/weekly-review/render/WeeklyReviewRenderer.tsx` — wrap fill-mode section list in `<ReflectionGrid>`; keep edit-mode path unchanged.
- `src/components/weekly-review/render/blocks/BlockSection.tsx` — wrap block children in a nested `<ReflectionGrid>` for fill mode; render each block in a `<Grid item>` sized by `resolveLayoutSpan`.
- `src/components/weekly-review/render/layout/__tests__/layout-grid.test.tsx` (new).

## What is explicitly NOT in this phase

- No restyle of inputs, pills, selects (Phase 2).
- No drag-handle grid (Phase 3).
- No animation/transition polish (later phase).
- No change to schema shape beyond the optional `layoutSpan` field.

## Gate

1. `bun test` green (877+).
2. Live bake by Lior, HE+EN, desktop+mobile:
   - md+: 2-column grid, trades/checklists/reflection span full row, ScoreRing+grade+chips sit side-by-side cleanly.
   - xs: single column, semantic order preserved, no horizontal scroll.
   - HE: first card top-right, flow reads right-to-left.
   - Customize mode: visually identical to today (still single column).

Stops here for bake before any further phase work.
