# Midnight Theme — Terminal Discipline Pass

Goal: turn Midnight from a multi-hue "nebula" palette into a disciplined, monochrome trading terminal where color carries meaning. Only the Midnight theme changes — Blue, Platinum and Graphite stay exactly as they are.

## What is wrong today

- Midnight's categorical chart palette is a rainbow: violet, cyan, green, teal, lavender, red, amber, gray. Green and red therefore appear on non-financial series, which destroys their meaning.
- Two competing accents are live at once: indigo-violet (`primary`, active states, aurora) and cyan (`blue`/info). Nothing reads as "the" accent.
- The heat ramp runs navy → teal → mint, so heatmaps look green even when the value is not profit.
- Result: dense screens read as decorative instead of analytical.

## The new Midnight

**Canvas and layering** (unchanged in spirit, tightened):
```text
base    #0B0E14   page canvas
sunken  #10131C   wells, table stripes, inputs
card    #151925   default panel
raised  #1C2130   nested rows, hovers
border  hairline cool-gray, ~8% white with a blue cast
```
Panels keep their translucent glass fill and blur so depth comes from elevation, not from color.

**One accent — electric blue `#3B82F6` (glow `#60A5FA`).**
Used only for: primary CTAs, active tab/nav state, focus rings, selected rows, links, and the loader orbit. The violet becomes a secondary structural tint (aurora, gradients) at low opacity, never a control color.

**Semantic lock — green `#3DDC97` / red `#FF6B6B` are reserved.**
They appear only on P&L values, win/loss states, equity/drawdown series, and market direction. They are removed from the categorical series palette, the heat ramp, and all generic UI.

**Categorical series become a monochrome ramp.** Instead of 8 unrelated hues, the series palette is a single-hue blue ladder plus cool neutrals, so multi-series charts are distinguished by lightness and weight rather than by color:
```text
#3B82F6  #60A5FA  #93C5FD  #C7DBF7
#5B6B8C  #8A93A6  #B4BDD0  #2C3A55
```

**Heat ramp goes monochrome blue** (deep navy → electric blue → pale ice), and the diverging ramp keeps red↔green only where it genuinely encodes profit vs. loss (P&L calendars, correlation of returns).

**Numbers**: enforce tabular lining figures on all metric, table and axis text in Midnight so columns of digits align, and emphasize by weight/size rather than hue.

## What the user will see

- Dashboards, the Performance Deck and Advanced Lab charts read as one calm blue system, with green/red spikes that instantly mean money.
- Buttons, tabs and focus states all share one blue; no more competing violet/cyan.
- Tables and metric cards look sharper because digits line up and emphasis comes from weight.
- No layout, data or functionality changes anywhere.

## Technical notes

- `src/lib/trading-theme.ts` → the `midnight` object only: `bg`, `surface`, `accent`, `border`, `state`, `chart.series`, `chart.heat`, and `cssVars` (`primary`, `accent`, `ring`, `auroraA/B`, `glowSpot`, `sidebar`).
- `src/lib/neon-palette.ts` → `DARK` / `SURF_DARK` accent + surface values realigned to the same tokens so hardcoded-hex components follow automatically. Green/red keys keep their current values so P&L rendering is untouched.
- `src/lib/chart-theme.ts` → no API change; the monochrome ramp flows through `seriesColor`, `seriesPalette`, `heatColor`. `divergingColor` keeps red/green.
- Add a `font-variant-numeric: tabular-nums` rule scoped to numeric/metric/axis classes in `src/index.css`.
- Sweep the dashboard/journal components that hardcode violet or rainbow hexes for chart series and swap them to `seriesColor(T, i)` — semantic P&L hexes are left alone.
- Verification: load dashboard, Performance Deck, Control Room and the journal in Midnight and confirm no green/red on non-financial elements, then confirm the other three themes render unchanged.
