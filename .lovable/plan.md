# ORCA Console — pipes + validation (phased)

## Reality check

The brief is three separable bodies of work:
- **A1/A2** — DB pipes for Kill-switch and AI usage (concrete, small, verifiable this turn).
- **A3** — decisions on placeholder widgets (Churn / conversion trend / TTFT / diagnostic→tier).
- **B1/B2/B3** — full per-element validation matrix across 16 screens × 2 langs × 2 themes × 2 form factors + bug fixes.

B alone is 200–400 matrix rows, each requiring: (1) RPC field trace, (2) direct SQL cross-check, (3) empty-state verification, (4) window filter check, plus visual pass. Done honestly = 4–6 focused turns. Done in one turn = a "sample" that misses exactly what you want caught.

So I split it. **Each phase ends with proof, not a promise.**

## Phase 1 — Pipes (this turn)

### 1a · Kill-switch → `risk_events`
- Create migration:
  - `public.risk_events` (id, user_id FK auth.users, event_type CHECK ('kill_switch_on','kill_switch_off','daily_breach','weekly_breach','monthly_breach'), context jsonb, created_at).
  - GRANT SELECT/INSERT to authenticated, ALL to service_role.
  - RLS: own-row insert (auth.uid()=user_id), own-row select, admin select-all via `has_role`.
  - Index on (user_id, event_type, created_at DESC).
- Extend `useKillSwitch`: `engage()` writes `kill_switch_on` (context: `{hours, source:'manual'}`), `release()` writes `kill_switch_off` (context: `{msLeft}`). Non-blocking insert — if it fails the UI still toggles (local IndexedDB stays source of truth for the lock itself; the row is the audit trail).
- Extend `admin_risk_engine`: add `killOnCount` and `avgRecoveryMinutes` sourced from `risk_events`. No fabricated numbers — if the window has zero events, return 0 with `hasData:false`.
- Console widget: read the new fields, show empty-state copy when `!hasData`.
- **Proof:** live toggle → `SELECT * FROM risk_events` shows the row → console widget re-fetches → number ticks. Screenshot + SQL in reply.

### 1b · AI usage → `ai_runs`
- Audit AI call-sites: `orca-coach` (edge, has partial logging already), `ai-insights-deep.ts`, `ai-engine.ts`, `psychology-diagnostic.ts`, any other `lovable-ai-gateway` fetch.
- One shared logger `logAiRun({ feature, model, tokens_in, tokens_out, latency_ms, ok, error })` — used from edge functions with service-role client, and (where the call is client-side) via an RLS-friendly insert with `user_id = auth.uid()`.
- Wire every call-site. Report full list in the proof.
- **Proof:** run one real coach call → row in `ai_runs` → `admin_ai_usage` returns it → console shows it.

### 1c · A3 placeholders — verdicts
For each of Churn / conversion trend / TTFT / diagnostic→tier: either wire to a real source or replace with an explicit "requires event collection — not active yet" empty state. No number that looks real unless it is real. Decisions listed in the reply.

## Phase 2 — Validation matrix (next turn)

Screens 1–8 of 16. Full per-element table using your exact columns: `Screen | Element | RPC | RPC field | DB source column | Live value | Direct-query cross-check | PASS/FAIL + fix`. Every FAIL fixed in the same turn. Empty/window/RTL checks included per element.

## Phase 3 — Validation matrix cont'd (turn after)

Screens 9–16 same format.

## Phase 4 — Visual/UX sweep

B2 + B3 across he/en, both themes, desktop + mobile-shell. Every bug fixed in-turn.

## Technical notes

- **No `now()` backfills.** Existing kill-switch state in IndexedDB has no reliable original timestamp — I will NOT synthesize one. From migration forward, every toggle writes a real event.
- **Admin RPCs stay stable.** New fields are additive; existing consumers keep working.
- **RLS discipline:** `risk_events` uses `auth.uid()`-scoped policies + admin read via `has_role`. No anon grant.

## What I need from you

Just "go" — I'll start Phase 1 immediately. If you'd rather I collapse Phase 2+3 into one giant matrix turn (higher risk of missing things), say so.
