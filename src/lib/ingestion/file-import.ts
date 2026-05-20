/**
 * File Import Bridge — converts a NormalizedTrade stream from any registered
 * file adapter into legacy `Trade` objects that the existing `useTrades`
 * import pipeline (dedup → rebalance → saveTrades) consumes.
 *
 * Each produced Trade carries `__provenance` so `saveTrades` can populate the
 * new first-class columns (`broker_id`, `account_label`, `source_type`,
 * `external_id`, `asset_class`, `opened_at`, `closed_at`) on insert.
 *
 * This bridge preserves the carefully-tuned UX (chronological renumber,
 * running balance, fingerprint dedup) while ensuring 100% of imported rows
 * flow through the BrokerAdapter contract.
 */

import { BrokerRegistry } from "@/lib/brokers/registry";
import type { NormalizedTrade } from "@/lib/brokers/types";
import type { Trade } from "@/data/trades";

export type TradeWithProvenance = Trade & {
  /** Picked up by `saveTrades` and projected onto the row insert payload. */
  __provenance?: {
    broker_id: string;
    account_label: string | null;
    source_type: "api_sync" | "csv_import" | "manual";
    asset_class: string;
    external_id: string;
    opened_at: string | null;
    closed_at: string | null;
  };
};

export interface FileIngestResult {
  ok: boolean;
  brokerId: string | null;
  trades: TradeWithProvenance[];
  reason?: string;
}

function normalizedToLegacy(t: NormalizedTrade, idx: number): TradeWithProvenance {
  const dateStr = t.closed_at
    ? formatDate(new Date(t.closed_at))
    : "";
  const dayName = t.closed_at
    ? new Date(t.closed_at).toLocaleDateString("en-US", { weekday: "long" })
    : "Monday";
  const winLoss: Trade["winLoss"] =
    t.pnl > 0.05 ? "Win" : t.pnl < -0.05 ? "Loss" : "Break Even";

  return {
    id: idx + 1,
    date: dateStr,
    day: dayName,
    coin: t.symbol,
    direction: t.direction,
    orderType: "Market",
    entry: t.entry,
    stopLoss: t.stop_loss,
    exit: t.exit,
    returnR: 0,
    winLoss,
    risk: 0,
    expectedLoss: 0,
    pnl: t.pnl,
    deviation: 0,
    positionSize: t.size * t.entry,
    leverage: t.leverage || 1,
    balance: 0,
    riskPct: 0,
    rules: true,
    comments:
      typeof (t.raw as Record<string, unknown>)?.comments === "string"
        ? ((t.raw as Record<string, unknown>).comments as string)
        : "",
    __provenance: {
      broker_id: t.broker_id,
      account_label: t.account_label,
      source_type: t.source_type,
      asset_class: t.asset_class,
      external_id: t.external_id,
      opened_at: t.opened_at || null,
      closed_at: t.closed_at || null,
    },
  };
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mn = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${mn}`;
}

export async function ingestFileToTrades(
  file: File,
  options: { brokerIdHint?: string; accountLabel?: string | null } = {},
): Promise<FileIngestResult> {
  const adapter = options.brokerIdHint
    ? BrokerRegistry.byId(options.brokerIdHint)
    : await BrokerRegistry.detectFile({ file });

  if (!adapter) {
    return { ok: false, brokerId: null, trades: [], reason: "no_adapter_matched" };
  }
  if (adapter.meta.kind === "api") {
    return { ok: false, brokerId: adapter.meta.id, trades: [], reason: "adapter_is_api_only" };
  }

  const trades: TradeWithProvenance[] = [];
  let idx = 0;
  try {
    for await (const t of adapter.normalizeTrades({
      file,
      // accountLabel is passed through .raw — adapters that need it read it there.
      ...(options.accountLabel ? { accountLabel: options.accountLabel } : {}),
    } as Parameters<typeof adapter.normalizeTrades>[0])) {
      trades.push(normalizedToLegacy(t, idx++));
    }
  } catch (err) {
    return {
      ok: false,
      brokerId: adapter.meta.id,
      trades: [],
      reason: err instanceof Error ? err.message : "parse_failed",
    };
  }

  return { ok: true, brokerId: adapter.meta.id, trades };
}
