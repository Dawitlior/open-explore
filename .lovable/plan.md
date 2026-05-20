
# Orca OS — Broker-Agnostic Adapter Architecture

A professional, scalable refactor that turns every data source (Bybit, Binance, IBKR, MT5, NinjaTrader, …) into a swappable module behind one unified pipeline. Adding a new broker becomes "drop a file in `src/lib/brokers/`" — no edits to storage, no edits to the dispatcher.

---

## 1. The BrokerAdapter Interface

A single TypeScript contract every broker must implement — works identically for REST/WebSocket exchanges and CSV/XLSX file imports. The discriminator (`kind`) tells the dispatcher which entry points the adapter supports; everything else is symmetric.

```text
src/lib/brokers/types.ts
```

```ts
export type BrokerKind = 'api' | 'file' | 'hybrid';
export type SourceType = 'api_sync' | 'csv_import' | 'manual';

export interface BrokerMeta {
  id: string;              // 'bybit' | 'binance' | 'ibkr' | 'mt5' | …
  name: string;            // 'Bybit'
  kind: BrokerKind;
  assetClasses: ('crypto'|'fx'|'equities'|'futures'|'options')[];
  accent: string;          // brand color (UI)
  tagline: { he: string; en: string };
}

export interface RawFill {
  // Whatever the broker hands us — kept as `unknown` per-adapter shape.
  // Adapters cast internally; the dispatcher never inspects this.
  [k: string]: unknown;
}

export interface NormalizedTrade {
  // Pure broker-agnostic shape — the canonical Orca Trade plus provenance.
  // Persisted 1:1 into public.trades (see §3 schema).
  external_id: string;        // exchange_exec_id / row hash for CSV
  broker_id: string;
  account_label: string | null;
  source_type: SourceType;
  asset_class: 'crypto'|'fx'|'equities'|'futures'|'options'|'other';
  symbol: string;
  direction: 'Long' | 'Short';
  entry: number;
  exit: number;
  stop_loss: number | null;   // null = R-Multiples not computable
  size: number;
  leverage: number;
  pnl: number;                // net of fees
  fees: number;
  opened_at: string;          // ISO
  closed_at: string;          // ISO
  raw: RawFill;               // verbatim payload for forensic replay
}

export interface DetectResult {
  matches: boolean;
  confidence: 0 | 1 | 2 | 3; // 0=no, 3=signature columns present
  reason?: string;
}

// CSV/file path
export interface FileAdapterInput {
  file: File;
  parsedRows?: unknown[];     // pre-parsed by XLSX engine (optional shortcut)
  headers?: string[];
}

// API path
export interface ApiAdapterInput {
  apiKey: string;
  apiSecret: string;
  mode: 'bulk' | 'incremental';
  since?: number;             // epoch ms
  symbol?: string;            // incremental only
}

export interface OpenPosition {
  broker_id: string;
  account_label: string | null;
  symbol: string;
  side: 'Long' | 'Short';
  size: number;
  entry_price: number;
  unrealized_pnl: number;
  captured_at: string;
}

export interface BrokerAdapter {
  readonly meta: BrokerMeta;

  // 1. Identify whether THIS adapter can handle a given file/payload.
  //    For API adapters, called with brokerId hint only.
  detectFormat(input: FileAdapterInput | { brokerHint: string }): Promise<DetectResult>;

  // 2. Pull or read raw fills, then map each one into the canonical shape.
  //    File adapters parse the file. API adapters do signed HTTP + paginate.
  //    Returns an iterable so huge datasets stream instead of buffering.
  normalizeTrades(
    input: FileAdapterInput | ApiAdapterInput,
  ): AsyncIterable<NormalizedTrade>;

  // 3. Optional — fold execution-level fills into closed positions when
  //    the source only exports fills (IBKR, MT5). API adapters that already
  //    return aggregated trades (Bybit closed-pnl) can return the input as-is.
  aggregatePositions(fills: NormalizedTrade[]): NormalizedTrade[];

  // 4. Optional — for live exchanges, mirror open positions.
  fetchOpenPositions?(input: ApiAdapterInput): Promise<OpenPosition[]>;
}
```

**Key design choices**
- `normalizeTrades` returns an **AsyncIterable** so the dispatcher can stream-upsert in batches — important for IBKR Flex Reports that can hold 10k+ fills.
- `raw` is kept on every NormalizedTrade for forensic replay & re-normalization without a re-sync.
- `external_id` replaces today's scattered `exchange_exec_id` + comment-tag hacks. For CSVs, the adapter computes a deterministic hash (`broker|account|symbol|opened_at|size|pnl`) so re-imports are idempotent.

---

## 2. The Broker Registry

Centralized auto-registration. Adding a broker = create one file, export the adapter, done.

```text
src/lib/brokers/
  ├─ types.ts
  ├─ registry.ts          ← single source of truth
  ├─ bybit.ts             ← existing logic, refactored behind the interface
  ├─ binance.ts
  ├─ ibkr.ts
  ├─ mt5.ts
  ├─ ninjatrader.ts
  └─ … one file per broker
```

