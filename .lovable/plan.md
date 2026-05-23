
# ORCA ARCHITECTURAL OVERHAUL — MASTER PLAN

Four phases. No code ships until you approve. Each phase is independently shippable and reversible.

---

## PHASE 1 — MOBILE NATIVE FIXES (LAYOUT & RESPONSIVENESS)

### 1.1 Double-Scrollbar Root Cause + Fix

The dashboard nests three scroll containers: the document body, the `TradingUI` shell wrapper, and per-panel `OrcaPanel` inner scrolls. On mobile, both the body and shell remain scrollable, producing the second bar.

**Fix:**
- Lock `html, body` to `overflow: hidden; height: 100dvh` on the dashboard route only (scoped class on `<body>` via `useEffect` mount/unmount — does not affect `/auth`, `/calibration`, `/terms`).
- Promote the dashboard shell to a single CSS grid: `grid-template-rows: auto 1fr auto` (header / scroll-zone / mobile-bottom-nav). The middle row owns the only `overflow-y: auto` on mobile.
- Inside the scroll-zone, switch `OrcaPanel` inner `overflow-y` to `visible` on `<md` breakpoints. Panels become long flow content on mobile; only the parent scrolls.
- Replace all `min-h-screen` on dashboard sub-trees with `min-h-0` so flex children don't blow out the grid row.

### 1.2 Remove Redundant Top Nav on Mobile

`Index.tsx` currently renders the top brand bar + `MobileBottomNav` simultaneously. The top bar duplicates the bottom nav's primary actions on mobile.

**Fix:** Wrap the top bar in `hidden md:flex`. Keep brand + sign-out accessible via a single condensed header strip (logo + privacy-mask + avatar only, 44px high) on `<md`. Sidebar remains the desktop primary; bottom nav remains the mobile primary.

### 1.3 Alpha Live / Review Live / Charts Responsive Failure

Symptoms: charts overflow horizontally, KPI grid wraps to 5+ rows, `AdvancedAnalyticsPage` tile grid stays at 3-col on 390px.

**Fix:**
- Standardize a `useBreakpoint()` hook returning `'sm'|'md'|'lg'|'xl'`. All dashboard surfaces consume it (no more ad-hoc `window.innerWidth` reads).
- `LazyChart` wraps every chart in a `ResponsiveContainer` with `aspect={16/9}` on mobile, fixed-height on desktop. Mandate `width="100%"` and remove every hard-coded pixel width in Recharts usage.
- KPI grids: `grid-cols-2` on mobile, `grid-cols-4` md+. No 3-col on mobile.
- `AdvancedAnalyticsPage`, `AdvancedPsychologyPage`, `AdvancedRiskPage`: collapse to a single accordion column on `<md`, restore tile grid `md+`.
- `DimensionController`: short-circuit to a vertical tab strip on mobile, not the horizontal scroller (which was the source of the rogue x-scroll).

### 1.4 Backtest Journal — Desktop Only

**Fix:** Add a `<DesktopOnlyGate feature="backtest" />` wrapper. On `<lg` breakpoint, render a branded `OrcaCard` modal:

```text
┌──────────────────────────────────────┐
│  ◈ PRECISION REQUIRED                │
│                                      │
│  Backtesting requires a desktop      │
│  environment for chart precision     │
│  and multi-frame analysis.           │
│                                      │
│  Open Orca on a laptop or larger     │
│  display to access this surface.     │
│                                      │
│  [ return to dashboard ]             │
└──────────────────────────────────────┘
```

IBM Plex Mono, `#061326` ground, single hairline border. No close X — only the return action. Routes blocked: `/backtest`, the Research-mode `BacktestDimension`, and the commit modal.

### 1.5 Economic Radar / Alert Redesign

**Current problems:** the alert banner uses a light gradient that washes out on the dark terminal; audio fires unconditionally; the radar page looks like a third-party widget grafted on.

**Design spec (Orca-native):**

```text
┌─ ◈ ECONOMIC RADAR · live ─────────────────────────────────────┐
│ T-1m  ▸  US CPI YoY · 14:30 EDT · USD · t1                    │
│       ▸ consensus 3.1 · prior 3.0 · 12s to release            │
├───────────────────────────────────────────────────────────────┤
│ TODAY                                                          │
│ 14:30  t1  USD  US CPI YoY            cons 3.1   prior 3.0    │
│ 15:00  t1  USD  Fed Chair Powell      —          —            │
│ 02:00  t1  CNY  PBoC MLF Rate         cons 2.50  prior 2.50   │
│                                                                │
│ THIS WEEK · expand ▾                                          │
└───────────────────────────────────────────────────────────────┘
```

