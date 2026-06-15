
## Goal

Drop the canonical UIE (Universal Import Engine) from `ORCA_UIE_COMPLETE.md` into the platform exactly as written, route file uploads through it behind a feature flag, and replace the "balance from 0" lie with the equity points read from the file. Old parsers stay in the code, switched off, until validated. Writer-layer bugs (renumber, dual write paths) are explicitly out of scope for this commit.

## Iron Rules (from the master doc)

- Restore all 13 UIE files verbatim. No "improvements", no shortening, no extra dependencies.
- Only `src/lib/uie/adapters/to-journal.ts` is editable — it's already targeted at our `Trade`/`NormalizedTrade` schema.
- Never invent data. If a number isn't in the file and can't be derived, leave it empty and report it.
- Don't touch `parseBrokerCsvRaw` / `importFromXlsx` in this commit — flag-gate around them.
- Don't touch `useTrades.importTrades` renumber logic or the dual write paths in this commit.

---

## Commit Scope — Three Approval Gates

Work stops at each gate until you say "continue".

### Stage 1 — Engine drop-in + read-only Preflight (this commit's main body)

**1.1 Create `src/lib/uie/` with all 13 files copied verbatim:**

```text
src/lib/uie/
  index.ts
  types.ts
  pipeline.ts
  dictionary/canonical-fields.ts
  matching/normalize.ts
  matching/values.ts
  matching/profiling.ts
  matching/tiers.ts
  matching/resolve.ts
  structure/structure.ts
  reconstruction/reconstruction.ts
  delivery/delivery.ts
  adapters/to-journal.ts
```

No edits to any file. Zero new npm dependencies (SheetJS + PapaParse are already in the project).

**1.2 Feature flag:** add `UIE_ENABLED` (default `true` in dev, controllable via `localStorage.uie_enabled` for kill-switch). Lives in a tiny `src/lib/uie/flag.ts`.

**1.3 File→sheets adapter** at `src/lib/uie/io.ts` (thin edge wrapper only, not core):
- `fileToSheets(file: File): Promise<SheetInput[]>` — branches on extension/MIME: `xlsx`/`xls` → SheetJS `sheet_to_json({header:1, raw:false, defval:''})` over every sheet; `csv` → PapaParse.

**1.4 Route the two import entry points** (`src/pages/Index.tsx` XLSX upload, `src/components/trading/ExchangesPanel.tsx` CSV upload) through a new function `runImportWithPreflight(file)`:
- When flag ON: `fileToSheets` → `runImport(sheets)` → open `ImportPreflightModal` with the `ImportResult`.
- When flag OFF: fall through to the existing `importFromXlsx` / `parseBrokerCsvRaw` path untouched.
- Old code is **not** deleted.

**1.5 Read-only `ImportPreflightModal` (Stage 1 UI):**
- Dark Terminal aesthetic, Hebrew RTL + English, Poppins + IBM Plex Mono.
- Three panels:
  1. **Mapping table:** per source column → mapped canonical field → 🟢/🟡/🔴 confidence chip (auto / suggested / unmapped) → evidence list from `FieldMatch.evidence[]`.
  2. **Gap report:** `readiness` 0-100 ring + `gap.items` (he/en) with severity badges. Counts row underneath: closed / open / equity events / skipped / duplicates.
  3. **Equity preview:** the `equityEvents` read from the file, labelled "Balance from file — source of truth". If empty, render explicit "No balance data in file — P&L chart will be cumulative-from-0, not real equity."
- No editing controls in Stage 1. Two buttons: **"Confirm & Import"** and **"Cancel"**.
- On Confirm: map `result.trades` via existing `toLegacyTrade(...)` from `adapters/to-journal.ts`, push through `useTrades.importTrades` (unchanged), then call `toEquityPoints(result.equityEvents)` and persist those points so the equity chart consumes them.

**1.6 Balance source-of-truth wiring (no writer refactor):**
- Add `src/lib/uie/equity-store.ts` — a thin per-user store (Supabase table or local first, decided by what's already wired) that holds `{date, amount, source:'file'}` points.
- The Balance/Equity chart reads from this store first; if it has points, they override the from-0 cumulative line. If it doesn't, the existing from-0 line stays but is labelled "P&L cumulative (no balance data)".
- No change to `recalcBalances` inside `useTrades`.

**STOP. Wait for your approval before Stage 2.**

---

### Stage 2 — Manual mapping editor

Only after Stage 1 is approved.
- Add a dropdown per mapping row in the Preflight modal: change canonical target, or "Ignore column".
- Re-run downstream derivation locally on edit (call back into `pipeline` helpers — no core edits).
- "Reset to auto" button. "Re-validate" recomputes the gap report inline.

**STOP. Wait for approval before Stage 3.**

---

### Stage 3 — Fix Actions + fingerprint memory

Only after Stage 2 is approved.
- Fix Actions panel: manual map / set fixed value / mark as open positions / download CSV template / skip.
- Fingerprint store: hash header signature → save accepted mapping; auto-load on next file with the same signature.

---

## Explicitly Out of Scope (separate commit later, on your call)

- Removing/deleting `parseBrokerCsvRaw` / `importFromXlsx`.
- Fixing `useTrades.importTrades` renumber that overwrites existing `trade_id` and breaks `__JID:xxx__` links.
- Consolidating the two write paths (legacy `saveTrades` vs unused `StorageManager`).
- Enforcing idempotency on `external_id` at the writer.

These will be addressed only after the UIE is validated against your real files and you've approved.

---

## Acceptance Criteria — Stage 1

- All 13 files exist under `src/lib/uie/` byte-identical to the master doc.
- `UIE_ENABLED=false` → upload behaviour is identical to today.
- `UIE_ENABLED=true` → upload opens Preflight modal showing mapping + gap + equity preview, never auto-imports.
- Confirming Preflight produces trades in the journal AND, when the file has balance data, the equity chart renders the file's points (not the from-0 line).
- No console errors, no new npm packages, no edits inside `src/lib/uie/matching|structure|reconstruction|delivery|pipeline`.
