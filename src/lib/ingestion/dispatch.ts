/**
 * Dispatcher — the single entry point for ingesting trades from anywhere.
 *
 * Flow:
 *   ingest()
 *     → BrokerRegistry.detect/byId
 *       → adapter.normalizeTrades() (AsyncIterable)
 *         → StorageManager.persist()
 *
 * No caller writes to public.trades directly. Ever.
 */

import { BrokerRegistry } from "@/lib/brokers/registry";
import type { ApiAdapterInput, SourceType } from "@/lib/brokers/types";
import { StorageManager, type IngestReport } from "./storage-manager";

export type IngestSource =
  | {
      kind: "file";
      file: File;
      brokerIdHint?: string;
      accountLabel?: string | null;
    }
  | ({
      kind: "api";
      brokerId: string;
      accountLabel?: string | null;
    } & Omit<ApiAdapterInput, "accountLabel">);

export async function ingest(source: IngestSource): Promise<IngestReport> {
  const adapter =
    source.kind === "file"
      ? source.brokerIdHint
        ? BrokerRegistry.byId(source.brokerIdHint)
        : await BrokerRegistry.detectFile({ file: source.file })
      : BrokerRegistry.byId(source.brokerId);

  if (!adapter) {
    return {
      ok: false,
      reason: "no_adapter_matched",
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };
  }

  const input =
    source.kind === "file"
      ? { file: source.file }
      : {
          apiKey: source.apiKey,
          apiSecret: source.apiSecret,
          mode: source.mode,
          since: source.since,
          symbol: source.symbol,
          accountLabel: source.accountLabel ?? null,
        };

  const stream = adapter.normalizeTrades(input);

  const sourceType: SourceType =
    source.kind === "file" ? "csv_import" : "api_sync";

  return StorageManager.persist(stream, {
    broker_id: adapter.meta.id,
    account_label: source.accountLabel ?? null,
    source_type: sourceType,
  });
}