Rules:
- Pure `#061326` ground, hairline `border-border/40` dividers, IBM Plex Mono throughout, tabular-nums for all numerics.
- Tier glyphs: `t1` amber, `t2` muted, `t3` dim. No country flag emojis — ISO codes only.
- T-5m / T-1m / live banner: replace gradient with solid `bg-card`, text color resolved from current theme tokens (`text-foreground` for body, `text-amber-400` for tier-1 phase chip). Contrast verified against both Midnight and Snow themes.
- **Audio disabled.** Remove every `apex-sounds` invocation from `use-economic-radar.ts` and the banner component. Replace with a silent visual pulse (220ms opacity flicker on the phase chip).
- Mobile: collapse the "this week" section by default, single-column event list, sticky phase banner at top of the scroll zone.

### 1.6 Performance Diagnostic Plan

**Why mobile feels sluggish (hypotheses, to be confirmed with the profiler):**
1. Every dashboard mount re-runs `useTrades`, `useRiskLimits`, `useOracleVector`, `useEconomicEvents`, `useRecalibrationTrigger` synchronously on the same tick.
2. `Index.tsx` (~1700 lines) re-renders the entire tree on any state change because most child components are not memoized.
3. Recharts components mount eagerly on tab switch instead of lazy-loading per mode.
4. Touch events use default passive=false handlers in pull-to-refresh, blocking the scroll thread.
5. Framer Motion `AnimatePresence` wraps the whole dashboard transition — full unmount/remount on every mode switch.

**Plan:**
- Run `browser--performance_profile` + `browser--start_profiling` on mobile viewport to confirm the top offenders before changing anything.
- Code-split each mode's render branch via `React.lazy`. `live`, `review`, `research`, `beginner` become separate chunks.
- Memoize every dashboard child with `React.memo` + stable prop refs (`useMemo` for derived objects). Move the four big data hooks into a single `useDashboardData()` aggregator with `useSyncExternalStore` semantics so children subscribe only to the slice they use.
- Convert pull-to-refresh handlers to `{ passive: true }` and lift the gesture into a single root listener instead of one per scrollable.
- Replace mode-switch `AnimatePresence` with a CSS opacity crossfade (200ms). Components stay mounted across mode switches inside the same operating mode; only the layout grid template changes.
- Pre-warm chart chunks on idle (`requestIdleCallback`) so the first chart paint after mode switch is < 80ms.

**Target:** TTI < 1.2s on mid-range mobile, interaction latency < 150ms p95, no long task > 200ms during mode switch.

---

## PHASE 2 — MODE × STATE MAPPING MATRIX

Two axes: **Operating Mode** {Beginner, Standard, Alpha} × **Dashboard State** {Live, Review, Research}. Beginner skips Research. Every cell is a curated allowlist — anything not listed is hidden (not greyed).

### 2.1 Master Matrix

```text
╔══════════╦═══════════════════════╦═══════════════════════╦═══════════════════════╗
║          ║ LIVE                  ║ REVIEW                ║ RESEARCH              ║
╠══════════╬═══════════════════════╬═══════════════════════╬═══════════════════════╣
║ BEGINNER ║ Today P&L (R)         ║ Week heatmap          ║ — (locked, upsell)    ║
║          ║ Risk-used hairline    ║ Win-rate sparkline    ║                       ║
║          ║ Next macro (1 line)   ║ Top mistake of week   ║                       ║
║          ║ Coach tip (1 line)    ║ Single AI insight     ║                       ║
╠══════════╬═══════════════════════╬═══════════════════════╬═══════════════════════╣
║ STANDARD ║ Open positions tile   ║ KPI cards (W/M/All)   ║ QuantLab: equity,     ║
║ (current ║ Quick TradeForm       ║ Calendar P&L heatmap  ║   drawdown, R-dist    ║
║  Alpha   ║ Today P&L + R         ║ Trade table           ║ Economic Radar full   ║
║  set per ║ RiskLimitAlert        ║ Behavioral signals    ║ AI deep insights      ║
║  user    ║ Macro strip           ║ AI insights card      ║ Weekly review chip    ║
║  req)    ║ Session timer         ║ Friday/1st chip       ║                       ║
║          ║ R-Proxy banner        ║                       ║                       ║
╠══════════╬═══════════════════════╬═══════════════════════╬═══════════════════════╣
║ ALPHA    ║ Volatility cluster    ║ Correlation heatmap   ║ Monte Carlo equity    ║
║          ║   strip               ║   (asset × session)   ║   (1000 paths)        ║
║          ║ Order-flow imbalance  ║ R-ratio distribution  ║ Sortino / Calmar /    ║
║          ║   (inflow/outflow)    ║ Drawdown cluster map  ║   Omega ratios        ║
║          ║ Live R-meter (or $    ║ Setup expectancy      ║ Sector / asset        ║
║          ║   fallback if no R)   ║   matrix              ║   allocation drift    ║
║          ║ Instability index     ║ Time-of-day P&L       ║ Kelly fraction curve  ║
║          ║   (Oracle DNA live)   ║   surface             ║ MAE / MFE scatter     ║
║          ║ Claim-integrity tiles ║ MAE/MFE per setup     ║ Rolling Sharpe (20d)  ║
║          ║ Tier-1 macro window   ║ Streak topology       ║ Regime classifier     ║
║          ║ Raw telemetry strip   ║ Behavioral phase map  ║   (trend/chop/vol)    ║
║          ║ Risk envelope (4-tier ║ Tilt-event timeline   ║ Risk-of-ruin sim      ║
║          ║   live)               ║ Recovery half-life    ║ Backtest commit panel ║
║          ║                       ║ Tag-weighted R        ║ Macro-event impact    ║
║          ║                       ║   (15 widgets total)  ║   regression          ║
║          ║                       ║                       ║ Liquidity-map overlay ║
║          ║                       ║                       ║ Vol-surface heatmap   ║
╚══════════╩═══════════════════════╩═══════════════════════╩═══════════════════════╝
```

