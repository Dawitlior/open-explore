
# Dashboard Rebuild — Mobile-First, PWA-Ready

## Why it's broken today

`src/pages/Index.tsx` is 2,165 lines. The `renderDashboard()` function alone spans ~1,400 lines and contains 3 separate modes (Beginner / Live / Standard) all written with:

- **Inline styles everywhere** — `style={{ display: 'flex', minWidth: isMobile ? 0 : 380 }}` repeated dozens of times
- **`isMobile` ternaries** instead of CSS breakpoints — JS-driven layout, no fluid behavior between 360px and 768px
- **Hard-coded `minWidth` on chart cards** (260/280/300/380) — even with `isMobile ? 0`, flex containers still overflow because Recharts' `ResponsiveContainer` needs an explicit parent width
- **No CSS Grid** — everything is `flex-wrap`, which doesn't give equal columns and breaks unpredictably
- **Chart fonts/heights not scaled** for narrow screens (10px axis ticks on a 360px screen = unreadable)
- **No safe-area / viewport-fit handling** for PWA notch & home-indicator
- **No container queries** — components don't know their own width, only the window's

Patching this incrementally is what's been wasting your money. Rebuild is the right call.

## What we keep, what we rebuild

**Keep (no changes):**
- All data hooks (`useTrades`, `useStats`, `useRiskData`, `useSettings`)
- All business logic (calculations, R-multiples, gating)
- The 3 operating modes (Beginner / Standard / Live) — same content, new layout
- `MetricCard` / `ScoreGauge` / `GlassCard` components (already responsive)
- Other pages (Journal, Calendar, Analytics, Risk, etc.) — **untouched**

**Rebuild:**
- The `renderDashboard()` function only
- Layout system: mobile-first CSS Grid + container queries
- Chart responsiveness layer

## Architecture

Extract the dashboard into a dedicated module so `Index.tsx` shrinks back to a router shell:

```text
src/components/dashboard/
  DashboardPage.tsx           — entry, picks mode, ~80 lines
  modes/
    BeginnerDashboard.tsx     — ~120 lines
    StandardDashboard.tsx     — ~250 lines (current default)
    LiveDashboard.tsx         — ~150 lines
  layout/
    DashboardGrid.tsx         — Responsive CSS Grid wrapper
    KpiRow.tsx                — Mobile-first KPI grid (2 cols → 4 cols)
    SystemHealthRow.tsx       — Same pattern for gauges
    ChartCard.tsx             — Replaces ChartWrapper usage on dashboard
  charts/
    EquityChart.tsx           — Self-contained, responsive
    PnlDistributionChart.tsx
    RadarBreakdownChart.tsx
    MonthlyPerformanceChart.tsx
  dashboard.css               — Single stylesheet, all breakpoints
```

`src/pages/Index.tsx` will just call `<DashboardPage />` (one line replacing 1,400).

## Responsive system

Three breakpoints, mobile-first, **CSS only — no `isMobile` JS branching for layout**:

```text
< 480px   — phone portrait  → 1 col KPIs stack, charts 200px tall, font 14/10
480-768   — phone landscape / small tablet → 2 col KPIs, charts 240px
768-1024  — tablet → 2-3 col, charts 280px
> 1024    — desktop → current 4-col layout
```

Layout uses CSS Grid + `clamp()` for fluid sizing:
```css
.dash-kpi-grid { grid-template-columns: repeat(auto-fit, minmax(min(140px, 100%), 1fr)); }
.dash-chart   { height: clamp(180px, 38vw, 320px); }
```

Container queries on `ChartCard` so a card knows its own width and hides legends / axis labels when narrow — no window-listener gymnastics.

## PWA hardening

- Add `viewport-fit=cover` + `env(safe-area-inset-*)` padding on the dashboard root
- Touch targets ≥ 44×44 (current "i" buttons are 12px — keep them small for info, but bump primary CTAs)
- Charts: replace `ResponsiveContainer` width=100% pattern with explicit `width="100%" height="100%"` inside an `aspect-ratio` parent — fixes the Safari iOS shrink bug
- Horizontal scroll prevention: `overflow-x: hidden` on dashboard root + `min-width: 0` on every grid child
- Test under standalone PWA mode (display-mode: standalone) — fix any header overlap with status bar

## Build order (single session, no follow-ups)

1. **Scaffold** `src/components/dashboard/` + `dashboard.css` with breakpoint tokens
2. **Layout primitives** — `DashboardGrid`, `KpiRow`, `SystemHealthRow`, `ChartCard`
3. **Extract charts** — move the 4 main charts into self-contained components
4. **Build `StandardDashboard`** first (it's the default, most used)
5. **Build `BeginnerDashboard`** + **`LiveDashboard`**
6. **Replace** `renderDashboard()` call in `Index.tsx` with `<DashboardPage />`
7. **Delete** the old 1,400 lines from `Index.tsx`
8. **QA pass** at 360 / 414 / 768 / 1024 widths using preview viewport tool — screenshot each, verify zero horizontal scroll, readable chart axes, gauges fit

## What you'll see when done

- Dashboard renders cleanly from 320px up — no overflow, no clipped charts
- Adding a future card means writing one component, not editing a 2,000-line file
- Works as installed PWA on iOS/Android with proper safe-area handling
- All other pages untouched, all data/calculations unchanged

## Risks / scope guardrails

- **No business logic changes** — pure presentation rebuild
- **No backend changes** — no migrations, no new tables
- **Behind a feature flag** for one commit (`USE_NEW_DASHBOARD=true`) so we can A/B against the old version if something looks off; flag deleted after verification
- Estimated 1 build cycle (no back-and-forth needed if the plan is approved as-is)

## Approve to build?

If yes, I start with step 1 immediately and ship straight through to step 8 in one pass.
