# Landing → Scrollytelling Refactor (Phased)

## Guardrails (non-negotiable)
- No changes to: navbar routes, CTAs (`APP_URL`, `/auth`, `/welcome`), language logic, Supabase calls, `LANG_OVERRIDE_KEY`/`LANG_CACHE_KEY`, footer links, feature-tab content, TraderMind rotator data, or any imported hook.
- All existing section IDs (`#features`, `#journal`, `#community`) preserved so anchor links keep working.
- Refactor is additive: new scroll components wrap/replace **visual containers only**; button JSX + `onClick`/`href` stay verbatim.
- Framer Motion already in project — no new deps.

## Current section map (src/pages/Landing.tsx)
```text
Navbar → Hero → Integrations → FeatureTabs(#features) → Journaling(#journal)
→ Video → Insights → Edge/Risk → TraderMind → Community(#community) → Final CTA → Footer
```

## Target scrollytelling architecture
A shared `ScrollStage` primitive: `position: sticky; top: 0; height: 100vh` visual pinned while a tall spacer (`height: 200vh`) drives progress via `useScroll({ target, offset:['start start','end end'] })` + `useTransform`. Content overlays fade/slide with `useTransform(progress, [...], [...])`. `prefers-reduced-motion` disables transforms → falls back to current static layout.

New file: `src/pages/landing/scrollytelling/` (isolated, tree-shakeable)
- `ScrollStage.tsx` — sticky+spacer primitive
- `ExecutionFlowStage.tsx` — Phase 1 deliverable
- `TradeCardExplode.tsx` — Phase 3
- `DataObject.tsx` — geometric R:R shape (Phase 4)
- `OldVsNewStage.tsx` — contrast comparison (Phase 5)
- `index.ts`

`Landing.tsx` edits are surgical: replace one section's inner JSX with `<ExecutionFlowStage>`, keeping the outer `<section>` + id + CTAs.

## Phase 1 (this iteration): Execution Flow between Integrations & Feature Tabs
**Insert a new pinned stage** right after Integrations (line ~800), before `#features`. It does NOT remove any existing section — it bridges them with narrative.

Visual: a sticky vertical timeline (Broker Sync → AI Tag → Journal Update → Insight) on the left; on the right a mock trade row that animates through 4 states as scroll progresses. Uses only design tokens (`--bg-2`, cyan `#22D3EE`, existing Poppins/Plex Mono). Height ≈ 220vh spacer → ~1.5 screen scrolls to complete.

Interactions:
- 4 keyframes mapped to progress `[0, 0.25, 0.5, 0.75, 1]`.
- Timeline dots fill sequentially; connector line grows via `scaleY`.
- Trade card morphs: raw CSV row → tagged card → journal entry → insight tile.
- Reduced-motion: renders all 4 states stacked, no sticky.

Acceptance:
- No console errors, no layout shift on existing sections above/below.
- All navbar anchor links still scroll to correct IDs.
- Lighthouse mobile perf delta ≤ -3.
- On mobile (<768px), stage collapses to a single-column non-sticky sequence (already handled by `useIsMobile`).

## Phase 2 — Trader Mind heatmap replacement (later)
Swap the TraderMind rotator's screenshot with a scroll-driven heatmap (SVG grid, cells brighten by progress). Rotator data + captions untouched — only presentation layer swapped.

## Phase 3 — Exploded trade card (later)
On the Journaling section, one card decomposes into 3 stacked layers (Broker / AI / Portfolio) as it enters the viewport.

## Phase 4 — Geometric R:R data objects (later)
Replace static Edge/Risk stat tiles with `<DataObject>` — a polygon whose vertices scale with metric values (visual only; numbers unchanged).

## Phase 5 — Old vs New contrast stage (later)
New sticky stage before Final CTA: left column (spreadsheets, screenshots of chaos) fades out; right column (Orca dashboard) fades in as scroll progresses.

## Rollout & rollback
- Each phase is one PR-sized change to `Landing.tsx` (one section swap) plus additive files under `scrollytelling/`. Reverting = restore that section's original JSX block.
- Feature flag not required; each stage is self-contained and behind reduced-motion fallback.

## Confirmation needed before I build
1. Start with **Phase 1 (Execution Flow) inserted between Integrations and Feature Tabs** — yes/adjust?
2. Any section you want to keep 100% untouched (e.g. Hero) even in later phases?
