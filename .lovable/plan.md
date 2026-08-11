# Color Discipline — Platform-Wide Rollout

Extend the color rules already applied to the Dashboard gauges, Calendar sessions and Performance Deck to every page in ORCA. No theme changes, no layout changes, no logic changes — only which color a given element is allowed to ask for.

## The rules (already encoded in `semantic-color.ts`)

1. Neutral by default — a number is uncolored unless it crosses a threshold.
2. Green and red are money only: P&L, R, win/loss, equity, drawdown, market direction.
3. Amber/red states always carry a glyph (▲ ▬ ▼) so color is never the only signal.
4. Categorical chart series use a single-hue ladder from the active theme, never a rainbow.
5. Glow is reserved for live/alert states; historical and analytical surfaces stay matte.
6. One accent per theme for UI chrome (active tabs, links, focus, section labels).

## Rollout order

**Wave 1 — high-density analytical pages**
- Control Room (Risk + Mind): LiveStateBar chips, Kill Switch, Net Exposure, Quality of Returns, Correlation Matrix, Hour-of-Day strip. Risk/discipline/tilt values move to threshold coloring; heat strips move to the sequential ladder except where the value is signed P&L.
- Advanced Risk page and Advanced Psychology page: all score chips, radar/bar series, badge colors.
- Analytics Quant Lab, Ultimate Deck Charts, Time-Series Perf Matrix, Risk-Adjusted Ratios, Best/Worst Window, PnL Distribution, Simple Extra Charts, Dashboard Advanced Lab.

**Wave 2 — calendar and journal surfaces**
- Calendar Hub, Calendar Modal, Month Day Cell, Year View, Dashboard Calendar Strip: keep red/green strictly for day P&L; sessions, "today", selection and streak markers move to neutral/accent.
- Journal Gallery, Mobile Trade Card, Trade Detail Modal, Trade Chart panels: direction rails, R-strength meters and tab chrome move to the accent; only outcome values stay green/red.

**Wave 3 — chrome, forms and system UI**
- Index sidebar/nav, Mobile Bottom Nav, Command Palette, Mode Switch, Settings Hub, Exchanges panel, Trade Form validation states, Install prompts, Feature Hint, Reset/Explanation modals, AI Insights page.
- Here green/red currently signals "connected / error / success". These become the theme's success and danger state tokens rather than the P&L green/red, so a connected exchange no longer reads like a winning trade.

**Wave 4 — sweep and verification**
- Grep for remaining `T.accent.green|red|orange|purple|cyan|blue` usages and confirm each surviving one is genuinely financial.
- Walk every page in all four themes (Midnight, Blue, Platinum, Graphite) and confirm nothing lost meaning or contrast.

## What the user will see

- Every page reads as one calm system in the active theme's hue; green and red now spike only where money moved.
- Scores and risk metrics stay quiet until they need attention, then turn amber/red with an arrow glyph.
- Multi-series charts are read by lightness and weight instead of by rainbow hue.
- Nothing moves, nothing is removed, no data or behavior changes.

## Technical notes

- All color decisions route through `src/lib/semantic-color.ts` (`scoreColor`, `gaugeColor`, `scoreGlyph`, `severityColor`, `moneyColor`, `neutralRamp`, `infoColor`, `isAlert`). Any new state that needs a rule gets a helper there rather than a local hex.
- New helpers to add for wave 3: `statusColor(T, 'ok'|'warn'|'error')` mapping to `T.state` tokens, so system status stops borrowing the P&L palette.
- Chart series continue to flow through `chart-theme.ts` (`seriesColor`, `seriesPalette`, `heatColor`); components stop passing literal accents into Recharts `fill`/`stroke`.
- Components with the heaviest usage — `Index.tsx`, `SettingsHub.tsx`, `AdvancedPsychologyPage.tsx`, `AIInsightsPage.tsx`, `TradeForm.tsx` — are edited in place, token by token, with no structural refactor.
- Verification per wave: typecheck plus a visual pass of the touched pages in Midnight and Platinum.
