# The Reflection Room — Phase 0 (Token Sheet) + Phase 1 (Fill Display)

Scope is the Weekly Review surface only (`[data-weekly-review]`). Always-dark, MUI v5 standard, fully isolated from ORCA's `T` theme. Mechanical behavior, adapter, locked spine, parity gate — all unchanged. RTL+LTR and mobile (≥390px) are non-negotiable from Phase 0 onward.

Return for approval: this document. No code is written until the token sheet below is signed off.

---

## Phase 0 — Theme Foundation & Design Tokens

### 0.1 Token sheet (the definition of "perfect")

All values are proposed; everything downstream binds to these tokens via the MUI theme — no ad-hoc colors, spacing, or radii anywhere in the surface.

#### Palette — fixed dark, independent of `T`

Background layers (Material elevation model, not glassmorphism):

| Token                 | Value       | Use                                          |
| --------------------- | ----------- | -------------------------------------------- |
| `bg.app`              | `#0E1116`   | Outermost surface (the "room" floor)         |
| `bg.surface1`         | `#161A21`   | Section card resting elevation               |
| `bg.surface2`         | `#1C2129`   | Raised (hover, selected row, dialog)         |
| `bg.surface3`         | `#232932`   | Popovers, menus, drag-overlay                |
| `divider`             | `#2A313B`   | 1px hairlines                                |
| `divider.strong`      | `#39424F`   | Section-internal separators                  |

Text:

| Token          | Value                | Contrast on `bg.surface1` |
| -------------- | -------------------- | ------------------------- |
| `text.primary` | `#ECEFF4`            | 13.8:1 (AAA)              |
| `text.secondary` | `#A8B0BD`          | 6.4:1 (AA+)               |
| `text.disabled` | `#5A6371`           | 3.1:1 (UI-only)           |
| `text.inverse` | `#0E1116`            | for chip-on-accent        |

Semantic accents (these are the **only** accents; they bind to grade + score thresholds):

| Token             | Value     | Bound to                                                       |
| ----------------- | --------- | -------------------------------------------------------------- |
| `success.main`    | `#34D399` | Score ≥ 80, Grade A / A+, positive P&L, "on plan"              |
| `success.soft`    | `#34D39922` | Chip backgrounds, gauge fills                                |
| `warning.main`    | `#F6C453` | 50 ≤ Score < 80, Grade B / C, caution                          |
| `warning.soft`    | `#F6C45322` |                                                              |
| `error.main`      | `#F2545B` | Score < 50, Grade D / F, negative P&L, breached limits         |
| `error.soft`      | `#F2545B22` |                                                              |
| `info.main`       | `#5BB3FF` | Neutral/informational chips, links inside the room             |
| `neutral.main`    | `#7A8696` | Tri-state "N/A", muted iconography                             |

Score/Grade binding (locks legacy parity — this is the contract Phase 1 must respect):
- ScoreRing: `>=80 → success.main`, `>=50 → warning.main`, `<50 → error.main`. **80/50** — matches legacy.
- Grade chip: `A/A+ → success`, `B/C → warning`, `D/F → error`.

#### Typography

Family: **Inter** for UI (variable, system fallback) + **JetBrains Mono** for all numeric / R-multiple / P&L cells (locks numeric alignment, replaces the inline IBM Plex Mono).

| Variant   | Size / Weight / LH       | Use                                  |
| --------- | ------------------------ | ------------------------------------ |
| `h1`      | 22 / 700 / 1.25          | Surface title only                   |
| `h2`      | 18 / 700 / 1.3           | Section titles                       |
| `h3`      | 15 / 600 / 1.35          | Block titles                         |
| `body1`   | 14 / 500 / 1.5           | Default UI text                      |
| `body2`   | 13 / 500 / 1.5           | Help / secondary                     |
| `caption` | 12 / 600 / 1.4 / +0.4px ls | Chip labels, table headers          |
| `mono.lg` | 18 / 600 / 1.2 (Mono)    | KPI numerics                         |
| `mono.md` | 14 / 600 / 1.2 (Mono)    | Table numerics                       |

Mobile (<640px) scales h1/h2 down one step; body stays 14px (iOS zoom guard → all inputs stay 16px via existing CSS rule, not the typography scale).

#### Spacing — 4px base

`xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48`. MUI `theme.spacing(1) = 8`; everything else uses these multipliers.

#### Radii

`sm 6 · md 10 · lg 14 · xl 20 · pill 999`.
Sections: `lg`. Inputs/buttons: `md`. Chips/pills: `pill`. Dialogs: `xl`.

#### Elevation (Material, restrained — no neon glow)

