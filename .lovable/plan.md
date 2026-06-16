## Goal
Make `AdvancedRiskPage` scannable in 5 seconds, and close the 4 analytical gaps you flagged. Every new metric respects the display mode toggle (R-Multiples vs USD) via `useVisibleTrades` + the existing dual-format helpers — no metric will be R-only.

## New layout (4 zones, top → bottom)

```text
┌─────────────────────────────────────────────────────────┐
│ ZONE 1 · LIVE GUARDRAILS                                │
│  4-tier limit bars (Trade/Day/Week/Month)               │
│  Cool-Off badge  +  ⛔ KILL SWITCH (new, prominent)     │
├─────────────────────────────────────────────────────────┤
│ ZONE 2 · PORTFOLIO EXPOSURE  (new)                      │
│  Net Exposure $  ·  Gross Exposure $  ·  Leverage ×    │
│  Open-positions correlation matrix (heatmap)            │
│  Concentration bar (top symbol % of net risk)           │
├─────────────────────────────────────────────────────────┤
│ ZONE 3 · QUALITY OF RETURNS  (new metrics added)        │
│  MAR  ·  Sharpe  ·  Sortino  ·  Calmar                  │
│  Equity curve + drawdown shading                        │
├─────────────────────────────────────────────────────────┤
│ ZONE 4 · TEMPORAL RISK CONTEXT  (new)                   │
│  Hour-of-day P&L heatstrip (00→23, user TZ)            │
│  "Strategy window" badge: in/out of optimal hours       │
│  Day-of-week strip (existing, moved here)               │
└─────────────────────────────────────────────────────────┘
```

Section headers reuse the existing `SectionHeader` component so the terminal aesthetic is preserved.

## What gets added

1. **Net Exposure block** (`zone 2`)
   - `Σ |position_notional|` over `open_positions` table — gross
   - `Σ signed notional` — net (long − short)
   - Leverage = gross / account equity
   - Toggle shows the same three values in R: gross/net risk = `Σ |open_risk_R|`

2. **Correlation matrix** (`zone 2`)
   - 30-day rolling Pearson on daily returns of every symbol with an open position OR ≥5 closed trades
   - Compact heatmap (≤8 symbols) — red ≥0.7, amber 0.4–0.7, neutral <0.4
   - Footer line: "Effective independent bets ≈ N" (eigenvalue-based, simple)

3. **Sharpe + Sortino** (`zone 3`)
   - Daily R-series → annualized (×√252) for the R toggle
   - Daily $-series (same series × avg risk-per-trade $) for the USD toggle
   - Sortino uses downside deviation only
   - Display next to existing MAR + Calmar in one 4-tile strip

4. **Hour-of-day strip** (`zone 4`)
   - Bin trades by `closed_at` hour in user local TZ → bar = sum P&L (or sum R)
   - Color: green positive, red negative, fade if n<3
   - "Best window" / "Worst window" tags computed from top/bottom 3-hour rolling sum
   - "Outside strategy window" warning when last trade's hour is not in top-50% window

5. **Kill Switch** (`zone 1`)
   - New panel: big toggle "🛑 Kill Switch — Lock new entries"
   - Writes to existing `live_risk_locks` table (already in schema) with `reason='manual_kill_switch'` and `locked_until = now() + Xh` (user-chosen: 1h / rest of day / 24h)
   - `TradeForm` already reads `live_risk_locks` via `useRiskLimits`; will block submit and show the lock reason
   - Confirm modal (`orcaConfirm`) to prevent accidental clicks
   - Manual unlock requires typing "UNLOCK" (high-friction, matches reset pattern)

## Files

- `src/components/trading/AdvancedRiskPage.tsx` — restructure into the 4 zones; replace current freeform stack
- `src/components/trading/risk/NetExposurePanel.tsx` *(new)*
- `src/components/trading/risk/CorrelationMatrix.tsx` *(new)*
- `src/components/trading/risk/QualityOfReturnsStrip.tsx` *(new)* — MAR/Sharpe/Sortino/Calmar
- `src/components/trading/risk/HourOfDayStrip.tsx` *(new)*
- `src/components/trading/risk/KillSwitchPanel.tsx` *(new)*
- `src/lib/risk/quality-metrics.ts` *(new)* — `computeSharpe`, `computeSortino`, `computeCalmar` (pure, accept `Trade[]` + mode)
- `src/lib/risk/correlation.ts` *(new)* — daily-returns matrix + Pearson + effective-bets
- `src/lib/risk/exposure.ts` *(new)* — read `open_positions` for current portfolio, return gross/net/leverage in $ and R
- `src/hooks/use-risk-limits.ts` — extend to expose `engageKillSwitch(hours)` / `releaseKillSwitch()` writing to `live_risk_locks`
- `src/components/trading/TradeForm.tsx` — surface the kill-switch lock reason inline (already blocked; just label it)

## Dual R / USD support
Every new metric reads the same `displayMode` already used elsewhere:
- R mode → metric computed on `getEffectiveR(trade)` series
- USD mode → metric computed on `trade.pnl` series
- Strip labels switch suffix automatically (`R` ↔ `$`)
- Sharpe/Sortino are unitless so they show the same number in both modes (correctly)

## Out of scope
- No DB migrations — `live_risk_locks` already exists with the right columns; no schema changes.
- No changes to risk-limits engine, scoring, or alerts.
- No mobile-specific layout pass — existing responsive rules carry over.
- AI-generated narrative on the new sections — can be added later if you want.

## Validation
- Read the page on `/risk` after changes and verify the 4 zones render in order, dual-mode toggle flips every new number, and Kill Switch actually blocks `TradeForm` submission.
