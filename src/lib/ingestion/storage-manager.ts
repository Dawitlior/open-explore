/**
 * StorageManager — the ONLY module that writes to public.trades.
 *
 * Responsibilities:
 *   • Batch upserts (default 500 rows)
 *   • Idempotency via (user_id, broker_id, account_label, external_id)
 *   • Optional pre-write sanitization hook
 *   • Single `orca:trades-synced` event after the stream drains
 *   • Structured IngestReport return
 *
 * Phase 0: stub — implementation lands in Phase 1 alongside the Bybit port.
 */

import type { NormalizedTrade, SourceType } from "@/lib/brokers/types";

export interface PersistOptions {
  broker_id: string;
  account_label: string | null;
  source_type: SourceType;
  batchSize?: number;
  onBeforePersist?: (t: NormalizedTrade) => NormalizedTrade | null;
}

export interface IngestReport {
  ok: boolean;
  reason?: string;
  inserted: number;
  updated: number;
  skipped: number;
  errors: { external_id?: string; message: string }[];
}

export const StorageManager = {
  async persist(
    _stream: AsyncIterable<NormalizedTrade>,
    _opts: PersistOptions,
  ): Promise<IngestReport> {
    // Phase 1 will implement: drain stream → batch upsert into public.trades
    // dual-writing the canonical `data` jsonb AND the new provenance columns.
    throw new Error(
      "StorageManager.persist() is not implemented yet (Phase 1).",
    );
  },
};
