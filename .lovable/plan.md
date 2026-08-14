# Trade Chart — readability, trust and consistency pass

Scope: the Chart tab inside the trade dossier (replay chart, its control rows) and the dossier footer actions. No changes to trade data, R math, or journal logic.

## 1. Price-scale label collisions (critical)

Today Entry/Stop/Exit are three independent price lines, each with its own axis badge, drawn on top of the chart's own price ticks.

- Merge levels that land within a few pixels into a single badge (`STOP · EXIT 75.19`), coloured by the more severe level.
- Hide the chart's native axis tick when one of our badges overlaps it, so `ENTRY 75.37` never sits on top of `75.40`.
- Compute this on every data/scale change (zoom, pan, interval switch), not only on first render.
- Give the ENTRY badge a proper contrast pair (dark text on the info colour, or light text on a darkened fill) so it passes AA like the red badges do.

## 2. Cropped "Exit" marker text

The Exit marker label is clipped at the right edge of the plot. Fix by placing the exit marker inside the padded area (extra right-hand bars added to the visible range) and shortening the label to `EXIT` / `יציאה` with the approximate mark rendered as a suffix that cannot push it out of the clip box.

## 3. Symbol vs. price mismatch

The header shows `BINANCE:BTCUSDT` while the scale reads ~75. This needs to be confirmed before it is "fixed": the symbol resolver only produces `BTCUSDT` from a `BTC` coin or a saved manual override, so the first step is to check what that trade actually stores and whether a stale override is in play.

Regardless of cause, add a **sanity guard**: if the trade's entry price is outside a wide band around the fetched candle range, the chart shows an inline warning ("Symbol may not match this trade") with a one-click Change symbol, instead of silently drawing an impossible chart.

## 4. Risk / reward zones instead of the diagonal line

Replace the straight Entry→Exit line with the desk-standard rendering:

- A translucent red band between Entry and Stop across the trade window (risk zone).
- A translucent green band between Entry and the exit/target across the same window (reward zone).
- Entry and Exit stay as arrow/dot markers on the actual candles.
- The old diagonal becomes an optional toggle, off by default.

## 5. Unexplained markers and missing outcome

- The dashed vertical (entry time) and dashed horizontal (the extra level) get a small legend row under the chart plus axis titles, so nothing is unlabeled.
- Add a compact result chip pinned to the chart corner: R-multiple and P&L, coloured by outcome — the number the eye is already looking for.

## 6. Framing and empty canvas

Autoscale is set so the visible range is `[min(Stop, Entry, Exit, candle low), max(...)]` plus a fixed percentage of padding, and the time range starts a few bars before entry and ends a few bars after exit — no dead 200px on the left, no empty top third.

## 7. Controls: hierarchy and consistency

- **Entry / Stop / Exit**: relabel as what they are — jump controls — with an icon and a shared style, visually separated from the `Show/Hide zones` toggle which gets a real pressed state.
- **Timeframe pills**: single min-width for all, a filled active state instead of a thin outline.
- **Exit time row**: collapse to a single compact line with an inline text link; the oversized box goes away.
- **Typography**: two families only — monospace for numbers, symbols and data labels; the UI sans for actions and tabs.
- **Radius**: one scale across the modal — controls and buttons use the small/medium tokens, the modal keeps the large one.
- **Direction**: the chart panel is explicitly `dir="ltr"` (a declared decision, since price/time axes are LTR), while all its text still translates; the rest of the dossier follows the app direction.

## 8. Footer actions

- `Delete Trade` becomes a quiet secondary text/icon action pinned to the opposite side, not a half-width button.
- `Edit Trade` stays primary, and its stuck-looking glow is replaced with a normal resting state plus a hover-only elevation.
- The close (X) control already exists in the header; it gets stronger contrast so it reads as an escape.

## Technical notes

- Files touched: `src/components/trading/chart/TradeReplayChart.tsx` (badges, zones, markers, autoscale, legend), `src/components/trading/chart/TradeChartPanel.tsx` (control rows, timeframe pills, exit-time row, mismatch guard), `src/components/trading/TradeDetailModal.tsx` (footer hierarchy, close button, direction).
- Merged badges are drawn as a small absolutely-positioned overlay layer synced to the chart price scale, since `lightweight-charts` axis labels cannot be merged natively.
- All colours come from the active theme tokens and the semantic-colour helpers; red/green stay reserved for P&L meaning.
- Both languages get strings for every new label.
