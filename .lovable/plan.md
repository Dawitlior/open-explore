
# Weekly Review — Native Rebuild (Kill the iframe)

## Why rebuild

The current `WeeklyReviewPage` is an iframe wrapper around `/public/weekly-review/index.html` — a 10k-line standalone HTML app with its own React UMD, Recharts UMD, Poppins font, and isolated localStorage. Consequences:

- Two design systems on one screen (Orca tokens outside, ad-hoc inline styles inside)
- Two state stores (Supabase trades outside, postMessage-synced copy inside)
- No PWA / safe-area / RTL parity with the rest of the platform
- ~3MB of duplicated JS shipped on every visit
- Breaks Orca theme switching, privacy mask, locale, sound engine, AI coach hooks

This module should be a **first-class page**, not an embedded app.

## What we keep (the user's product, intact)

From the inlined app, every feature and the underlying "thinking" stays. The 5 tabs are:

```text
0. סיכום שבועי ⚡   Weekly Summary    — current-week close, mindset, focus, trade log, "close week" lock
1. ניהול סטאפים ⚙️  Setup Manager     — CRUD setups, per-setup NetR breakdown
2. ארכיון חודשי 📅  Monthly Archive   — historical weeks, edit/expand rows, monthly recap modal
3. חצי-שנתי 📊      Semi-Annual (6mo) — equity curve, radar DNA, waterfall, PF trend, win-rate trend,
                                       momentum, setup evolution, profit pie, heatmap, psych correlation,
                                       ticker breakdown, highlights, best/worst week, R-distribution,
                                       compliance score, setup dominance, MoM compare, trade ledger
4. שנתי 🗓️         Annual            — same modules over 12 months
```

Plus: lock/unlock-on-Friday rule, week grading, monthly recap modal, theme presets (midnight/snow), bilingual labels.

## Architecture (native, modular)

```text
src/components/weekly-review/
  WeeklyReviewPage.tsx          — entry, replaces the iframe wrapper
  WeeklyReviewShell.tsx         — tab bar + RTL + safe-area + suspense
  tabs/
    WeeklyTab.tsx               — close-week flow, mindset, focus, current trades
    SetupsTab.tsx               — setup CRUD + per-setup breakdown grid
    MonthlyArchiveTab.tsx       — archive table, inline edit, expand, monthly recap modal
    SemiAnnualTab.tsx           — 6-month dashboard, composes /modules
    AnnualTab.tsx               — 12-month dashboard, composes /modules
  modules/                      — reusable analytics blocks shared by Semi/Annual
    EquityCurve.tsx
    TraderDnaRadar.tsx
    MonthlyWaterfall.tsx
    ProfitFactorTrend.tsx
    WinRateTrend.tsx
    MomentumChart.tsx
    SetupEvolution.tsx
    SetupProfitPie.tsx
    TimeDayHeatmap.tsx
    PsychCorrelation.tsx
    TickerBreakdown.tsx
    HighlightsStrip.tsx
    BestWorstWeek.tsx
    RDistribution.tsx
    ComplianceScore.tsx
    SetupDominance.tsx
    MoMCompare.tsx
    TradeLedger.tsx
    SectionTitle.tsx           — Orca-themed replacement for inline sectionTitle()
  modals/
    MonthlyRecapModal.tsx
    CloseWeekModal.tsx
  hooks/
    use-weekly-review-state.ts — archive, setups, monthSummaries, recaps in Cloud
    use-week-aggregates.ts     — derives R, focus, grade, best/worst, etc. from trades
    use-period-aggregates.ts   — 6mo / 12mo slicers feeding all /modules
  lib/
    grading.ts                 — week grade A/B/C/D/F formula (port verbatim)
    setup-breakdown.ts         — getSetupBreakdown(trades) (port verbatim)
    week-key.ts                — ISO week key, Friday-lock check
    types.ts
```

`WeeklyReviewPage.tsx` becomes 30 lines: pulls trades + risk + settings via existing hooks, hands them down, no iframe, no postMessage, no localStorage.

## Data: Cloud-backed, no iframe storage

Three new Cloud rows (per user) replace the iframe's localStorage:

