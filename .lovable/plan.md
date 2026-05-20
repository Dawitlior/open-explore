# Economic Radar & Calendar — Master Plan (Task 13)

A native, terminal-grade macro radar built into Orca. No iframe embeds, no third-party widgets, no polling loops. The architecture mirrors the patterns we already use for `trades` and `live_risk_locks`: edge-function ingestion → cached Supabase table → per-user RLS reads → reactive UI.

---

## Pillar 1 — Data Pipeline (Data Architecture)

### Source selection

| Tier | Provider | Why | Cost |
|---|---|---|---|
| **Primary** | **TradingEconomics API** | Industry standard for macro calendars; covers CPI/NFP/FOMC/ECB/BOE/BOJ/PMI; provides `actual`/`forecast`/`previous` + impact rating | Free tier = 500 reqs/day, paid from ~$75/mo |
| **Fallback** | **Finnhub `/calendar/economic`** | Solid free tier (60 req/min), good country coverage | Free |
| **Crypto-specific** | **CoinMarketCal** (optional Phase 2) | Halvings, token unlocks, ETF decisions | Free w/ key |
| **Official cross-check** | BLS/BEA/Fed RSS for US releases | Authoritative timestamps if a provider drifts | Free |

We start with **TradingEconomics + Finnhub fallback**. One adapter interface, identical to `src/lib/brokers/_csv-factory.ts` pattern, so swapping is trivial.

### Fetch & cache architecture (zero terminal impact)

```text
[pg_cron every 30min] → [edge: sync-economic-events] → [table: economic_events]
                                    │
                                    ↓
                         [Supabase Realtime channel]
                                    │
                                    ↓
            [useEconomicEvents() hook] ← reads cached rows, never hits provider
```

- **Edge function `sync-economic-events`**: pulls next 14 days, upserts on `(provider, external_id)`. Cron via `pg_cron` (already documented pattern in this project).
- **Edge function `refresh-event-actuals`**: lighter cron every 5 min during active session windows (13:00–23:00 IST) to fetch `actual` values for events whose `release_at` just passed.
- **Client**: only reads `economic_events` via RLS — **zero direct provider calls from the browser**, zero API keys exposed, zero rate-limit risk.
- **Realtime subscription** on `economic_events` so the Radar updates the instant the edge function writes a new row or an `actual` value lands.

### Time-zone normalization (Israel UTC+2/+3)

Single rule, enforced at the boundary:

1. **Storage**: `release_at timestamptz` — always UTC. Provider strings (e.g. `"2026-05-21 12:30:00 GMT"`) are parsed into UTC at ingestion in the edge function, never in the browser.
2. **Display**: a single helper `formatIsraelTime(release_at)` using `Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem' })`. DST is handled by the IANA database automatically — no manual `+2`/`+3` math, ever.
3. **Bilingual**: Hebrew = `21/05/2026 15:30`, English = `May 21, 2026 15:30 IDT`. Re-uses our existing i18n module.
4. **Cross-check**: a tiny unit test asserts that an NFP release at `13:30 UTC` renders as `16:30` in July (IDT) and `15:30` in January (IST).

---

## Pillar 2 — The Proactive Radar (Live Engine)

### "Watching" without polling

The browser does **not** poll the provider, and barely polls the DB. Two layers:

1. **Realtime channel** on `economic_events` — pushes inserts/updates instantly.
2. **In-memory countdown scheduler** (`useEconomicRadar` hook):
   - On mount, loads next 24h of events into memory.
   - For each event, schedules a single `setTimeout` at `release_at − 5min`, `−1min`, and `+0`.
   - Re-computed on tab focus and on realtime updates. No `setInterval` polling.
   - Survives tab sleep via `visibilitychange` recompute.

This is identical in spirit to how `IdleTimeoutModal` and `use-deployment-watcher` already work — proven patterns.

### Event categorization (Tier system)

Stored as `impact` enum on the row, normalized at ingestion:

| Tier | Examples | UI treatment |
|---|---|---|
| **T1 — Critical** | FOMC, NFP, CPI, ECB rate, BOE rate, GDP | Red pulse, sound (uses APEX OS sound engine), banner pops |
| **T2 — Material** | PPI, Retail Sales, PMI, Unemployment Claims, Powell speeches | Amber, banner pops but no sound |
| **T3 — Background** | Building permits, minor surveys | Calendar only, no alert |

Mapping table lives in `src/lib/economic/tier-map.ts` — pure data, easy to tune without redeploy.

### Alert Banner UI logic

- **Single global mount** in `App.tsx` (above `DimensionController`) so it appears on every workspace — calendar, journal, backtest, dashboard.
- **Slide-in from top-right**, fixed position, max-width 380px, 80px tall. Uses our existing `GlassCard` + cyan/red accent tokens. Never covers chart canvas.
- **States**: `T-5min` (amber, "NFP in 5 min · 16:30"), `T-1min` (red pulse + APEX sound), `Live` (red, shows `actual` vs `forecast` the moment it lands).
- **Non-intrusive**: dismissible, auto-dismisses 90s after release, respects Privacy Mode (no values shown when masked), respects Beginner Mode (T1 only).
- **Stacking**: max 2 banners; further events go to a small "+3 more" pill that opens the calendar.

---

## Pillar 3 — Economic Calendar Page (UI/UX Hub)

New page `EconomicCalendarPage.tsx`, registered as a Dimension in `DimensionController` (same pattern as `BacktestDimension`, `CalendarHubPage`).