| Level | Shadow                                                               | Use                  |
| ----- | -------------------------------------------------------------------- | -------------------- |
| `e0`  | none                                                                 | `bg.app`             |
| `e1`  | `0 1px 0 #00000040, 0 1px 2px #00000033`                             | Section card resting |
| `e2`  | `0 4px 12px #00000055`                                               | Hover, menus         |
| `e3`  | `0 12px 32px #00000080`                                              | Dialogs, drag overlay |

No cyan/purple drop-shadows. No backdrop blur. This is the visual break from ORCA.

#### Motion

| Token        | Value                                  | Use                          |
| ------------ | -------------------------------------- | ---------------------------- |
| `dur.fast`   | 120ms                                  | Hover, focus, chip toggle    |
| `dur.std`    | 200ms                                  | Section/expand, fade         |
| `dur.slow`   | 320ms                                  | Mode transition (fill↔edit)  |
| `ease.std`   | `cubic-bezier(0.2, 0, 0, 1)`           | Default                      |
| `ease.out`   | `cubic-bezier(0.0, 0, 0.2, 1)`         | Enter                        |
| `ease.in`    | `cubic-bezier(0.4, 0, 1, 1)`           | Exit                         |

`prefers-reduced-motion` → durations collapse to 0.

### 0.2 Theme implementation (no component changes in this phase)

1. `bun add @mui/material @mui/icons-material @emotion/react @emotion/cache stylis-plugin-rtl` (versions pinned to MUI v5 latest stable).
2. New file `src/components/weekly-review/theme/reflection-theme.ts` — exports `createReflectionTheme(direction: 'ltr'|'rtl')` building the MUI theme from the tokens above. Palette mode forced `'dark'`.
3. New file `src/components/weekly-review/theme/ReflectionThemeProvider.tsx` — wraps children in:
   - emotion `CacheProvider` (RTL cache uses `stylis-plugin-rtl`, key `mui-rtl`; LTR cache key `mui`),
   - `ThemeProvider` with the dark theme,
   - `CssBaseline` **scoped** (we render `<ScopedCssBaseline>` so we do not leak resets outside the Weekly Review).
4. Mount the provider inside `WeeklyReviewShell` **around `<Suspense>` + tab content only**, *not* around the rest of the app. The shell's existing inline-styled chrome (tab bar, unit toggle, banner) stays as-is in this phase — the provider is wired and proven inert before any component swap.
5. No `T` prop reads change behavior in this phase; we only add the provider. The fixed dark palette is computed inside the theme file from the token sheet — it never reads `T`.

### 0.3 Phase 0 gate (must all pass to proceed)

- All existing tests stay green; flag states unchanged (`WR_SCHEMA_RENDERER_ENABLED`, `WR_EDIT_MODE_ENABLED`, `WR_MERGE_REQUIRES_CONSENT` = `true`).
- New test `theme/__tests__/reflection-theme.test.ts`: snapshots the token values + asserts score/grade threshold bindings (80/50, A/B/C/D/F → success/warning/error).
- New test `theme/__tests__/rtl-cache.test.tsx`: renders an MUI `<Button>` inside the provider with `direction='rtl'` and asserts the emotion cache key is `mui-rtl` and a sample logical property flips.
- Live bake (HE + EN, desktop + mobile): the Weekly Review looks **identical** to today — provider added, nothing visually changed. Lior signs off that Phase 0 is inert before Phase 1 begins.

---

## Phase 1 — Fill Mode, Read/Display

Restyle only the **non-edit, display** path. Inputs are untouched (Phase 2). Customize mode is untouched (Phase 3).

### 1.1 In-scope components (display only)

1. **Section shell** — replace the inline-styled `<section>` wrappers emitted by `WeeklyReviewRenderer` with an MUI `<Card variant="outlined">` using `bg.surface1`, `e1`, radius `lg`, padding `lg`. Section title → `<Typography variant="h2">` with optional leading icon slot (icon comes from existing per-section emoji mapped to an `@mui/icons-material` equivalent; mapping lives in `theme/section-icons.ts`).
2. **Block frame** (the read-only label + value row) — `<Stack>` with `body2` label (`text.secondary`) + value rendered per block type. Hairline divider between blocks within a section, color `divider`.
3. **System slots** (the locked spine — the P0 surface):
   - **Trades table** — wrap the existing legacy JSX in an MUI `<Paper variant="outlined">` shell; the table itself is restyled with MUI `<Table>` primitives (header `caption`, rows `body2`, numeric cells in `mono.md`). Column behavior, data, sort, totals — **unchanged**.
   - **Stat chips** — replace inline pill divs with MUI `<Chip>` using `success.soft / warning.soft / error.soft` + matching foreground. Thresholds preserved verbatim.
   - **ScoreRing** — restored as an SVG donut inside an MUI `<Box>`, color thresholds **80/50** bound to `success/warning/error`, center label uses `mono.lg`. (This closes the parity gap flagged earlier — ring is back in fill mode.)
   - **Risk gauges** — MUI `<LinearProgress variant="determinate">` with custom track + color from semantic palette per breach level; label row in `caption`.
   - **Grade** — MUI `<Chip size="medium">` with color bound to the grade table (`A/A+→success`, `B/C→warning`, `D/F→error`).