### 2.2 Rationale

- **Beginner** strips to ≤4 visible numbers per state. Goal: never overwhelm. Standard Beginner inherits the *current* Alpha widget set (per your request) — i.e. Beginner users get a richer baseline than today's stripped-down beginner view, but still curated.
- **Standard** is the curated power surface: enough to operate, decide, reflect, without the operator-grade noise.
- **Alpha** is additive — every Alpha widget is a *new* surface not present in Standard, never a duplicate with a different skin. Alpha Live focuses on real-time signal density (vol cluster, OFI, instability index). Alpha Review is the 15-widget "Powerhouse" with pattern-recognition surfaces that require ≥30 trades to be meaningful. Alpha Research is the quant lab: Monte Carlo, Sortino/Calmar/Omega, regime detection, risk-of-ruin.
- **R vs $ fallback** (Alpha Live): if the user's last 20 trades have ≥80% R-data coverage, render R-focused widgets; otherwise auto-switch to dollar-based equivalents. Decision lives in a `useExpectancyMode()` hook, not scattered across components.

### 2.3 Single Source of Truth

A new `src/lib/dashboard-matrix.ts` exports:

```ts
export const DASHBOARD_MATRIX: Record<OpMode, Record<DashState, WidgetId[]>>;
```

`renderDashboard()` in `Index.tsx` becomes a 20-line dispatcher that reads the matrix and renders the allowlist. Adding/moving a widget = one line edit.

---

## PHASE 3 — DEEP ANALYTICS REDESIGN (DECOUPLING)

### 3.1 The Redundancy Problem

Equity curve, drawdown chart, and expectancy distribution currently appear in `AdvancedAnalyticsPage`, `AnalyticsQuantLab`, `AdvancedPsychologyPage` (drawdown), and on the dashboard itself. Same data, same chart, four homes.

### 3.2 Chart Registry — One Home Per Chart

A central `src/lib/chart-registry.ts` assigns every chart a unique `chartId` and exactly one **canonical home** (mode × state). The matrix above enforces it.

```text
chartId                    canonical home              forbidden elsewhere
────────────────────────   ─────────────────────────   ───────────────────
equity_curve               Standard-Research/QuantLab  ✓
drawdown_underwater        Standard-Research/QuantLab  ✓
r_distribution             Standard-Research/QuantLab  ✓
correlation_heatmap        Alpha-Review                ✓
r_ratio_distribution       Alpha-Review                ✓
drawdown_cluster_map       Alpha-Review                ✓
monte_carlo_paths          Alpha-Research              ✓
sortino_calmar_omega       Alpha-Research              ✓
regime_classifier          Alpha-Research              ✓
mae_mfe_scatter            Alpha-Research              ✓
volatility_cluster_strip   Alpha-Live                  ✓
order_flow_imbalance       Alpha-Live                  ✓
instability_live           Alpha-Live                  ✓
behavioral_signals_strip   Standard-Review             ✓
fear_greed_gauge           DELETED (low-signal)        —
psychology_phase_map       Alpha-Review                ✓
recovery_half_life         Alpha-Review                ✓
```

A dev-mode lint script `scripts/check-chart-uniqueness.ts` walks the matrix and fails CI if any `chartId` appears in two cells.

### 3.3 Page Consolidation

- `PsychologyLab` → **deleted**; unique modules absorbed into `AdvancedPsychologyPage`.
- `AnalyticsQuantLab` + `AdvancedAnalyticsPage` → merged into a single `QuantLab` surface with tabbed views. QuantLab is the canonical home for portfolio-level metrics.
- `AdvancedRiskPage` → collapsed into an expandable section under `RiskLimitAlert`. The 4-tier alert is the always-on canonical risk surface.
- Result: 4 pages collapse to 2 (`QuantLab`, `AdvancedPsychologyPage`), plus the always-on `RiskLimitAlert`.

