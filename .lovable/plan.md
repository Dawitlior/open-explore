
# ORCA MASTER PLAN — DUAL TRACK

Two independent but harmonized tracks. Track A resets the Oracle Diagnostic into a true Behavioral OS Kernel. Track B audits and re-architects the Dashboard into a state-aware terminal. Nothing ships until you green-light each track separately.

---

## TRACK A — ORACLE CORE v2: BEHAVIORAL OS DIAGNOSTIC KERNEL

### A.0 Philosophical Reset

The previous build was a quiz with a glass coat. v2 is a **diagnostic kernel** — a continuous, recursive interview that audits the *person operating the machine*, not just the trader on screen. The user should feel they have entered a privileged sub-OS of the terminal, the way an engineer drops into a kernel debugger.

Three non-negotiables:

1. **No quiz chrome.** No progress bars. No "Submit". No "Next". No counters. No percentages visible to the user. The illusion is a continuous terminal session.
2. **Recursion is the product.** Every claim is stress-tested by an opposing scenario within 1–3 nodes. Inconsistency is the *desired* signal.
3. **Telemetry is data, not analytics.** Latency, hover, flip, scroll-jitter, idle-pause, and abandonment all feed the vector with equal weight to the chosen option.

### A.1 Node Taxonomy — 7 Strata, 42–48 Nodes

The catalog is organized in strata, not "questions". The engine traverses strata non-linearly based on detected dissonance.

```text
STRATUM            COUNT   PURPOSE
─────────────────  ─────   ──────────────────────────────────────────────
S1  Chrono         5–6     Sleep window, peak energy, decision time-of-day
S2  Environment    4–5     Desk setup, screen count, noise, isolation
S3  Information    6–7     Feeds, influencers, channels, news cadence
S4  Identity       5–6     Self-narrative ("I am a ___ trader") — claim layer
S5  Scenario       10–12   High-pressure trade simulations (the "test")
S6  Shadow         6–8     Probes for ego, revenge, FOMO, denial
S7  Recovery       3–4     Post-loss ritual, journaling, social withdrawal
```

Each Identity claim in S4 registers a **claim_token** (e.g. `claim:patient`, `claim:disciplined`, `claim:contrarian`). The engine guarantees that within the next 3 nodes a **counter-scenario** from S5/S6 is injected to test the claim. Result is stored as `claim_integrity ∈ [-1, +1]` per token.

### A.2 Recursive Engine — Routing Rules (v2)

Routing priority, top-down (first match wins):

```text
1. CLAIM-TEST OWED        — a claim_token from S4 has no matching test yet
2. CONTRADICTION PROBE    — last answer contradicts an earlier dimension
3. INSTABILITY PROBE      — telemetry flagged (latency>4.5s OR flip≥2 OR skip)
4. CROSS-STRATUM BRIDGE   — life-habit signal (S1–S3) needs trading mirror
5. DEPTH ESCALATION       — dimension confidence still <0.6 after 3 hits
6. STRATUM ROTATION       — avoid two consecutive nodes in same stratum
7. CONFIDENCE LOCK        — vector_confidence ≥ 0.92 AND ≥30 nodes
8. HARD CAP               — 48 nodes
```

Two new pure functions added to `engine.ts`:

- `claimDebt(session) → string[]` — list of claim_tokens still owed a test.
- `crossStratumBridge(vector) → string|null` — picks an S5/S6 node whose dimensions overlap with the strongest S1–S3 signal (e.g. user reports "3am scroll sessions" → bridges to a node about late-night impulsive entries).

### A.3 Telemetry — "Instability Metrics"

Existing telemetry (latency, hover, flip) is kept. We add:

| Metric           | Captured by                                  | Vector use                          |
|------------------|----------------------------------------------|-------------------------------------|
| `idle_pause_ms`  | longest pause between hover events           | amplifies hesitation                |
| `scroll_jitter`  | vertical scroll variance during node         | flags discomfort                    |
| `re_read_count`  | mouse leaves+returns to prompt area          | flags doubt                         |
| `abandon_flag`   | session closed mid-node                      | strong negative confidence on dim   |
| `revisit_delta`  | answer change on re-approach                 | feeds `claim_integrity`             |

