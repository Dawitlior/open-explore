## Performance Diagnostic Report — ORCA

Analysis only. No code was changed. Numbers below come from a real production build of the current codebase.

### Measured baseline

| Artifact | Raw | Gzip |
|---|---|---|
| `index-*.js` (entry) | 1.2 MB | 356 KB |
| `vendor-charts` (recharts) | 464 KB | 124 KB |
| `vendor-xlsx` | 416 KB | 141 KB |
| `JournalDimension` | 250 KB | 69 KB |
| `vendor-supabase` | 203 KB | 53 KB |
| `html2canvas` | 198 KB | 47 KB |
| `WeeklyTab` (MUI) | 192 KB | 64 KB |
| `index.css` | 117 KB | — |
| All JS | 4.24 MB | — |
| `dist/` total | 13 MB | — |

Roughly **520 KB gzipped of JS is required before the dashboard can paint** (entry + react + supabase + charts). That is the single biggest lever.

---

## 1. Bundle structure

**F1 — The entry chunk is 356 KB gzip and contains almost the whole app shell.**
Where: `src/App.tsx` statically imports `Index`, `Auth`, `Landing`, `Terms`, `Privacy`, `Accessibility`, `NotFound`, plus `LegalGate`, `EconomicAlertBanner`, `UpgradeModal`, `CookieConsentRoot`, `A11yPanel`, `OrcaConfirmRoot`, `ImportPreflightRoot`, and `import "@/lib/brokers"` (every broker adapter). `src/pages/Index.tsx` then statically imports ~40 more modules (`SettingsHub` 2,996 lines, `TradeForm`, `CalendarModal`, `CommandPalette`, `FeatureManifestModal`, `TraderMindSession`, `ResetModal`, `OnboardingWizard`, …).
Why it hurts: every byte is parsed and executed before first paint, on every route including `/welcome` and `/auth`.
Fix: route-level `lazy()` for `Landing`, `Auth`, `Terms`, `Privacy`, `Accessibility`; component-level `lazy()` for every modal that starts closed (`SettingsHub`, `TradeForm`, `ResetModal`, `CalendarModal`, `CommandPalette`, `FeatureManifestModal`, `TraderMindSession`, `ImportPreflightModal`, `UpgradeModal`, `A11yPanel`). Expected: entry drops well under 200 KB gzip.

**F2 — `recharts` (124 KB gz) is eagerly loaded.**
Where: `src/pages/Index.tsx` line 5 statically imports 25 recharts symbols even though the chart-heavy surfaces (`ReviewDashboard`, `AdvancedAnalyticsPage`, …) are already lazy.
Why: forces the chart vendor chunk into the critical path for users who never scroll to a chart.
Fix: move the inline recharts usages in `Index.tsx` into a lazy child component so `vendor-charts` loads on demand.

**F3 — `@mui/material` + `@mui/icons-material` + `@emotion` ship for a feature that is hard-gated to one email.**
Where: the entire `src/components/weekly-review/render/**` tree and `reflection-theme.ts`. Produces `WeeklyTab` (64 KB gz) and `DefaultPropsProvider` (80 KB) chunks.
Why: two full UI systems (shadcn/Tailwind + MUI/Emotion) for a page 99.9% of users cannot open.
Fix: keep the whole subtree behind a single dynamic import gated on entitlement (it is partly lazy already, but `use-user-template.ts` statically re-imports `wr-merge`, defeating splitting — see F5). Longer term, port those screens off MUI and drop 4 dependencies.

**F4 — `xlsx` (141 KB gz) and `html2canvas` (47 KB gz) are large and only needed on rare actions.**
Where: `src/lib/xlsx-engine.ts` and `src/lib/uie/io.ts` use `import * as XLSX`; `src/lib/brokers/_csv-factory.ts` statically imports `xlsx-engine`, and `src/lib/brokers/index.ts` is a side-effect import in `App.tsx` — so the broker registry drags xlsx toward the boot graph.
Why: import/export and screenshot capture are once-in-a-session actions paying a first-load cost.
Fix: make `brokers/index.ts` register adapters lazily (registry stores loader functions), and use `await import('xlsx')` / `await import('html2canvas')` inside the handlers only.

