# Color Discipline Pass — Dashboard + Performance Deck

Goal: keep every theme exactly as it is, and fix only the *accompanying* colors — gauges, chart series, calendar dots, metric cards. Color becomes information, never decoration.

## What is wrong today (verified in code)

- **System Health gauges** are hardcoded per-position: Orca Score = cyan, Regime Fit = purple, Risk Consistency = orange, Discipline = green — static, unrelated to the score. Orange at 74 and green at 100 look meaningful but are not.
- **Trading Health cards** hardcode green for Win Rate and orange for Max Drawdown regardless of value.
- **Calendar sessions** use three saturated hues (amber `#F0B429`, blue `#4C8DFF`, green `#3DDC97`) sitting next to red/green P&L squares — green sessions collide with the profit meaning.
- **Performance Deck** (`AdvancedAnalyticsPage`) mixes ~6 accents across the page, including 22 green / 26 red usages, many on non-P&L elements.

## The rules we implement

1. Neutral by default — a metric is muted/foreground unless it crosses a threshold.
2. Red and green are reserved for P&L, win/loss, and equity/drawdown only.
3. Warning states use one amber and one red, and always ship an icon or weight change too, never color alone.
4. Categorical chart series use a single-hue sequential ladder from the active theme, not a rainbow.
5. Max 2–3 colors inside any one bento block.
6. Sessions are neutral grays with different weights, not three hues.

## The changes

**New helper `src/lib/semantic-color.ts`** — one place that decides color from meaning:
- `scoreColor(T, score, {warn, bad})` → neutral text color when healthy, amber below `warn`, red below `bad`.
- `scoreGlyph(score, ...)` → `▲ / ▬ / ▼` marker so the state reads without color.
- `metricColor(T, kind, value)` for P&L-bearing metrics (keeps existing green/red).
- `neutralRamp(T, n)` — n steps of the theme's own hue for categorical/sequential use, sourced from `T.chart.series` first entry + lightness steps.

**System Health gauges** (`ReviewDashboard.tsx`): all four gauges lose their fixed colors and use `scoreColor` with score-appropriate thresholds (Discipline/Risk Consistency 70/50, Orca Score 65/45, Regime Fit 60/40). A healthy score renders in the theme's calm accent tint; only a breach lights amber/red, with the trend glyph next to the number.

**Trading Health cards**: Win Rate colored by value against its own baseline instead of always-green; Max Drawdown colored by severity instead of always-orange; Net P&L / Net R keep semantic green/red.

**Calendar sessions** (`market-sessions.ts` + `SessionUI.tsx`): the three session colors become neutral steps (`AS` faint, `LDN` mid, `NY` bright) derived from theme text/border tokens, so P&L squares are the only colored thing in the grid. Session identity stays readable via position, label and tooltip.

**Performance Deck + Quant Lab + Advanced Lab**: sweep hardcoded `T.accent.*` on chart series and non-financial metrics and route them through `seriesColor(T, i)` / `neutralRamp`. Green and red survive only where the number is money, R, win/loss or drawdown. Glow/neon shadows are removed from historical charts (matte), kept only on live/open-position surfaces.

## What stays untouched

Themes, layout, data, formulas, functionality. No token values in `trading-theme.ts` are edited — the plan only changes *which* token each element asks for.

## Technical notes

- Files: new `src/lib/semantic-color.ts`; edits to `src/components/dashboard/ReviewDashboard.tsx`, `src/components/calendar/SessionUI.tsx`, `src/lib/market-sessions.ts`, `src/components/dashboard/DashboardCalendarStrip.tsx`, `src/components/trading/AdvancedAnalyticsPage.tsx`, `src/components/trading/AnalyticsQuantLab.tsx`, `src/components/dashboard/DashboardAdvancedLab.tsx`, `src/components/dashboard/SimpleExtraCharts.tsx`, `src/components/dashboard/RiskAdjustedRatiosSection.tsx`.
- All four themes are verified after the sweep (Midnight, Blue, Platinum, Graphite) on Dashboard, Calendar and Performance Deck.