All metrics flow through the existing `signalAmplifier` but with a per-metric cap so no single signal can dominate the vector.

### A.4 128-D Vector Mapping (no granularity loss)

The 128 dimensions are partitioned into 8 blocks of 16. Each stratum writes into ≥2 blocks, so cross-stratum signals are preserved:

```text
BLOCK  DIMS     OWNER STRATA       EXAMPLES
─────  ───────  ─────────────────  ────────────────────────────────
B1     d000-15  S5, S6             impulsivity, loss_aversion, revenge
B2     d016-31  S5, S4             discipline, conviction, ego_attribution
B3     d032-47  S1, S5             chrono_alignment, fatigue_risk
B4     d048-63  S2                 environment_friction, focus_capacity
B5     d064-79  S3                 info_diet_quality, narrative_susceptibility
B6     d080-95  S4, S7             self_narrative_gap, recovery_health
B7     d096-111 S6                 shadow_patterns (FOMO, denial, ...)
B8     d112-127 derived            claim_integrity_*, instability_index
```

Granular telemetry is **not** collapsed into the vector. It persists in `oracle_telemetry` rows (one per node visit) and is queryable for the Blueprint report and the AI coach.

### A.5 Schema Additions (migration, not destructive)

```sql
ALTER TABLE oracle_nodes
  ADD COLUMN stratum text NOT NULL DEFAULT 'S5',     -- S1..S7
  ADD COLUMN claim_token text,                        -- nullable, S4 only
  ADD COLUMN counter_for text;                        -- nullable, references claim_token

ALTER TABLE oracle_telemetry
  ADD COLUMN idle_pause_ms integer,
  ADD COLUMN re_read_count integer NOT NULL DEFAULT 0,
  ADD COLUMN abandon_flag boolean NOT NULL DEFAULT false;

ALTER TABLE oracle_sessions
  ADD COLUMN claim_ledger jsonb NOT NULL DEFAULT '{}'::jsonb,   -- token → integrity
  ADD COLUMN instability_index numeric NOT NULL DEFAULT 0;
```

The existing 8 seeded scenarios become S5 nodes. We seed an additional ~38 nodes across S1–S4, S6, S7.

### A.6 UX — "Calibration Mode", Not a Modal

The current full-screen modal is replaced by a **Terminal Sub-Route**: `/calibration`. Treated as a first-class OS surface, not an overlay.

Layout (matches Orca terminal grid exactly — `OrcaCard`, `OrcaPanel`, IBM Plex Mono labels, `#061326` ground):

```text
┌─ orca top bar (unchanged) ───────────────────────────────────┐
├──────────────────────────────────────────────────────────────┤
│  ◈ CALIBRATION KERNEL · session 0x3F · stratum S5 · live    │  ← hairline header, mono
├───────────────┬──────────────────────────────┬───────────────┤
│ LEFT RAIL     │  NODE PANEL (OrcaCard)        │ RIGHT RAIL    │
│ (mono labels) │                               │               │
│               │  prompt rendered as terminal  │  live signal  │
│ stratum map   │  prose, options as inline     │  glyphs only  │
│ (no numbers,  │  monospace selectables —      │  (latency dot,│
│  just glyphs) │  no buttons                   │  flip glyph)  │
│               │                               │               │
│               │  selection happens on click   │  no numbers   │
│               │  or keypress; next node       │  shown to     │
│               │  fades in immediately         │  user         │
└───────────────┴──────────────────────────────┴───────────────┘
```

UX rules:

- No "Begin" CTA — entering `/calibration` *is* beginning. The first prompt is already rendered.
- No "Next" — selection auto-advances after a 220ms confirmation pulse.
- No "Submit" — there is no end the user sees; the session locks silently and the route transitions into the Blueprint view in place.
- No progress bar. The left rail shows stratum glyphs that quietly light as visited. No %, no count.
- Skipping is a keystroke (`Esc`) or a tiny "defer" glyph, never a button.
- Abandonment is treated as data — leaving the route mid-session records `abandon_flag` and lowers vector confidence on the active dimension.
- Strict bilingual (HE RTL / EN LTR) like the rest of the terminal.