4. **Field displays** for non-input read state (when fill mode shows a saved answer for a non-checklist block): scale → `<Rating>` read-only; select → `<Chip>`; multiselect → row of `<Chip>`; binary → ✓/✗ in semantic color; number → `mono.md`; text → `body1` block.

Out of scope this phase: any input affordance, any edit-rail control, any customize-mode pickers, any dialog. Those are Phases 2–3.

### 1.2 Code structure

- `render/blocks/` new folder. One small component per block type for **display**: `BlockSection.tsx`, `BlockField.tsx`, `BlockScoreRing.tsx`, `BlockGrade.tsx`, `BlockRiskGauges.tsx`, `BlockStatChips.tsx`, `BlockTradesTable.tsx` (the last four wrap the existing slot JSX — we do not re-port the data, only re-skin the shell).
- `WeeklyReviewRenderer.tsx` swaps its inline-styled section + block shells for the new display components **only when `editMode === false`**. Edit-mode rendering path is unchanged in this phase (still the current raw look — that's Phase 3's job).
- `build-system-slots.tsx` continues to be the single source of system-slot JSX; the new `BlockScoreRing` etc. consume it. The legacy duplicate JSX in `WeeklyTab.tsx:312+` stays for one-switch revert until Phase 1 bakes clean live, then removed in Phase 1 cleanup (housekeeping item from earlier).
- No changes to `customization.ts`, `wr-merge.ts`, `use-week-draft.ts`, the adapter, week-key, close-days, or anything mechanical.

### 1.3 RTL + mobile

- Every new component is tested under both `direction='ltr'` and `direction='rtl'`. Section padding, chip spacing, table alignment all use MUI logical props (`paddingInlineStart` etc.) — no hardcoded `left/right`.
- Mobile: table collapses to the existing stacked-row layout via the inherited CSS in `WeeklyReviewShell` (no change — the new `<Table>` is still semantic `<table>` so the existing media-query collapse still applies). Section padding shrinks one step (`md` instead of `lg`) under 640px via theme breakpoint.
- iOS 16px input guard untouched (no inputs in this phase anyway).

### 1.4 Phase 1 gate (all must pass)

- All previously green tests still green (target ≥ current count, 856+).
- New tests:
  - `render/blocks/__tests__/score-ring.test.tsx` — asserts SVG ring renders, color binds to 80/50 thresholds, `aria-label` carries the numeric score (this is the parity assertion the previous gate was missing).
  - `render/blocks/__tests__/grade-chip.test.tsx` — asserts grade→color mapping.
  - `render/blocks/__tests__/system-slots-display.test.tsx` — mounts `SchemaRendererSurface` with real `systemSlots` (lifted regression guard from prior wiring test) and asserts all 5 spine slots are present with the new shells, in both `dir=ltr` and `dir=rtl`.
  - Existing parity gate extended: assert ScoreRing widget **type** (presence of `<svg role="img">` with the expected aria-label) in fill mode, not just "score block present" — closes the loophole.
- Live bake (Lior, both locales, desktop + mobile): the spine is visibly present and matches legacy semantically; section cards look clean Material-dark; no glassmorphism leaked in; no regression in customize mode (it still looks raw — that's expected, Phase 3 owns it).
- Housekeeping after green bake: remove the duplicate legacy system-block JSX at `WeeklyTab.tsx:312+`.

---

## What we explicitly do NOT do in Phases 0–1

- No input restyling (Phase 2).
- No customize-mode/edit-rail/dialog work (Phase 3) — the floating 🚫, the cramped arrows, the leaked "hidden" text all stay until Phase 3. The user has already accepted this deferral.
- No motion polish beyond plugging the durations into the theme (Phase 4).
- No changes to any file outside `src/components/weekly-review/**` and `package.json` (for the MUI deps).

---

## Approval needed before any code

1. Sign off on the **token sheet** values (palette hexes, type scale, spacing, radii, elevation, motion). This is the contract.
2. Sign off on the **Phase 1 scope** (display-only, spine restored with ScoreRing 80/50, customize untouched).

On approval, build Phase 0 first, run the Phase 0 gate, get the inert-bake sign-off, then build Phase 1.