### Data-dense, no-clutter table

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ECONOMIC RADAR                          [Today][Week][Month]  [⚙ Filters]      │
├──────────────────────────────────────────────────────────────────────────────────┤
│  TIME (IST) │ IMPACT │ CCY │ EVENT              │ ACTUAL  │ FORECAST │ PREVIOUS │
│  ─────────  │ ────── │ ─── │ ───────────────── │ ─────── │ ──────── │ ──────── │
│  15:30  ●●● │ ▮▮▮    │ USD │ Core CPI m/m       │  0.3%   │   0.2%   │   0.2%   │
│  16:00  ●●  │ ▮▮     │ EUR │ Consumer Confidence│   —     │  -14.2   │  -14.7   │
│  21:00  ●●● │ ▮▮▮    │ USD │ FOMC Rate Decision │   —     │  5.25%   │  5.25%   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- Grouped by day with sticky day headers; current day highlighted cyan.
- Row click expands inline: description, historical chart of last 8 prints (small sparkline), "Trade Setup" notes field (saved per user).
- Past events fade to 60% opacity; surprise (`actual` ≠ `forecast`) flashes green/red briefly when it lands.
- JetBrains Mono for numbers, Poppins for labels — matches our terminal aesthetic.

### Filtering

Top-bar segmented controls + a slide-out filter drawer:
- **Range**: Today / This Week / This Month / Custom.
- **Impact**: T1 / T2 / T3 toggles (default: T1+T2).
- **Currencies**: USD / EUR / GBP / JPY / CNY / ILS multi-select chips.
- **Categories**: Inflation / Rates / Employment / GDP / Sentiment.
- **Search**: free-text against event name.
- All filters persisted to `user_settings` under key `economic_filters` so each terminal session restores instantly.

### Visual language

Uses existing tokens only — `T.bg.card`, `T.border.subtle`, `T.accent.cyan/red/green/orange`. No new colors. Sharp 1px borders, 8px radius, generous `letter-spacing: 0.08em` on uppercase headers. Same DNA as `CalendarHubPage`.

---

## Pillar 4 — Mobile-First & Responsiveness

Following the `useIsMobile()` + dual-render pattern already used in `CalendarHubPage`:

- **Table → Card stack** on `<768px`. Each event = a 72px tall card: left edge color-coded impact bar, top row = time + currency chip, bottom row = event name + actual/forecast inline.
- **Thumb zone**: filter button and "Jump to now" FAB pinned bottom-right, 56×56, within thumb reach.
- **Horizontal day-strip** at top (iOS-calendar style) for fast day jumping — same component family as the mobile calendar.
- **Alert banner on mobile**: full-width, slides down from top, 64px tall, safe-area aware (`env(safe-area-inset-top)`), auto-dismisses faster (45s) to not block vertical scroll.
- **Sound respects mobile silent mode** via the existing APEX sound engine gating.
- **Bilingual RTL**: layout mirrors automatically — already handled by our `isRTL` pattern.

---

## Pillar 5 — Master Roadmap

### Step A — Data pipeline & logic (foundation, no UI)
1. Migration: `economic_events` table (`id`, `provider`, `external_id`, `release_at timestamptz`, `currency`, `country`, `event_name`, `category`, `impact` (`t1`|`t2`|`t3`), `actual`, `forecast`, `previous`, `unit`, `description`, `updated_at`). RLS = readable by any authenticated user (it's public data); writes restricted to service role.
2. Add `TRADINGECONOMICS_API_KEY` + `FINNHUB_API_KEY` secrets.
3. Edge function `sync-economic-events` (cron every 30 min, 14-day horizon).
4. Edge function `refresh-event-actuals` (cron every 5 min in active window).
5. `src/lib/economic/` module: types, tier-map, IST formatter, surprise calculator. Unit tests for DST edge cases.

### Step B — The Radar (alerts & monitoring)
1. `useEconomicEvents()` — Supabase Realtime-subscribed hook.
2. `useEconomicRadar()` — countdown scheduler (setTimeout-based, visibility-aware).
3. `EconomicAlertBanner` component, mounted once in `App.tsx`.
4. Wire APEX sound engine for T1 release moments.
5. Privacy Mode + Beginner Mode gating.

### Step C — The Calendar Page (visual UI)
1. `EconomicCalendarPage.tsx` desktop table with sticky day headers, expandable rows, sparklines.
2. Filter drawer + `user_settings` persistence.
3. Mobile card-stack rendering behind `useIsMobile()`.
4. Register as a Dimension in `DimensionController`; add to command palette + nav.

### Step D — Integration & Polish
1. Cross-link from Calendar Hub day cells: badge showing how many T1 events that day.
2. Cross-link from Trade Entry: warning chip if a T1 event is < 30 min away.
3. Weekly Review: AI synthesis includes "macro events that hit during your trading hours."
4. Onboarding step: pick currencies + tiers of interest.
5. Telemetry: log banner dismissals to tune signal-to-noise.
6. Bilingual QA (he/en), RTL audit, accessibility pass (aria-live for banner), Lighthouse perf check.

### Performance budget (non-negotiable)
- Zero provider calls from browser.
- ≤1 Realtime channel for events.
- Calendar page initial query ≤50KB (14-day window, projected columns).
- Radar scheduler ≤3 active timers at any time.
- No new dependencies beyond what we already ship.

---

Reply **"Proceed Step A"** when you want me to start with the migration + edge functions, or tell me which pillar you want to adjust first.