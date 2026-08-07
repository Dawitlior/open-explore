# Trade Chart Vision — TradingView inside the ORCA trade dossier

Goal: when you open a trade card in the ORCA journal, you also see the trade **on a chart** — entry, stop, exit, and the price action around them — for any ticker in the world, without slowing the platform down.

## What is actually possible (and what is not)

- The free TradingView **Advanced Chart widget** is free forever, supports essentially every ticker (crypto, stocks, forex, futures, indices), and themes to dark/light. Cost: $0.
- Limitation to be honest about: the free embedded widget is a sandboxed iframe. **We cannot programmatically draw your entry/stop/exit lines on it.** Only the paid/approved Charting Library allows that.
- Therefore the strongest product is a **two-layer chart experience**:
  1. **Trade Replay** (default tab) — our own chart, drawn with `lightweight-charts` (TradingView's free open-source library, ~45 KB). We feed it candles and draw exact Entry / Stop / Exit price lines, the trade window shading, and win/loss markers. Fully themed with ORCA tokens, works in every theme, RTL-safe.
  2. **Live TradingView** (second tab) — the full free Advanced Chart widget for that symbol, for deep analysis, indicators, any timeframe, any market on earth.

So: precision + branding from layer 1, universality + power from layer 2.

## Phases

### Phase 1 — Symbol resolution engine
A small module that turns a stored `coin` ("SOL", "AAPL", "EUR/USD", "NQ") into:
- a TradingView symbol (`BINANCE:SOLUSDT`, `NASDAQ:AAPL`, `FX:EURUSD`, `CME_MINI:NQ1!`)
- a candle-provider symbol for layer 1 (crypto only at first)
Rules: reuse the existing asset-category detection from the trade form, plus a small alias map for the common cases, plus a **manual override** per symbol saved in the backend/localStorage so a user can correct a bad guess once and it sticks forever. Unknown symbols fall back to TradingView's own symbol search — no fixed whitelist.

### Phase 2 — Candle data for Trade Replay
- Crypto: public Binance/Bybit klines through a thin backend function (keeps CORS, rate limits and retries on our side, and lets us cache).
- Cache per `symbol|interval|window` in memory + short-lived local cache, so paging through 20 trades is instant and repeated opens cost zero requests.
- Interval auto-picked from trade duration (scalp → 1m/5m, swing → 1h/1d) with a manual interval row.
- Non-crypto (stocks/forex/futures): Trade Replay shows a clear "chart replay available on TradingView tab" state instead of fake data. Can be extended later with a market-data provider if you want replay everywhere.

### Phase 3 — Modal restructure (UI/UX)
- The dossier becomes **wider with tabs**: `Overview` · `Chart` · `Notes`.
  - Desktop ≥1200px: optional split view — stats left, chart right, both visible at once.
  - Mobile: tabs only, chart full-width, height capped, pinch/scroll handled by the chart itself.
- The current flat "Price path" strip is upgraded: when replay candles exist it becomes a real mini price chart; otherwise it keeps today's fixed marker ladder.
- Prev/Next navigation keeps working while the Chart tab stays open — only the series and lines swap, the chart instance is reused.

### Phase 4 — Performance discipline
- Both chart layers are **lazy-loaded**: no script, no library, no network until the Chart tab is opened once.
- One chart instance per modal, reused across Prev/Next; hard `remove()` cleanup on close to avoid memory leaks (critical when browsing dozens of trades).
- The TradingView iframe only mounts on its own tab and unmounts when you leave it.
- Candle fetches are aborted on symbol change; skeleton shimmer while loading.

### Phase 5 — Polish
- Theme bridge: chart background, grid, up/down colors and line colors all read from the active ORCA theme tokens (Indigo Nebula / Platinum / high-contrast), and re-theme on theme switch.
- Reduced-motion respected (no animated series reveal).
- Hebrew/English labels for every new string.
- Keyboard: `1/2/3` switch tabs, arrows keep switching trades.

## Technical notes

- New deps: `lightweight-charts` only. TradingView widget is a `<script>` embed, no package.
- New files (indicative): `src/lib/market/symbol-resolver.ts`, `src/lib/market/candles.ts` (client cache), a backend function `market-candles`, `src/components/trading/chart/TradeReplayChart.tsx`, `src/components/trading/chart/TradingViewPanel.tsx`, `src/components/trading/chart/useTradeCandles.ts`.
- Edited: `TradeDetailModal.tsx` (tabs + layout), plus the symbol-override storage.
- Licensing: widget usage requires keeping the visible TradingView attribution — we keep it. `lightweight-charts` is Apache-2.0 with an attribution notice, also kept.
- No change to trade data model except an optional per-user symbol-mapping record.

## Suggested build order
1. Symbol resolver + TradingView tab (fast win, works for every ticker immediately).
2. Candle backend + cache.
3. Trade Replay chart with entry/stop/exit lines.
4. Split view, price-path upgrade, theme bridge, perf pass.
