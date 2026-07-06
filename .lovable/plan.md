# Performance Optimization Pass

Goal: make the platform noticeably faster without changing any functionality or visual output.

## Scope

Investigate the whole app, but focus effort where the cost is highest:

1. **Dashboard charts** (`SimpleExtraCharts`, `ReviewDashboard`, `BestWorstWindowChart`, `PnLDistributionHistogram`, `RiskAdjustedRatiosSection`, `DashboardAdvancedLab`, `QuarterlyPerformanceCard`).
2. **Calendar Hub / Month & Year views** (heavy recompute on every render).
3. **Global providers & app shell** (`App.tsx`, `use-trades`, `display-mode`, `use-active-portfolio`, `OrcaUXLayer`).
4. **Weekly Review widgets** kept off-screen.
5. **Landing page** unnecessary work when authed.

## Investigation steps

- Grep for charts / heavy components mounted unconditionally.
- Identify components that render even when their tab / tier is not active (e.g. Alpha charts rendered under a `{isAlpha && …}` gate — good; but check ones without a gate).
- Look for `useMemo` misses on expensive derivations (trade aggregations recomputed on every keystroke elsewhere in the tree).
- Find components with heavy JSX but no `React.memo` / stable props.
- Find `useEffect`s with missing/broken deps causing loops.
- Find dead files: components exported but never imported, legacy panels replaced by newer ones.
- Find dev-only warnings we can silence cheaply (e.g. `fetchPriority` casing on Landing image).

## Planned changes

### A. Render-gating (don't render what you don't show)

- `ReviewDashboard`: wrap advanced/alpha chart blocks in a `React.lazy` + `Suspense`, so users on Standard tier never pay for `QuarterlyWinsLossesYoYChart`, `QuarterlyYearMatrixChart`, `BestWorstWindowChart`, `QuarterlyPerformanceCard`, `WinsByMonthChart`, `WinsByQuarterChart`, `ReturnPerTimeChart`, `PnLDistributionHistogram`, `RiskAdjustedRatiosSection`, `DashboardAdvancedLab` on mount.
- Tab-based panels (Weekly / Monthly / Setups / Semi-Annual / Annual / Half-Year) — confirm only the active tab renders; convert any always-mounted ones to lazy.
- Calendar `YearView` heavy per-day computation: only compute for the current visible year, memoize by `year + trades.length + lastId`.

### B. Memoization

- Add `React.memo` with a shallow-props check to chart components in `SimpleExtraCharts.tsx` (they receive `trades` array + primitives).
- Hoist `tt` (tooltip style) and `MONTH_KEY`/`QUARTER_KEY` derivations already stable — verify no per-render allocations in hot paths.
- In `ReviewDashboard`, memoize the `trades`-derived objects (`stats`, formatted arrays) once per `trades` reference change.
- In `display-mode.tsx` `useEffectiveDisplayMode`, avoid unnecessary event broadcasts when the value hasn't changed.

### C. Effect / listener hygiene

- Replace per-chart `useIsMobile` (5+ instances each adding `resize` listeners) with a single shared hook that dedupes listeners via a module-level subscriber.
- `OrcaUXLayer` scroll progress listener → passive + `requestAnimationFrame` throttle to cut layout thrash.

### D. Dead-code removal

- Search for exported-but-unused components and remove them (e.g. `_placeholder.tsx`, unused legacy chart wrappers if any). Only remove files whose imports do not resolve anywhere.
- Remove commented-out blocks tagged "REMOVED" in `OrcaUXLayer` (live-clock block, etc.) that only contain a comment.

### E. Small correctness/perf wins

- Fix `fetchPriority` → `fetchpriority` on the Landing hero `<img>` (React 18 wants lowercase; error in console every mount).
- Add `loading="lazy"` + `decoding="async"` to below-the-fold images that don't have it.
- Ensure Recharts `ResponsiveContainer` isn't nested inside another `ResponsiveContainer` anywhere (double-observer cost).

## What will NOT change

- No visual redesigns, no feature removals, no theme changes.
- No behavior change to R/$ auto-detect, calendar dots, share modal, macro banner, or any user-visible flow.
- No backend / schema changes.
- Bilingual + RTL + all themes untouched.

## Verification

- After each batch: `tsgo` typecheck + `bunx vitest run` for the display-mode / calendar tests already in the repo.
- Playwright smoke: load `/` (dashboard) and `/calendar`, confirm no new console errors, screenshots match previous layout.
- Manual pass through: dashboard tiers (Beginner/Standard/Alpha), Calendar Month/Year, Weekly Review tabs, mobile viewport.

## Technical details

- Lazy loading uses `React.lazy(() => import('./X'))` + `<Suspense fallback={null}>` so the chunk isn't downloaded until the gate opens.
- Shared `useIsMobile` will live at `src/hooks/use-viewport.ts` as a subscriber-set pattern; the existing `use-mobile.tsx` stays as a thin re-export for back-compat so no imports break.
- `React.memo` uses default shallow compare; `trades` array identity is already stable in `use-trades` (only replaced on real change), so shallow compare is correct.

## Rollback

Each batch is a self-contained commit; if a chart regresses visually, revert just that file.