**F5 — Five modules are both statically and dynamically imported, so the dynamic import is a no-op.**
Rollup reported this for `scoped-storage.ts`, `storage.ts`, `xlsx-engine.ts`, `orca-confirm.tsx`, `wr-merge.ts`.
Why: the code *looks* split but the module is already in the parent chunk — zero benefit, plus confusion.
Fix: pick one strategy per module. For `storage.ts`/`scoped-storage.ts` just make them static everywhere (they are small and always needed); for `xlsx-engine` and `orca-confirm` remove the static importers.

**F6 — `manualChunks` is a coarse hard-coded map.**
Where: `vite.config.ts`.
Why: `vendor-charts` and `vendor-xlsx` are single monoliths; changing one line in the app invalidates the 1.2 MB entry chunk for every returning user.
Fix: split vendor by `node_modules` package path instead of a fixed list, so caching is granular.

---

## 2. Assets

**F7 — 17 landing PNGs totalling ~4.4 MB, plus a 505 KB logo shipped twice.**
Where: `src/assets/landing/*.png` (largest: `ai_gold_edge.png` 512 KB, `orca_logo.png` 505 KB, `calendar.png` 424 KB, `dashboard_main.png` 408 KB) and `public/orca-logo.png` (505 KB) duplicated at `src/assets/orca-logo.png`.
Why: `public/orca-logo.png` is the favicon *and* the PWA icon — every visitor downloads 505 KB for a 32 px icon. Landing screenshots dominate LCP on `/welcome`.
Fix: convert screenshots to WebP/AVIF via `vite-imagetools` (expect 70–85% reduction), generate proper 192/512 px PWA icons and a small favicon, add `loading="lazy"` + `decoding="async"` to below-fold screenshots, and `<link rel="preload" as="image">` only for the single LCP hero.

**F8 — 117 KB of CSS in one blocking stylesheet.**
Where: `src/index.css` plus `dashboard.css`, `a11y-engine.css`.
Why: render-blocking; much of it targets routes the visitor is not on.
Fix: audit for dead rules, and move route-specific CSS into the lazy chunk that uses it (`ReviewDashboard.css` already does this correctly — use it as the pattern).

---

## 3. Data access

**F9 — `@tanstack/react-query` is installed and provided, but there is not a single `useQuery` in the codebase.**
Where: `src/App.tsx` sets up `QueryClientProvider`; zero consumers.
Why: all server state is hand-rolled with `useState` + `useEffect`, so there is no dedupe, no cache, no stale-while-revalidate. Every remount refetches.
Fix: migrate the hot read paths (`use-trades`, `use-portfolios`, `use-economic-events`, `use-settings`, `use-entitlement`) to `useQuery` with sane `staleTime`. This is the highest-value structural fix after F1.

**F10 — Full trade reload on every sync event.**
Where: `src/hooks/use-trades.ts` — `orca:trades-synced` and `orca:active-portfolio-changed` both call `load()`, which pages the *entire* trades table 1,000 rows at a time (`src/lib/storage.ts` `getAllTrades`), re-sanitizes, dedupes and re-sorts everything.
Why: after importing 3,000 trades this is 3 round-trips plus a full O(n log n) re-process, and it fires again for each subsequent event. Also creates a brand-new `trades` array identity, invalidating every downstream `useMemo`.
Fix: debounce the event-driven reload (~300 ms), and for local mutations patch state in place instead of refetching. Cache the sanitized result keyed by portfolio id.

**F11 — Several always-on timers.**
Where: `use-kill-switch.ts` 30 s interval, `use-admin-live.ts` 30 s poll, `use-deployment-watcher.ts` interval poll, `Index.tsx:572` 5 min tick, `WeeklyReviewBanner` 60 s tick, `ExchangesPanel.tsx:687` **120 ms** interval, `OrcaBootLoader` 250 ms poll.
Why: the 120 ms interval re-renders a panel ~8×/s; none of them pause when the tab is hidden, so background tabs keep burning CPU and battery.
Fix: gate every interval on `document.visibilityState === 'visible'`, raise the 120 ms tick to ~1 s (or drive it with `requestAnimationFrame` only while a sync is active), and let react-query's `refetchInterval` handle the polling ones.

**F12 — Settings are read one key at a time.**
Where: `src/lib/storage.ts` `getSetting()` does one `maybeSingle()` per key; `use-settings`, `use-ui-prefs`, `use-lang`, `use-risk-limits`, `use-dashboard-config`, `use-week-start` each call it independently.
Why: classic N+1 — 6+ sequential round-trips at boot, serialised behind auth.
Fix: one `select('key,value').eq('user_id', uid)` at boot into a context/react-query cache; `getSetting` reads from that map.

