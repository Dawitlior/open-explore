# Light Mode Micro-Polish: Contrast, Rhythm, Card Uniformity

A precision pass on the light ("platinum") scheme only. No layout rewrites, no color-language changes — the recent color-discipline work stays exactly as it is. Three defects, three systemic fixes.

## 1. Secondary text contrast (WCAG AA)

Current light tokens measured against the white card surface (#FFFFFF):

- `text.primary` #111827 — ~16:1, passes
- `text.secondary` #475569 — ~7.5:1, passes
- `text.muted` #64748B — ~4.8:1, passes AA for body
- `text.dim` #94A3B8 — **~2.7:1, fails AA** (used for chart captions, axis sub-labels, helper lines like "Cumulative net profit/loss")

Fix: darken the light-scheme text ramp so every tier clears AA at its size.

- `dim` → #64748B (4.8:1) — small caption text now legal
- `muted` → #566171 (~6:1) — comfortable for 9-11px uppercase micro-labels
- `chart.axis` → #566171 to match, so axis ticks stop reading as "ghost text"
- Dark themes are untouched: these values live inside the `platinum` theme object only.

Also raise the minimum opacity floor: any light-mode text drawn as `color + hex alpha` (e.g. `${T.text.muted}80`) gets clamped to full opacity in light scheme — alpha-faded gray on white is the main source of the "borderline in bright light" feel.

## 2. White space rhythm inside cards

The eye travels too far because card padding, inner gaps, and chart top margins are each set independently in dozens of components.

Fix: one spacing rhythm applied at the CSS layer, not per component.

- Card padding in light scheme normalizes to 18px (from the current mixed 20-24px), still respecting the existing compact/comfortable/spacious density switch.
- Chart blocks get a shared `--orca-chart-inset` (title-to-plot 10px, plot-to-caption 8px) so the vertical gap above a chart is identical everywhere.
- Grid gaps inside bento sections standardize to 12px on desktop / 10px on mobile via the existing dashboard grid classes.

Net effect: roughly 15-20% less dead space per card with zero content reflow risk.

## 3. Card border and shadow uniformity

Today light-mode cards resolve their edge from two different sources: the shared `.orca-glass` rule (border #E9EDF5) and per-component inline `border: 1px solid ${T.border.subtle}` (#EEF1F7 — about 1.05:1 against white, effectively invisible on low-density screens).

Fix:

- Retune `border.subtle` for light to #E4E9F2 and `border.medium` to #D8E0EC, so both are visible but quiet, and the two-source discrepancy collapses to a barely perceptible difference.
- Single canonical elevation for bento cards: `0 1px 2px rgba(15,23,42,0.05), 0 6px 18px rgba(15,23,42,0.05)`. Elevated/overlay surfaces keep their own stronger token. Cards stop varying page to page.
- Hover elevation becomes a fixed delta from the resting shadow rather than a separately authored value.

## Cognitive-ergonomics rationale

Each fix serves the load-management principles you described: legible-but-quiet secondary text lets the eye skip it without effort (no re-reading tax), a consistent spatial rhythm removes the micro-search between elements, and a single card edge weight means the only thing that can visually "pop" is a real alert — preserving the isolation effect that makes warnings work.

## Technical notes

- `src/lib/trading-theme.ts` — `platinum` object: `text`, `border`, `chart.axis` values.
- `src/index.css` — `html[data-scheme="light"]` block: canonical card padding, border, shadow, hover delta, alpha-clamp rule for text.
- `src/components/dashboard/dashboard.css` — grid gap and chart inset variables.
- Components are not edited individually; they inherit through tokens and the light-scheme cascade. Verification: render dashboard, Performance Deck, Control Room, Journal and Calendar in light mode and compare measured contrast plus card edge consistency.
