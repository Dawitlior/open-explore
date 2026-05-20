
# Master Plan — TradingView ⇄ Backtest Journal Bridge

This is a **bridge**, not a new system. Your existing engine stays the source of truth:

- **Store:** `scopedStorage` key `orca-bt-v13` (see `BacktestDimension.tsx`)
- **Row schema:** `{id, coin, entryDT, exitDT, entry, sl, exit, mfeP, maeP, notes, chartE, chartX, dir, r, mfeR, maeR, dur}`
- **Engine:** `recalc()` derives `dir`, `r`, `mfeR`, `maeR`, `dur` automatically once price + time fields exist
- **UI host:** `BacktestDimension` (reached via the Backtest Portal in the sidebar)

Everything below plugs *into* that — no parallel journal, no Supabase migration, no schema change.

---

## 1. High-Level Roadmap (architecture first)

```text
 ┌──────────────────────────────────────────────────────────┐
 │              BACKTEST WORKSPACE  (single page)           │
 │                                                          │
 │  ┌───────────────────────┐   ┌───────────────────────┐   │
 │  │  TradingView Widget   │   │  Backtest Journal     │   │
 │  │  (Advanced Chart)     │   │  (existing table)     │   │
 │  │                       │   │                       │   │
 │  │  Long/Short tool ─┐   │   │  rows = orca-bt-v13   │   │
 │  └───────────────────┼───┘   └───────────▲───────────┘   │
 │                      │                   │               │
 │           drawing_event_*                │ append/update │
 │                      ▼                   │               │
 │            ┌──────────────────┐          │               │
 │            │  TV-Bridge Hook  │──draft──►│               │
 │            │  (useTvCapture)  │          │               │
 │            └────────┬─────────┘          │               │
 │                     │                    │               │
 │                     ▼                    │               │
 │            ┌──────────────────┐          │               │
 │            │  Commit Modal    │──Save────┘               │
 │            │  (one click)     │                          │
 │            └──────────────────┘                          │
 │                                                          │
 │  Tabs:  [ Chart+Capture ]  [ Journal ]   (state shared)  │
 └──────────────────────────────────────────────────────────┘
```

Five layers, each isolated and replaceable:

| Layer | File | Job |
|---|---|---|
| Widget host | `BacktestChartPanel.tsx` (new) | Mounts TradingView Advanced Chart, exposes the `widget` ref |
| Capture hook | `useTvCapture.ts` (new) | Subscribes to drawing events, builds a `DraftBacktestTrade` |
| Draft store | `backtest-draft-store.ts` (new) | Tiny zustand/atom — holds the pending draft + open/close modal |
| Commit modal | `CommitBacktestModal.tsx` (new) | One-click approval; on Save → `recalc()` + push into `orca-bt-v13` |
| Workspace shell | edit `BacktestDimension.tsx` | Two-tab layout (Chart / Journal), shared state, no remount |

No Supabase work. No new tables. The journal already persists via `scopedStorage`.

---

## 2. Backtest-to-Chart Hook (how we extract a closed position)

TradingView's Advanced Charting Library exposes a drawing-event API on the widget instance:

```ts
widget.onChartReady(() => {
  const chart = widget.activeChart();
  chart.onDataLoaded().subscribe(null, () => {/* ready */});

  // Fires for every drawing add / move / remove
  chart.subscribe('drawing_event', (lineId, eventType) => {
    if (eventType !== 'create' && eventType !== 'properties_changed' &&
        eventType !== 'points_changed' && eventType !== 'remove') return;

    const shape = chart.getShapeById(lineId);
    const name  = shape.getProperties()?.name; // 'LineToolRiskRewardLong' | 'LineToolRiskRewardShort'
    if (!name?.startsWith('LineToolRiskReward')) return;

    const pts = shape.getPoints(); // [entry, target, stop] — TV's R/R tool
    draftStore.upsert(lineToolToDraft(name, pts, chart.symbol(), chart.resolution()));
  });
});
```

