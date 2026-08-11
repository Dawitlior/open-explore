# Light-Mode Micro-Polish: Master Plan

A precision pass on legibility, spatial rhythm, and card edge consistency in the light ("platinum") scheme. Nothing about the existing structure, layout, or the recently completed color-discipline language changes. The strategy is token-first: fix the source, not 300 call sites.

**Desktop only.** Mobile is already correct and stays byte-identical in behavior. Every spacing, padding, gap, border-weight and shadow change is authored inside a `@media (min-width: 768px)` block (or an existing desktop container-query tier). The only changes that reach mobile are the text-contrast token retunes — those are an accessibility fix, they make mobile text darker/more legible and change no layout. If you'd rather mobile keep the exact current text colors too, say so and the token retune gets scoped behind the desktop media query as CSS variable overrides instead.

## Measured state of the platform

Verified by scanning the codebase:

- `text.dim` = #94A3B8 on the white card = **~2.7:1** — fails WCAG AA. Used across Index, Settings, AI Insights, Psychology.
- `text.muted` = #64748B = ~4.8:1 — passes for body, but marginal at the 9-11px uppercase micro-labels that dominate this app.
- `border.subtle` = #EEF1F7 = **~1.05:1** against white — effectively invisible. Referenced **318 times inline** across components, while `.orca-glass` cards simultaneously draw a different edge (#E9EDF5) from CSS. That double source is exactly the "some cards have borders, some don't" symptom.
- Card padding is authored per component: 29 inline `GlassCard` padding overrides, with 14 / 16 / 12 / 24 / 20 / 32 all in active use.
- Charts read axis/tick color from `T.chart.axis` in 100+ places, so a single token change reaches every chart.

## Where the work lands

### Tier 1 — token layer (fixes the majority everywhere at once)

| File | Change |
|---|---|
| `src/lib/trading-theme.ts` (`platinum` only) | Retune `text.dim`, `text.muted`, `border.subtle`, `border.medium`, `chart.axis`, `chart.grid`, and the `shadow.card` / `shadow.elevated` pair |
| `src/index.css` (`html[data-scheme="light"]`) | One canonical card recipe: border weight, resting shadow, hover shadow as a fixed delta, and normalized card padding that still respects the compact/comfortable/spacious density switch |
| `src/components/dashboard/dashboard.css` | Unify grid gaps (currently 6 / 10 / 12 / 16 / 18px) onto a 3-step scale, and add a shared chart inset variable for title-to-plot and plot-to-caption spacing |

Target values:

- `dim` #94A3B8 → **#64748B** (4.8:1)
- `muted` #64748B → **#566171** (~6:1) — carries the dense micro-labels
- `chart.axis` → **#566171**, matching axis ticks to label weight
- `border.subtle` #EEF1F7 → **#E4E9F2**; `border.medium` #E9EDF5 → **#D8E0EC** — the inline path and the CSS path converge instead of contradicting
- Canonical card shadow: `0 1px 2px rgba(15,23,42,0.05), 0 6px 18px rgba(15,23,42,0.05)`

Dark themes (midnight, blue, graphite) are untouched — every value above lives inside the `platinum` object or behind `data-scheme="light"`.

### Tier 2 — the dense analytical surfaces (visual verification, targeted cleanup)

These are where micro-labels and chart chrome are densest, so each one gets an on-screen check after Tier 1 and hand cleanup only where an inline hardcode defeats the token:

1. **Dashboard** — `ReviewDashboard.tsx`, `SimpleExtraCharts.tsx`, `PnLDistributionHistogram.tsx`, `BestWorstWindowChart.tsx`, `DashboardAdvancedLab.tsx`, `DashboardCalendarStrip.tsx`. Highest chart density; caption lines like "Cumulative net profit/loss" live here.
2. **Performance Deck** — `AdvancedAnalyticsPage.tsx` (27 micro-labels, 20 inline borders), `AnalyticsQuantLab.tsx`, `UltimateDeckCharts.tsx`, `TimeSeriesPerfMatrix.tsx`.
3. **Control Room** — `AdvancedRiskPage.tsx` (25 micro-labels), `AdvancedPsychologyPage.tsx` (39), `PsychologyLab.tsx`, `ControlRoomPage.tsx` and its risk sub-panels.
4. **Home / Index** — `src/pages/Index.tsx`: the single worst offender at 54 inline `border.subtle` uses, 51 micro-labels, and 25 chart axis references.
5. **Journal** — `JournalDimension.tsx` (160 micro-labels — the densest file in the app), `JournalGallery.tsx`, `TradeDetailModal.tsx`.
6. **Calendar** — `CalendarHubPage.tsx`, `CalendarModal.tsx`, `MonthDayCell.tsx`, `YearView.tsx`.
7. **Settings & shell** — `SettingsHub.tsx` (52 inline borders, 46 micro-labels), `ExchangesPanel.tsx`, `TradeForm.tsx`, `AIInsightsPage.tsx`, `WeeklyReviewPage.tsx`.

### Tier 3 — regression guard

A contrast check that walks the light-scheme token table and asserts every text tier clears AA against `bg.card` and `bg.tertiary`, so a future palette edit can't silently reintroduce ghost text.

## Execution order

```text
Wave 1  Tokens + light-scheme CSS + grid scale        (Tier 1)
Wave 2  Dashboard, Performance Deck, Control Room      verify + cleanup
Wave 3  Index, Journal, Calendar                       verify + cleanup
Wave 4  Settings, modals, shell surfaces               verify + cleanup
Wave 5  Contrast assertion + full light-mode sweep
```

Each wave ends with a rendered light-mode check of those routes, not just a typecheck.

## Why this is the right shape for a trading terminal

- **Cognitive load**: secondary text that is legible at a glance costs zero re-read effort; ghost text forces the eye to work, and that tax compounds over a session.
- **Von Restorff / isolation**: one card edge weight and one elevation across every page means the only element that can visually pop is a genuine alert — which is precisely what the color-discipline pass established.
- **Visual fatigue**: raising secondary text contrast while *lowering* decorative edge contrast tightens the useful signal and quiets the decorative noise, rather than globally increasing contrast (which would strain the eye over long sessions).
- **Spatial rhythm**: a fixed inset between title, plot, and caption means the eye's saccade distance is predictable, so scanning a bento grid stops being a search task.

## Explicitly out of scope

No changes to dark themes, no repositioning or resizing of charts, no changes to which metrics are colored, no component restructuring.
