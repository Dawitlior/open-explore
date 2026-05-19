
# Money-Mode Bybit Live-Pipe — Premium Refactor

Re-architects the Bybit live integration into a globally-mounted, Money-Mode-only data service with a premium glassmorphic UI, incremental sync, and zero R-residue.

---

## 1. Data Sanitation Layer

**New file:** `src/lib/bybit-sanitize.ts`

- Export `sanitizeLiveBybitData(raw)` — strips `stopLoss`, `liqPrice`, `takeProfit`, any `r*` field; returns a strict `LiveMoneyPosition`:
  ```ts
  { symbol, side, size, entryPrice, markPrice, unrealizedPnl, leverage, positionIdx, updatedAt }
  ```
- Export type `LiveMoneyPosition`. No SL field on the type — compile-time guarantee that R cannot leak.
- Export `sanitizeClosedPnlRow(raw)` for REST `/v5/position/closed-pnl` rows used by incremental sync.

---

## 2. Global WebSocket Provider

**New file:** `src/providers/BybitLiveProvider.tsx`

- React Context provider mounted **once** in `src/App.tsx` (inside `RequireAuth`) so the WS runs for every authenticated user regardless of mode.
- Internally re-uses the connection lifecycle currently in `use-live-positions.ts`:
  - Bybit V5 private WS, HMAC-SHA256 auth, `position` topic.
  - Heartbeat ping (20 s), exp backoff (cap 30 s), max-attempts kill-switch on `auth_failed` (new — prevents the infinite retry the audit flagged).
  - Frame staleness watchdog (60 s) → exposes `isStale` flag.
- **New subscription:** also subscribes to the `execution` topic. When `execType === 'Trade'` and `closedSize > 0` for the full position, fires the incremental-sync trigger (see §3). Pure side-channel — never touches position state.
- All inbound `position` frames pass through `sanitizeLiveBybitData` **before** entering React state. `live_risk_locks` upsert (SL snapshot) stays inside the provider but is invisible to consumers.
- Context value:
  ```ts
  { positions: LiveMoneyPosition[], status, lastError, lastFrameAt, isStale, hasCreds }
  ```
- **New hook:** `useBybitLive()` — thin selector around the context. Replaces `useLivePositions` call sites.
- **Delete:** `src/hooks/use-live-positions.ts` (logic absorbed into provider).

---

## 3. Incremental Sync ("Invisible Pipeline")

**Edge function:** `supabase/functions/sync-futures-trades/index.ts`

- Add a new mode: `{ mode: 'incremental', symbol, since }` (defaults retain current bulk behaviour for back-compat with the manual button).
- Incremental path:
  1. Fetch `/v5/position/closed-pnl?symbol=X&startTime=since` (single window, ≤ 5 rows expected).
  2. For each row, `upsert` into `trades` keyed by `exchange_exec_id` (column already exists) — **never wipes**.
  3. Returns `{ added: n, rows: [...] }`.
- Existing manual "Sync 180d" path stays but is no longer the primary feed.

**New client helper:** `src/lib/incremental-sync.ts`

- `triggerIncrementalSync(symbol, sinceMs)` — `supabase.functions.invoke('sync-futures-trades', { body: { mode:'incremental', symbol, since } })`.
- On success: dispatch `orca:trades-synced` (existing listener in `use-trades.ts` auto-refreshes) **and** show premium toast (see §4).
- Debounced per symbol (3 s) to coalesce partial-fill bursts.

**Wired in `BybitLiveProvider`:** on `execution` close event → `triggerIncrementalSync(symbol, executionFrame.execTime - 5000)`.

---

## 4. Premium Glassmorphic UI

**New components** (folder `src/components/live/`):

- `LiveDeckBento.tsx` — top-level Bento grid (uses `OrcaBento` + `OrcaCard`). Replaces the chart-heavy guts of `AlphaLiveConsole`. Layout:

  ```text
  ┌────────────────────┬──────────────┐
  │ ConnectionPulse    │ TotalPnLCard │   row 1 (status + aggregate)
  ├────────────────────┴──────────────┤
  │ PositionsGrid (LivePositionCard×N)│   row 2 (dense bento of positions)
  └───────────────────────────────────┘
  ```