```ts
// registry.ts
import type { BrokerAdapter } from './types';
import { bybitAdapter } from './bybit';
import { binanceAdapter } from './binance';
import { ibkrAdapter } from './ibkr';
// …

const ADAPTERS: BrokerAdapter[] = [bybitAdapter, binanceAdapter, ibkrAdapter /*…*/];

export const BrokerRegistry = {
  all: () => ADAPTERS,
  byId: (id: string) => ADAPTERS.find(a => a.meta.id === id) ?? null,
  apiCapable: () => ADAPTERS.filter(a => a.meta.kind !== 'file'),
  fileCapable: () => ADAPTERS.filter(a => a.meta.kind !== 'api'),

  // Auto-detect best file adapter for an unknown CSV/XLSX upload.
  async detectFile(input: FileAdapterInput): Promise<BrokerAdapter | null> {
    const scored = await Promise.all(
      BrokerRegistry.fileCapable().map(async a => ({
        a, r: await a.detectFormat(input),
      })),
    );
    const best = scored
      .filter(s => s.r.matches)
      .sort((x, y) => y.r.confidence - x.r.confidence)[0];
    return best?.a ?? null;
  },
};
```

**Same registry runs in both worlds**: the React client imports it for file uploads, and the edge function imports a Deno-compatible mirror (`supabase/functions/_shared/brokers/`) for API syncs. Adapter logic stays pure (no DOM, no Deno-only APIs) so the file is literally shared via a thin re-export.

The UI's `PROVIDERS` and `CSV_BROKERS` arrays in `ExchangesPanel.tsx` are deleted — replaced by `BrokerRegistry.all().filter(a => a.meta.kind === …)`.

---

## 3. Schema Refactor — Killing Source Leakage

Today provenance lives in three messy places:
- `data.exchange_provider` (jsonb, Bybit only)
- `data.exchange_exec_id` (jsonb, promoted to a generated column)
- `comments` text prefix `"Broker:ibkr"` (CSV path)

Move it to **first-class columns**.

### Target `public.trades` shape

```sql
ALTER TABLE public.trades
  ADD COLUMN broker_id      text,
  ADD COLUMN account_label  text,
  ADD COLUMN source_type    text CHECK (source_type IN ('api_sync','csv_import','manual')),
  ADD COLUMN asset_class    text,
  ADD COLUMN external_id    text,
  ADD COLUMN opened_at      timestamptz,
  ADD COLUMN closed_at      timestamptz;

-- Indexes for the queries we'll actually run
CREATE INDEX trades_user_broker_idx       ON public.trades(user_id, broker_id);
CREATE INDEX trades_user_closedat_idx     ON public.trades(user_id, closed_at DESC);
CREATE UNIQUE INDEX trades_user_external_uidx
  ON public.trades(user_id, broker_id, account_label, external_id)
  WHERE external_id IS NOT NULL;
```

`data` jsonb **stays** — it remains the canonical shape for client analytics. The new columns are a queryable projection.

### Safe data migration (zero data loss)

Run in **three reversible steps**, each in its own migration:

1. **Additive**: add the columns nullable, no constraints. Deploy.
2. **Backfill** with a single `UPDATE` derived from existing `data` jsonb + `comments`:
   ```sql
   UPDATE public.trades SET
     broker_id    = COALESCE(data->>'exchange_provider',
                             substring(data->>'comments' from 'Broker:([a-z0-9_]+)'),
                             'manual'),
     source_type  = CASE
                      WHEN data->>'exchange_provider' IS NOT NULL THEN 'api_sync'
                      WHEN data->>'comments' LIKE 'Broker:%'      THEN 'csv_import'
                      ELSE 'manual'
                    END,
     external_id  = data->>'exchange_exec_id',
     opened_at    = NULLIF(data->>'date','')::timestamptz,
     closed_at    = NULLIF(data->>'date','')::timestamptz,
     account_label = NULL,
     asset_class   = NULL
   WHERE broker_id IS NULL;
   ```
3. **Enforce** (after a release of dual-write): `ALTER COLUMN broker_id SET NOT NULL`, `ALTER COLUMN source_type SET NOT NULL`, drop the old generated `exchange_exec_id` column once nothing references it.

The wipe-by-provider logic in the Bybit edge fn changes from `filter('data->>exchange_provider', 'eq', 'bybit')` to `eq('broker_id','bybit').eq('account_label', label)` — and now correctly supports **multiple Bybit accounts per user**.

`open_positions` gets the same `account_label` treatment.

---

## 4. Pipeline Flow — The Dispatcher

No code path writes directly to `trades` anymore. Everything funnels through one Dispatcher → one StorageManager.

```text
                       ┌──────────────────────────────┐
  File drop ──────────▶│         Dispatcher           │
  API sync click ─────▶│  (src/lib/ingestion/         │
  Manual entry ───────▶│   dispatch.ts)               │
                       └─────────┬────────────────────┘
                                 │
                  ┌──────────────┼──────────────┐
                  ▼              ▼              ▼
            BrokerRegistry  Adapter.detect  Adapter.normalize
                                                │
                                                ▼  AsyncIterable<NormalizedTrade>
                                       ┌──────────────────┐
                                       │  StorageManager  │
                                       │  (single writer) │
                                       └─────────┬────────┘
                                                 ▼
                                          public.trades
                                          public.open_positions
```