| key | shape | source |
|---|---|---|
| `weekly_review.archive` | `WeekRecord[]` | written on close-week |
| `weekly_review.setups`  | `Setup[]`      | setup manager CRUD |
| `weekly_review.recaps`  | `Record<MonthKey, MarkdownRecap>` | monthly recap modal |

Stored in the existing `user_settings` table (key/value JSONB — already in use by the platform), so **no migration needed**. RLS already scopes per `auth.uid()`.

Trades themselves come from `useTrades()` — the iframe was syncing a copy of them; we just use the real source.

## Design system mapping (Orca identity)

Replace every inline `s.title / s.tabs / s.statCard / s.sectionTitle` from the HTML with platform primitives:

| Old (iframe) | New (Orca) |
|---|---|
| Poppins everywhere | Poppins headers + IBM Plex Mono numerics (platform standard) |
| `#0a0a0f` / `#39FF14` ad-hoc | `--background`, `--accent-cyan`, theme tokens via `useTradingTheme` |
| Inline `s.tabs` | `OrcaPanel` + segmented tab control matching `SettingsHub` |
| Inline `s.statCard` | `OrcaMetric` / `OrcaCard` |
| Section title function | `<SectionTitle icon title infoId />` component, info-button hooked into existing `ChartExplanationModal` |
| Custom Recharts colors | `lib/trading-theme.ts` palette + tooltip style (already standardized) |
| RTL by `dir="rtl"` only | Full `useLang()` + i18n strings, both HE and EN |
| `position: fixed` close-week dialog | shadcn `Dialog` |

Charts use the existing `ChartWrapper` + `LazyChart` infra so they participate in the dashboard's container-query/safe-area system.

## Port strategy (most efficient path)

The standalone is minified inline JSX (`React.createElement`). Reading it byte-by-byte is the slow path. Instead:

1. **Spec-extract per tab** — grep the inlined source for each module's identifiers (`getSetupBreakdown`, `gradeColors`, `bestWeek/worstWeek`, `monthSummaries`, `rData`, `allTrades`, `pfTrend`, `winRateTrend`, `radar`, `momentum`, `waterfall`, `setupEvolution`, `pie`, `heatmap`, `psych`, `ticker`, `highlights`, `RDistribution`, `compliance`, `dominance`, `mom`, `ledger`) and pull out their pure-math bodies into `lib/`. These functions are dependency-free — they take `trades[]` and return numbers. Direct port.
2. **Re-render with Recharts + Orca tokens** — chart components rebuilt cleanly; we already have Recharts as a real dep, so no UMD needed.
3. **Layout from scratch** — using `dashboard.css` patterns (CSS Grid + container queries) we just shipped. No inline ternaries on `isMobile`.
4. **Single-pass build, behind feature flag `WEEKLY_REVIEW_NATIVE`** for one commit so you can A/B against the iframe; flag removed after sign-off.

## Build order

1. Scaffold folder + types + `use-weekly-review-state` (Cloud read/write) + `WeeklyReviewShell` with 5 empty tabs
2. Port `lib/grading.ts`, `lib/setup-breakdown.ts`, `lib/week-key.ts` (pure math, unit-testable)
3. `WeeklyTab` (close-week, mindset, current trades) — most-used surface, ship first
4. `SetupsTab` + `MonthlyArchiveTab` + `MonthlyRecapModal`
5. Build `/modules` charts one-by-one; compose `SemiAnnualTab` then `AnnualTab`
6. Flip `WeeklyReviewPage` from iframe to `<WeeklyReviewShell />`, delete `public/weekly-review/`
7. QA at 360 / 414 / 768 / 1024, HE + EN, midnight + platinum themes, PWA standalone mode

## What we delete when done

- `public/weekly-review/index.html` (10k lines, 3MB of bundled UMD)
- `src/components/trading/WeeklyReviewPage.tsx` postMessage bridge
- All `ORCA_TRADES_SYNC` / `ORCA_THEME_SYNC` / `WEEKLY_REVIEW_READY` plumbing

## Guardrails

- No business-logic changes to grading, R-calc, or setup math — verbatim ports
- No DB migrations (reuses `user_settings`)
- No new dependencies (Recharts, framer-motion, shadcn already present)
- Other pages untouched
- Estimated 1 build pass for steps 1–4, second pass for steps 5–7

## Approve to build?

If yes, I start immediately at step 1 and ship through step 4 in this session, then steps 5–7 in the next.