- `ConnectionPulse.tsx` — glass card showing WS status with an animated cyan pulse dot; degrades to amber when `isStale`, ruby on `error`. Uses `OrcaMetric` for "Last frame" / "Symbols tracked".

- `LivePositionCard.tsx` — single position tile, `OrcaCard span={4}`:
  - Header: symbol + side chip (emerald/ruby).
  - Body: `OrcaMetric` rows for Mark, Entry, Size, Leverage, Unrealized PnL.
  - **Flash animation on PnL change:** `useFlashOnChange(pnl)` hook diffs prev vs next; applies a `framer-motion` background flash (`bg-emerald-500/15` up, `bg-ruby-500/15` down) over 600 ms. No layout shift.
  - Tabular-nums mono throughout (already in `OrcaMetric`).
  - Strictly Money-Mode — no SL row, no R column, no risk badge.

- `useFlashOnChange.ts` — tiny hook returning a key that bumps when value changes; consumed by `AnimatePresence` overlay inside the card.

**New file:** `src/components/live/PremiumSyncToast.tsx`

- Custom sonner `toast.custom()` renderer. Glass panel + grain, cyan accent bar, "Trade Synced → Journal" title, symbol + PnL line, auto-dismiss 4 s. Triggered by `triggerIncrementalSync` success.

---

## 5. Refactor Call Sites

- **`src/App.tsx`** — wrap routes in `<BybitLiveProvider>` inside `RequireAuth`.
- **`src/pages/Index.tsx`** — replace `<AlphaLiveConsole T isRTL enabled={isAlpha} />` with `<LiveDeckBento T isRTL />`. Render unconditionally (no `enabled={isAlpha}` gate) so all users see the live deck when creds are configured. `ConnectionPulse` handles the `no_creds` empty state gracefully (CTA → `/settings#exchanges`).
- **`src/components/trading/AlphaLiveConsole.tsx`** — delete (or shrink to a thin re-export of `LiveDeckBento` to avoid breaking any stale import).
- **`src/components/trading/ExchangesPanel.tsx`** — manual "Sync 180d" button keeps working (passes `mode:'bulk'` explicitly).

---

## 6. Constraints Honoured

- ✅ `Trade` table schema untouched (upsert uses existing `exchange_exec_id`).
- ✅ Zero R-Multiple math on live data — sanitizer strips SL at the boundary, type system prevents reintroduction.
- ✅ All UI uses `OrcaCard` / `OrcaBento` / `OrcaMetric` design tokens — no raw shadcn cards, no browser `alert()`.
- ✅ Premium toast via sonner `toast.custom` (already wired globally).

---

## Technical Notes

- WS auth backoff: track `consecutiveAuthFailures`; after 2, stop reconnect and surface `lastError = 'auth_invalid'` so `ConnectionPulse` can CTA the user to rotate keys.
- Provider cleanup wipes the in-memory `apiSecret` (preserved from current implementation).
- `live_risk_locks` writes remain server-side state for future R-recovery — UI never reads them in Money-Mode.
- `useFlashOnChange` keyed by `${symbol}:${pnl.toFixed(2)}` to avoid sub-cent jitter triggering animations.

---

## Files Touched

**New (8):**
`src/lib/bybit-sanitize.ts`, `src/lib/incremental-sync.ts`, `src/providers/BybitLiveProvider.tsx`, `src/components/live/LiveDeckBento.tsx`, `src/components/live/ConnectionPulse.tsx`, `src/components/live/LivePositionCard.tsx`, `src/components/live/useFlashOnChange.ts`, `src/components/live/PremiumSyncToast.tsx`

**Edited (3):** `src/App.tsx`, `src/pages/Index.tsx`, `supabase/functions/sync-futures-trades/index.ts`

**Deleted (1):** `src/hooks/use-live-positions.ts` (logic moved into provider)

**Shrunk (1):** `src/components/trading/AlphaLiveConsole.tsx` → re-export shim