### 3.4 Fresh-Perspective Rule

Each analytics page must answer a question the others don't:
- **QuantLab** answers *"Is my edge real and stable?"*
- **AdvancedPsychologyPage** answers *"What's my behavioral failure mode?"*
- **RiskLimitAlert (expanded)** answers *"Am I about to blow my limits right now?"*
- **EconomicRadar** answers *"What macro event is about to move my book?"*

No chart may appear on more than one of these pages.

---

## PHASE 4 — PERFORMANCE & STABILITY AUDIT

### 4.1 Architectural Cleanup

- **Delete Screen Lock pop-up.** Remove `IdleTimeoutModal` from the app tree, drop the hook, remove the setting from `SettingsHub`, prune storage keys.
- **Decouple Data Engine from UI Renderer.**

  ```text
  ┌─────────────────────────────────────────────┐
  │ DATA ENGINE  (src/lib/dashboard-engine/)    │
  │  - useDashboardData()                       │
  │  - useExpectancyMode()                      │
  │  - selectors per chartId                    │
  │  - pure, no JSX, fully unit-testable        │
  └────────────────┬────────────────────────────┘
                   │  typed slices
  ┌────────────────▼────────────────────────────┐
  │ UI RENDERER  (src/components/dashboard/)    │
  │  - one component per chartId                │
  │  - props = pre-computed slice               │
  │  - zero data fetching inside components     │
  └─────────────────────────────────────────────┘
  ```

  Components stop calling `useTrades()` directly. The engine computes once per render cycle and distributes via context selector.

### 4.2 Migration Risk Assessment

| Risk                                          | Likelihood | Mitigation                                                         |
|-----------------------------------------------|------------|--------------------------------------------------------------------|
| Mode dispatcher regression (blank dashboards) | M          | Ship matrix behind a feature flag; visual-diff each cell           |
| Chart relocation breaks deep links            | L          | Maintain redirect map from old route hashes to new canonical homes |
| Memoization breaks live updates               | M          | Add reactivity tests for trade insert → P&L update path            |
| Mobile scroll fix breaks `/calibration`       | L          | Body-lock class scoped per-route via `useLayoutEffect`             |
| Screen-lock removal upsets users using it     | L          | Migration note in changelog; setting silently removed              |
| Audio removal breaks alert UX                 | L          | Visual pulse replaces audio; A/B observe via telemetry             |
| Backtest gate blocks tablet users mid-flow    | M          | Gate at `<lg` (1024px); show explainer not silent block            |
| Engine/renderer split touches every component | H          | Land in 3 sub-PRs: engine, registry, renderer migration            |

### 4.3 Mobile "Native Feel" Strategy

- **Touch:** all gesture handlers passive, single delegated root listener for pull-to-refresh, `touch-action: pan-y` on scroll zones, `manipulation` on tappables to kill the 300ms delay.
- **Render:** route-level code-split + per-mode lazy chunks; memoize hot paths; `content-visibility: auto` on off-screen panels; replace `min-h-screen` with `100dvh`.
- **Animation:** all motion ≤220ms with `transform`/`opacity` only — no layout-thrashing properties. Respect `prefers-reduced-motion`.
- **Scroll:** `overscroll-behavior: contain` on the dashboard scroll zone; no nested scrollers on mobile; momentum scroll via `-webkit-overflow-scrolling: touch`.
- **Paint:** promote the bottom nav and header to their own composite layers; remove backdrop-blur on `<md` (GPU-expensive on mobile).
- **Boot:** defer Recharts, framer-motion, and the AI coach chunk past first paint; show the terminal frame in < 400ms with skeleton hairlines.

### 4.4 Rollout Order

1. **Phase 1 first** — quick wins, user-visible the same day, no schema or data changes.
2. **Phase 3 next** — chart registry + page consolidation (deletes are reversible by git, no migration needed).
3. **Phase 2 third** — matrix dispatcher (depends on registry being in place).
4. **Phase 4 last** — engine/renderer split lands once the matrix is stable, since the split rides on top of it.

Each phase is independently shippable. No phase blocks the next on the user side.

---

## DECISION POINTS BEFORE WE EXECUTE

1. Confirm Backtest is gated at `<lg` (1024px), not `<md` (768px).
2. Confirm Fear & Greed gauge is deleted everywhere (not just hidden).
3. Confirm Screen Lock removal is hard-delete (no setting kept for return).
4. Confirm Beginner-Research stays locked (upsell card) rather than minimal-research view.
5. Confirm audio is fully disabled across the radar/alert subsystem, or only on mobile.

Reply with `approve phase 1`, `approve all phases`, or call out changes per decision point.