### A.7 Onboarding Integration

Two entry paths, both feel like system setup:

1. **First-run wizard:** after the existing 5-step onboarding completes, the wizard hands off to `/calibration` with a single mono line: `▸ Initializing operator profile…`. No "take the quiz" framing.
2. **Returning user:** sidebar shows `◈ Calibration · uncalibrated` chip. Click routes to `/calibration`. Recalibration triggers (≥30 trades, ≥14 days, drift>25%) surface as a hairline banner inside the Calendar Hub and as a `◈ recal owed` chip.

### A.8 Coach Injection (unchanged contract, richer payload)

`orca-coach` keeps its prompt-prefix contract. v2 adds two new lines to the injected block:

```text
[ORACLE DNA — Archetype]            ...
[CLAIM INTEGRITY]                   patient:-0.7  disciplined:+0.4  ...
[INSTABILITY INDEX]                 0.62 (elevated — favor risk-down guidance)
[COACH PROMPT]                      ...
```

### A.9 Files Affected (preview, not yet written)

- **Schema migration** — additive only, no drops.
- **`src/lib/oracle/types.ts`** — extend with `stratum`, `claim_token`, `counter_for`, `claim_ledger`, `instability_index`.
- **`src/lib/oracle/engine.ts`** — add `claimDebt`, `crossStratumBridge`, new routing priorities.
- **`src/lib/oracle/vectorize.ts`** — block-aware writer; per-metric amplifier caps.
- **`src/lib/oracle/nodes.seed.ts`** — expand to ~46 nodes across S1–S7.
- **`src/pages/Calibration.tsx`** — new route, terminal-grid layout.
- **`src/components/oracle/CalibrationKernel.tsx`** — node panel (replaces `OracleNodeCard`).
- **`src/components/oracle/StratumRail.tsx`** — left glyph rail.
- **`src/components/oracle/SignalRail.tsx`** — right live-signal rail.
- **`src/components/oracle/OracleSession.tsx`** — deleted (modal retired).
- **`src/components/trading/OnboardingWizard.tsx`** — hand-off to `/calibration`.
- **`src/pages/Index.tsx`** — sidebar chip routes to `/calibration` instead of opening modal.
- **`supabase/functions/orca-coach/index.ts`** — append claim_integrity + instability_index lines.

### A.10 Acceptance — Track A is done when

- Catalog has ≥42 nodes across all 7 strata.
- Every S4 claim is provably stress-tested within 3 nodes by trace logs.
- `/calibration` route shows zero "form" affordances (no buttons labeled Next/Submit/Begin).
- Telemetry rows include the 3 new columns and are written for every visit.
- Coach prefix includes the two new lines and is observable in `orca-coach` logs.
- Engine unit tests cover: claim-debt routing, contradiction probe, abandonment, lock condition.

---

## TRACK B — DASHBOARD SYSTEM OPTIMIZATION MASTER PLAN

Audit covers Standard and Alpha modes across the four states: Beginner, Live, Review, Research.

### B.1 Feature Inventory (current surface)

Grouped by component family. `A` = Actionable, `N` = Noise risk, `R` = Redundant with another widget.