---

## 4. Rendering

**F13 — `Index.tsx` is a 2,222-line component with ~35 `useState` hooks.**
Why: any state change — hover on a calendar day (`calHoverDay`), opening a menu, a 5-minute reminder tick — re-renders the whole tree including the dashboard and all charts.
Fix: extract modal/UI-chrome state into a small context or `useReducer` colocated with the consumers; split the page body into memoised sections (`<DashboardSection>`, `<CalendarSection>`, `<JournalSection>`) so unrelated state changes stay local.

**F14 — `JournalDimension.tsx`: 4,853 lines, 29 `useEffect`, 36 memo hooks in one file.**
Why: 250 KB chunk, very expensive mount, and hard to reason about which effect re-fires.
Fix: split into subcomponents by responsibility (bridge, entry list, editor, analytics) so React can bail out on subtrees.

**F15 — Expensive analytics recompute on every `trades` identity change.**
Where: `use-trades.ts` `stats = useMemo(... computeAnalytics(filtered) ...)`, plus `Index.tsx` `riskData = useMemo(() => assessRisk(trades))`, `rEligibleTrades`, `calDayPnl`, `weekStats`, `monthStats`.
Why: these run synchronously on the main thread; combined with F10 (new array identity per sync) they re-run more often than the data actually changes.
Fix: memoise on a cheap content signature (length + max id + last-updated) rather than array identity; for large datasets move `computeAnalytics` behind `startTransition` or a Web Worker.

**F16 — `OrcaUXLayer` has 12 effects with global listeners.**
Why: scroll/pointer/resize listeners on every route, mounted for signed-out visitors too.
Fix: it is already lazy — additionally gate the ambient effects behind `prefers-reduced-motion` and skip them entirely on mobile/low-`deviceMemory` devices.

**F17 — Charts re-render on parent state changes.**
Where: 21 files import recharts; most chart components are not wrapped in `React.memo` and receive inline-constructed `data`/`margin`/`style` object literals.
Why: recharts re-layout is one of the most expensive things in the app.
Fix: `React.memo` each chart, hoist static `margin`/`style` objects to module scope, and memoise the `data` arrays.

---

## 5. Main-thread work

**F18 — Import pipeline parses XLSX/CSV synchronously.** `src/lib/uie/pipeline.ts` + `xlsx-engine.ts` block the UI during a large import (the loading overlay is animating on the same blocked thread). Fix: move parsing into a Web Worker.

**F19 — `html2canvas` capture in Bug Arena.** Already disabled on mobile; on desktop it still freezes the tab for hundreds of ms. Fix: dynamic import at click time (F4) and run it inside `requestIdleCallback`.

**F20 — The `index.html` preboot script does a full `localStorage` scan + JSON parse of every `sb-*` key on every page load,** before anything renders. Small, but it is strictly on the critical path. Fix: cache the resolved uid under a single well-known key.

---

## Suggested order of work

1. **F1 + F2** — lazy-load routes, modals and recharts. Biggest first-paint win, lowest risk.
2. **F7** — image/icon optimisation. Large win on `/welcome` and mobile.
3. **F4 + F5** — dynamic `xlsx`/`html2canvas`, fix the no-op dynamic imports.
4. **F11 + F12** — visibility-gated timers, batched settings read.
5. **F9 + F10** — react-query migration for the hot read paths.
6. **F13 + F15 + F17** — component splitting and memoisation.
7. **F3, F14, F18** — larger refactors (drop MUI, split JournalDimension, worker-based import).

---

## Also requested: per-tab loading skeleton (Control Room)

`src/components/trading/ControlRoomPage.tsx` currently renders `TabSkeleton` as three fixed bars (220/160/160 px), which does **not** match either tab's real layout — so switching tabs causes a visible jump. Planned change (not yet applied):

- Give `TabSkeleton` a `tab` prop and render two distinct shapes: **Risk** = LiveStateBar strip + 2-up KPI row + wide exposure block + table; **Mind** = header strip + radar/donut pair + stacked insight cards.
- Reserve height with `min-height` on the tab container equal to the last measured real content height (tracked per tab in a ref), so the swap is zero-shift.
- Respect `prefers-reduced-motion` for the pulse animation.

### Technical notes
No code changes have been made. Every finding above is reproducible from the build output in `dist/` and the file references given.