### Dispatcher contract

```ts
// src/lib/ingestion/dispatch.ts
export async function ingest(source:
  | { kind: 'file'; file: File; brokerIdHint?: string; accountLabel?: string }
  | { kind: 'api'; brokerId: string; accountLabel: string; mode: 'bulk'|'incremental'; since?: number; symbol?: string }
): Promise<IngestReport> {

  const adapter = source.kind === 'file'
    ? (source.brokerIdHint ? BrokerRegistry.byId(source.brokerIdHint)
                            : await BrokerRegistry.detectFile({ file: source.file }))
    : BrokerRegistry.byId(source.brokerId);

  if (!adapter) return { ok: false, reason: 'no_adapter_matched' };

  const stream = adapter.normalizeTrades(/* mapped input */);
  return StorageManager.persist(stream, {
    broker_id: adapter.meta.id,
    account_label: source.accountLabel ?? null,
    source_type: source.kind === 'file' ? 'csv_import' : 'api_sync',
  });
}
```

### StorageManager

One module owns **every** Supabase write to `trades`. It enforces:
- Batch upserts of 500 rows
- ON CONFLICT on `(user_id, broker_id, account_label, external_id)` — idempotent forever
- Optional pre-write hook (`onBeforePersist`) for sanitization (the old `sanitizeTrade`)
- Emits `orca:trades-synced` once, after the stream drains
- Returns a structured `IngestReport { inserted, updated, skipped, errors[] }`

The Bybit edge function shrinks to ~40 lines: auth → vault read → `await ingest({ kind:'api', brokerId:'bybit', … })`. All HTTP, HMAC, pagination, and field mapping live in `brokers/bybit.ts`.

---

## 5. Execution Roadmap

Phased, each phase shippable and reversible. Bybit keeps working the entire time.

### Phase 0 — Foundation (no behavior change)
- Create `src/lib/brokers/{types.ts, registry.ts}` and `src/lib/ingestion/{dispatch.ts, storage-manager.ts}` as empty/stub files.
- Create `supabase/functions/_shared/brokers/` mirror dir.
- Add migration **Step 1** (additive columns only).

### Phase 1 — Extract Bybit into the new shape
- Port `bybitToTrade` + the closed-pnl fetcher into `brokers/bybit.ts` implementing `BrokerAdapter`.
- Wire `sync-futures-trades` to call the Dispatcher → StorageManager.
- StorageManager dual-writes: new columns **and** keeps writing `data` jsonb identically. No client change required.
- Run migration **Step 2** (backfill) — existing Bybit rows now have populated `broker_id` etc.

### Phase 2 — Migrate CSV/XLSX paths
- Port `importFromBrokerCsv` into per-broker adapters under `brokers/` (start with a generic `genericCsvAdapter` that wraps today's `HEADER_MAP`, then peel off IBKR / NinjaTrader / MT5 one at a time with real signature detection).
- `ExchangesPanel` file upload calls `ingest({ kind:'file', … })` instead of `importFromBrokerCsv` directly.
- Manual journal trades also flow through the Dispatcher with a `manualAdapter` (source_type='manual').

### Phase 3 — Multi-account & registry-driven UI
- Replace the hard-coded `PROVIDERS` / `CSV_BROKERS` arrays in `ExchangesPanel.tsx` with `BrokerRegistry.all()`.
- Surface `account_label` on credential rows; allow multiple Bybit accounts. Wipe logic in `bybitAdapter` keys on `(broker_id, account_label)`.

### Phase 4 — Add second API broker (Binance) end-to-end
- Sole task: `brokers/binance.ts`. No edge-function changes, no schema changes, no UI changes. This is the validation that the architecture works.

### Phase 5 — Enforce & cleanup
- Migration **Step 3**: `NOT NULL` constraints on `broker_id` / `source_type`, drop the old generated `exchange_exec_id` column, drop comment-prefix parsing.
- Delete the legacy `importFromBrokerCsv` and the `provider !== 'bybit'` guard.
- Add `tests/brokers/<broker>.spec.ts` with golden-file fixtures for every adapter.

### Phase 6 — IBKR & fill-aggregation
- `brokers/ibkr.ts` implements `aggregatePositions()` for the first time — folds fill-level rows into closed positions before yielding NormalizedTrades.
- Same pattern unlocks MT5, NinjaTrader, Sierra without further core changes.

---

## Outcome

After Phase 5, the answer to *"How do I add Kraken?"* is exactly one PR:
1. Create `src/lib/brokers/kraken.ts` (≈150 LOC) implementing `BrokerAdapter`.
2. Add it to the `ADAPTERS` array in `registry.ts`.
3. Ship.

No storage code touched. No dispatcher touched. No schema migration. No UI hardcoding. Every broker — API or CSV, crypto or equities — is a first-class citizen behind the same interface.