```text
FAMILY           COMPONENT                                  VERDICT   NOTES
───────────────  ─────────────────────────────────────────  ────────  ─────────────────────────────
KPI              AdaptiveKpiCards (P&L, Win%, Expectancy)   A         keep, but state-gate
KPI              RProxyBanner                                A         Live + Review only
RISK             RiskLimitAlert (4-tier)                     A         always-on (all states)
RISK             AdvancedRiskPage tiles                      A/R       overlaps RiskLimitAlert deeply
PSYCH            AdvancedPsychologyPage                      A         Research only
PSYCH            PsychologyLab                               R         duplicates Psychology page 70%
SENTIMENT        Fear & Greed gauge                          N         decorative in Beginner/Live
SENTIMENT        Behavioral signals strip                    A         Review only
ANALYTICS        AnalyticsQuantLab                           A         Research only
ANALYTICS        AdvancedAnalyticsPage charts                A/R       overlaps QuantLab modules
CALENDAR         CalendarHubPage (P&L heatmap)               A         always-on
CALENDAR         CalendarModal (T1 USD/CNY)                  A         Live + Research
ECONOMIC         EconomicAlertBanner (T-5/T-1/live)          A         Live always; Review on-demand
ECONOMIC         MacroEventStrip                             A         Live; collapse elsewhere
ECONOMIC         EconomicCalendarPage (radar terminal)       A         Research only
JOURNAL          Trade table                                 A         Review primary; Live secondary
JOURNAL          MobileTradeCard                             A         mobile mirror of table
AI               AIInsightsPage                              A         Review + Research
AI               Orca Coach chat                             A         all states (sidebar)
BACKTEST         BacktestDimension                           A         Research only
WEEKLY           WeeklyReviewPage                            A         Review only (Fri / 1st)
ORACLE           Calibration chip + recal banner             A         all states (passive)
CHARTS           LazyChart wrappers                          A         state-specific palettes
UI CHROME        DimensionController (channel switcher)      A         keep; recently fixed
UI CHROME        DisplayModeToggle / ModeSwitch              A         keep
UI CHROME        CommandPalette                              A         keep, always-on
HINTS            FeatureHint, FeatureManifestModal           N         Beginner only; hide elsewhere
INSTALL          InstallPrompt, InstallGuide                 N         first-session only
```

**Redundancy hotspots:**

- `AdvancedRiskPage` tiles ≈ `RiskLimitAlert` (60% overlap). Collapse `AdvancedRiskPage` into an expandable section under `RiskLimitAlert`.
- `PsychologyLab` ≈ `AdvancedPsychologyPage` (70% overlap). Retire `PsychologyLab`; route its unique modules into `AdvancedPsychologyPage`.
- `AdvancedAnalyticsPage` and `AnalyticsQuantLab` share 3 charts (equity curve, drawdown, expectancy distribution). Merge into a single `QuantLab` with tabs.
- Fear & Greed gauge duplicates information already in the behavioral signals strip — keep one, in Review.

### B.2 De-Clutter Strategy

Three moves:

1. **Remove outright** (low-signal, decorative):
   - Fear & Greed gauge in Beginner/Live.
   - `FeatureHint` and `FeatureManifestModal` outside Beginner.
   - Duplicate equity/drawdown charts (consolidated into QuantLab).
   - `PsychologyLab` (merged into AdvancedPsychology).

2. **Collapse to expandable** (terminal-style disclosure):
   - `AdvancedRiskPage` tiles → expandable under `RiskLimitAlert`.
   - `MacroEventStrip` → collapsed by default in Review/Research, expanded in Live.
   - Long KPI rows → primary 3 metrics visible, secondary metrics under a `▾ expand` hairline.

3. **Layout discipline** (TradeReport-style terminal):
   - 12-column grid, 8px gutters, hairline 1px dividers — no shadows except `OrcaCard` glass.
   - Header row reserved for status (mode, state, risk %, calibration).
   - Two body zones: left "operational" (live data), right "reflective" (analytics/history).
   - All numeric values in IBM Plex Mono, tabular-nums, right-aligned in tables.
   - Color reserved for state (green/red P&L, amber risk) — no decorative gradients in body.

### B.3 State-Specific Data Mapping

Each state has a strict allowlist. Anything not on the list is hidden, not greyed.

**Beginner — 3–4 metrics, training wheels on:**

```text
Today P&L (R)        large mono number, color by sign
Risk Used Today      progress hairline against -2R day limit
Next Macro Event     single-line strip (T1 USD/CNY only)
"Coach says..."      one-line Orca tip pulled from oracle DNA
```

Everything else hidden. No charts. No tables.

**Live — split-second decision surface:**

```text
LEFT ZONE                       RIGHT ZONE
─────────────────────────────   ─────────────────────────────
Open positions tile             RiskLimitAlert (4-tier, live)
Quick TradeForm (R-chips)       MacroEventStrip (expanded)
Today P&L + R                   Calibration recal chip (if owed)
Session timer                   EconomicAlertBanner (T-5/T-1)
```