The **Long Position / Short Position tool** (TV's native R/R tool) already encodes everything we need:

| TV point | Maps to backtest field |
|---|---|
| `points[0]` price + time | `entry`, `entryDT` |
| `points[1]` price + time | `exit` (TP target — moved on close) |
| `points[2]` price | `sl` |
| Tool variant | `dir` (Long/Short) — also derivable from `entry` vs `sl` |
| Active symbol | `coin` |
| Chart screenshot | `chartE` via `widget.takeClientScreenshot()` |

**"Closed" detection** (two complementary signals — we accept either):
1. **Manual close:** user drags the target/exit endpoint onto a new bar → `points_changed` fires with `points[1].time > now-ish` → draft is marked `ready_to_commit` and the Commit Modal opens.
2. **TP/SL touch:** lightweight tick-watcher inside the hook compares the latest bar high/low to `sl` / `exit`; the first cross flips the draft to `ready_to_commit` with `exitDT = bar.time` and `exit = sl|tp`.

Removing the drawing = "discard draft" (modal closes silently).

---

## 3. Injection Logic (zero manual steps)

```text
TV drawing event
   → useTvCapture builds DraftBacktestTrade
   → draftStore.upsert(draft)               // in-memory, throttled
   → CommitBacktestModal listens, opens when status='ready_to_commit'
   → user clicks Save
   → recalc(draft) (existing engine — auto fills dir, r, mfeR, maeR, dur)
   → setRows(prev => [...prev, draft])     // existing Backtest state
   → persist(rows)                          // scopedStorage 'orca-bt-v13'
   → draftStore.clear()
```

No edge function, no Supabase call, no new table. We reuse the **exact** path that the manual "Add row" button already uses — we just pre-fill it from TV. That guarantees stats, MAE/MFE histograms, equity curve, day/week/month matrices all update instantly because they're already memoized off `rows`.

---

## 4. The "Superman" Commit Modal (one click)

A single `<Dialog>` over the chart. Pre-filled, editable, keyboard-driven:

```text
┌─ Commit Backtest Trade ─────────────────────── ⎋ ┐
│  BTCUSDT · 15m · LONG                            │
│                                                  │
│  Entry  64,250        Exit  65,700               │
│  SL     63,800        Time  15/03 09:30→16:45    │
│  MFE    66,100        MAE   63,900               │
│                                                  │
│  R = +3.22   Dur = 7h 15m                        │
│                                                  │
│  Notes ___________________________________       │
│  ☐ Open snapshot in journal after save           │
│                                                  │
│         [ Discard ]      [ Save  ↵ ]             │
└──────────────────────────────────────────────────┘
```

- Opens automatically when `status='ready_to_commit'` (or via floating "Commit (1)" badge if user is mid-drawing).
- Enter = Save, Esc = Discard. Save shows a 600 ms toast `+3.22R saved` and **does not navigate away**.
- MFE/MAE fields are optional — if blank, the hook samples the bar range between entryDT and exitDT and fills them automatically.

---

## 5. Backtest Continuity (chart stays alive)

Three rules enforce "Superman mode":

1. **Single mount.** The TradingView widget is mounted **once** at workspace entry and lives inside `BacktestChartPanel`. The Journal tab is rendered as a sibling with `display:none` toggling — *not* unmounted — so chart state, drawings, zoom, and replay position survive tab switches.
2. **Modal, never route.** Save closes the modal in place; nothing navigates. The chart keeps the user's last drawing visible (faded) for 2s as a "saved" confirmation, then cleans it.
3. **Symbol sync.** When the user changes symbol on TV, we set the draft default `coin`. When they create a *new* R/R drawing without committing the previous one, the older draft is discarded with a toast `Previous draft discarded`.

---

## 6. Zero-Dead-End Navigation

Two entry points, both preserve state:

- **Inside the Backtest Workspace:** a segmented control `[ Chart ] [ Journal ]` at the top. Switching is CSS-only (the widget stays mounted). State for `rows`, `selection`, scroll position, and the TV widget are all held in `BacktestDimension`'s top-level state — no remount.
- **From elsewhere in the app:** the existing `BacktestPortalButton` already routes to the workspace. We add a return shortcut from `JournalDimension` ("Open in Backtest Chart") so any historic backtest row jumps back to the chart with that row's `coin` + `entryDT` loaded into TV via `widget.setSymbol()` and `widget.activeChart().setVisibleRange()`.

Keyboard:
- `g c` → Chart tab
- `g j` → Journal tab
- `⌘/Ctrl + Enter` → commit current draft

---

## 7. File-Level Plan

**New:**
- `src/components/trading/backtest/BacktestChartPanel.tsx` — TV widget host
- `src/components/trading/backtest/CommitBacktestModal.tsx` — the one-click modal
- `src/components/trading/backtest/useTvCapture.ts` — drawing-event subscription + draft builder
- `src/components/trading/backtest/backtest-draft-store.ts` — tiny zustand store (draft + open state)
- `src/components/trading/backtest/tv-mapping.ts` — `lineToolToDraft()` + symbol/time helpers

**Edited:**
- `src/components/trading/BacktestDimension.tsx` — add `[Chart | Journal]` tabs, mount `BacktestChartPanel`, expose `appendRow(draft)` to the modal. **No engine change.** `recalc()`, `computeAll()`, `persist()` all reused as-is.

**Not touched:** Supabase schema, broker adapters, journal storage, calendar, risk engine.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| TradingView script not loaded (network blocked) | Lazy load via `<script>` injection with retry + "Open in TV.com" fallback CTA |
| `drawing_event` API changes between TV versions | Pin a specific `charting_library` version; mapping isolated in `tv-mapping.ts` |
| Drawings fire bursts of events on drag | `requestAnimationFrame`-throttle inside `useTvCapture` |
| User commits the same draft twice | Draft has a `lineId`; on Save we clear it from the store before persisting |
| Symbol mismatch (e.g. perp vs spot) | Normalize symbol in `tv-mapping.ts` (`BINANCE:BTCUSDT.P` → `BTCUSDT`) |

---

## 9. What I'm explicitly **not** doing

- Not creating a new journal, table, route, or Supabase migration.
- Not changing `BacktestDimension`'s engine, stats, or storage key.
- Not adding live-trading wiring — this stays scoped to backtest.
- Not replacing TradingView with a custom chart.

---

## 10. Build Order (when you approve)

1. `backtest-draft-store.ts` + `tv-mapping.ts` (pure logic, unit-testable)
2. `BacktestChartPanel.tsx` (TV widget mount only, no events yet)
3. `useTvCapture.ts` (wire the drawing events → draft)
4. `CommitBacktestModal.tsx` (UI + Save → `appendRow`)
5. Tab integration in `BacktestDimension.tsx` (zero-dead-end nav)
6. Polish: keyboard shortcuts, snapshot capture, "Open in chart" from Journal rows

Reply **"Proceed"** and I'll start at step 1.
