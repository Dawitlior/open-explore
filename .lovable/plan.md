## Task 3 — Adaptive Chart Rendering (Dual-Currency Engine)

The chart surface is large (9 files, ~40 Recharts canvases). To respect the "do not duplicate / do not modify KPI cards" rule and keep this shippable in one pass, I'll inject the engine in **two layers** rather than touching every chart.

### Layer 1 — Data feed (covers 100% of charts automatically)

In `src/pages/Index.tsx`, derive `visibleTrades` from `useDisplayMode()` and pass it (instead of raw `trades`) to every analytics/risk/psychology/AI/calendar page prop. This means:

- In `MONEY` mode → every chart sees all trades (current behaviour).
- In `R_MULTIPLE` mode → every chart automatically receives only trades with a real `stopLoss`. CSV-only datasets are filtered out everywhere at once.

A tiny `<DisplayModeConsumer>` wrapper inside `DisplayModeProvider` exposes `visibleTrades` to the existing render functions without restructuring the page.

### Layer 2 — Axis/format swap on the *primary* canvases

Only the charts whose Y-axis represents a money-or-R value get adaptive `dataKey` + tick/tooltip formatting. KPI cards are untouched per instructions.

Targets (existing files, surgical edits only):

1. **Equity / cumulative curves**
   - `AdvancedAnalyticsPage.tsx` → `equityDD` ComposedChart: compute both `equityR` and `equity$` in the same memo; pick `dataKey` + tooltip formatter from `displayMode`.
   - `AnalyticsQuantLab.tsx` → `cumR` AreaChart + `dailyEq` step-equity: same dual-field pattern.

2. **Distribution / histogram**
   - `AnalyticsQuantLab.tsx` → R-bin histogram: in `MONEY` mode rebuild bins by $ brackets (±$100/250/500/1k); in `R_MULTIPLE` keep the existing R bins. X-axis label switches.

3. **Heatmaps / day-hour aggregations**
   - Day-of-week + session bar charts in `AnalyticsQuantLab.tsx` and any heatmap aggregator: accumulate `pnl` vs `r` based on mode; intensity scale + tooltip suffix swap accordingly.

### Shared helper (new)

`src/lib/display-mode-format.ts`:
- `formatValue(v, mode)` → `+$500` / `+2.5R`
- `formatAxis(v, mode)` → compact ticks
- `pickField(mode)` → `'pnl' | 'r'`
- `getMoneyBins(trades)` → dynamic $ buckets based on data spread

Used only inside the targeted charts above. No global theme/token changes.

### Out of scope (explicit)

- KPI / metric text cards (Task 4)
- Specialty R-only modules (drawdown-R, risk %, calmar, MFE/MAE) — these are inherently R-based and stay as-is even in MONEY mode; they just receive the filtered/full dataset.
- New layouts, new files beyond the helper, animation rewrites.

### Verification

After edits I'll do a build + read-back check and confirm:
- Toggle in MONEY: every page shows full dataset, equity curves in `$`.
- Toggle in R_MULTIPLE: CSV-only trades filtered, equity curves in `R`, hidden-hint visible.

Shall I proceed with this scope, or do you want to narrow Layer 2 to a specific subset (e.g. only the Overview equity curve) for this pass?