No historical charts. No analytics. No weekly review. Latency budget < 150ms per interaction.

**Review — pattern recognition surface:**

```text
TOP            AdaptiveKpiCards (week + month + all-time)
LEFT           CalendarHubPage (P&L heatmap)
RIGHT          Trade table (sortable, filterable)
BELOW LEFT     Behavioral signals strip
BELOW RIGHT    AIInsightsPage card (deep insights)
FRIDAY/1ST     WeeklyReviewPage prompt banner
```

Live trade form hidden. Macro strip collapsed.

**Research — quantitative + macro:**

```text
TOP            QuantLab tabs (equity, drawdown, expectancy, MAE/MFE)
MIDDLE LEFT    BacktestDimension
MIDDLE RIGHT   AdvancedPsychologyPage modules
BOTTOM LEFT    EconomicCalendarPage (unfiltered radar)
BOTTOM RIGHT   CalendarModal (T1 USD/CNY strategic)
```

No live trade entry. No risk-limit alert (still always-on in chrome, just not duplicated in body).

### B.4 Mode × State Matrix

```text
                  BEGINNER     LIVE         REVIEW       RESEARCH
STANDARD          training     ops          reflective   analytics
ALPHA             (not shown)  ops+telemetry deep psych  full quant+macro+backtest
```

Alpha mode unlocks: instability index display, raw telemetry strip, claim_integrity tiles, full QuantLab, unfiltered economic radar, backtest commit panel. Standard mode shows curated subsets of the same surfaces — Alpha is additive, never a different layout.

### B.5 Consolidation Recommendations

1. **One Risk surface** — `RiskLimitAlert` is canonical; `AdvancedRiskPage` becomes its expanded view.
2. **One Psychology surface** — `AdvancedPsychologyPage` is canonical; retire `PsychologyLab`.
3. **One Analytics surface** — `QuantLab` (renamed) is canonical; absorb `AdvancedAnalyticsPage` charts as tabs.
4. **One Economic split** — already enforced (Radar = unfiltered Research; Calendar = T1 USD/CNY everywhere else).
5. **Sidebar grouping** — Operate (Live, Calendar), Reflect (Review, Weekly, Journal), Research (QuantLab, Radar, Backtest), System (Calibration, Settings).
6. **Command palette** as the universal jump — every consolidated surface gets a stable command id.

### B.6 Files Likely Touched (Track B)

- `src/components/trading/TradingUI.tsx` — state-aware allowlist.
- `src/components/trading/AdaptiveKpiCards.tsx` — gated metric set per state.
- `src/components/trading/AdvancedRiskPage.tsx` — convert to expandable under `RiskLimitAlert`.
- `src/components/trading/PsychologyLab.tsx` — delete; merge unique parts into `AdvancedPsychologyPage`.
- `src/components/trading/AdvancedAnalyticsPage.tsx` + `AnalyticsQuantLab.tsx` — merge into `QuantLab` with tabs.
- `src/pages/Index.tsx` — sidebar regrouped (Operate/Reflect/Research/System).
- `src/components/trading/DimensionController.tsx` — state-aware layout dispatch.
- `src/hooks/use-dashboard-config.ts` — per-state allowlist source of truth.

### B.7 Acceptance — Track B is done when

- Each of the 4 states renders only its allowlisted widgets (visual diff check).
- No two surfaces render the same chart twice.
- `PsychologyLab` removed from the bundle.
- `QuantLab` is the only home for equity / drawdown / expectancy charts.
- Beginner state shows ≤4 widgets.
- Live state interactive budget < 150ms per click (measured).

---

## EXECUTION ORDER

1. You approve Track A scope → I write the schema migration as the first ship-step and stop for approval.
2. After migration, I implement engine v2 + new node catalog + `/calibration` route in one batch.
3. Track B starts only after Track A's `/calibration` route is live, so the dashboard refactor can assume DNA-aware state gating.

No code written until you reply with `approve A`, `approve B`, or `approve both`.
