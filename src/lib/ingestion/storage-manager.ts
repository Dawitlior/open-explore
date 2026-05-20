/**
 * StorageManager — the SOLE writer to public.trades from client-side
 * ingestion paths (CSV imports, manual entry, future browser-only adapters).
 *
 * Vault-backed API exchanges (Bybit today) bypass this and write directly
 * from their edge function using the service-role client. Both paths share
 * the same dual-write contract: legacy `data` jsonb + new provenance columns.
 *
 * Semantics:
 *   • Batch upserts (default 500 rows)
 *   • Idempotency via UNIQUE INDEX on (user_id, broker_id, account_label, external_id)
 *   • User-edited fields (notes, tags, manual_r_multiple) preserved across re-syncs
 *   • One `orca:trades-synced` event after the stream drains
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  NormalizedTrade,
  SourceType,
} from "@/lib/brokers/types";
import type { Trade } from "@/data/trades";

const DEFAULT_BATCH = 500;

// Keys inside the legacy `data` jsonb that originate from the user, NOT the broker.
// These must be preserved across re-syncs.
const USER_EDITABLE_DATA_KEYS = [
  "notes",
  "tags",
  "psychology",
  "screenshots",
  "lessons",
  "comments", // user notes go here for CSV/manual paths
  "rules",
  "manualR",
] as const;

export interface PersistOptions {
  broker_id: string;
  account_label: string | null;
  source_type: SourceType;
  batchSize?: number;
  /** Optional hook to drop or transform a normalized trade before persistence. */
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

/** Project a NormalizedTrade → the legacy `data` jsonb shape the UI reads. */
function toLegacyDataBlob(
  t: NormalizedTrade,
  tradeId: number,
  runningBalance: number,
): Trade {
  const dateStr = t.closed_at
    ? new Date(t.closed_at).toISOString().slice(0, 16).replace("T", " ")
    : "";
  const dayName = t.closed_at
    ? new Date(t.closed_at).toLocaleDateString("en-US", { weekday: "long" })
    : "Monday";
  const winLoss: Trade["winLoss"] =
    t.pnl > 0.05 ? "Win" : t.pnl < -0.05 ? "Loss" : "Break Even";
  return {
    id: tradeId,
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
    balance: Math.round(runningBalance * 10000) / 10000,
    riskPct: 0,
    rules: true,
    comments:
      typeof t.raw?.comments === "string" ? (t.raw.comments as string) : "",
  };
}

function toRow(
  userId: string,
  t: NormalizedTrade,
  tradeId: number,
  runningBalance: number,
  preservedUserKeys: Record<string, unknown> | null,
) {
  const legacy = toLegacyDataBlob(t, tradeId, runningBalance);
  const data = preservedUserKeys
    ? ({ ...legacy, ...preservedUserKeys } as Trade)
    : legacy;
  return {
    user_id: userId,
    trade_id: tradeId,
    data: data as unknown as Record<string, unknown>,
    broker_id: t.broker_id,
    account_label: t.account_label,
    source_type: t.source_type,
    asset_class: t.asset_class,
    external_id: t.external_id,
    opened_at: t.opened_at || null,
    closed_at: t.closed_at || null,
  };
}

export const StorageManager = {
  async persist(
    stream: AsyncIterable<NormalizedTrade>,
    opts: PersistOptions,
  ): Promise<IngestReport> {
    const report: IngestReport = {
      ok: true,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;
    if (userErr || !userId) {
      return { ...report, ok: false, reason: "not_authenticated" };
    }

    // Allocate trade_id base from the user's current max — single round-trip.
    const { data: maxRow } = await supabase
      .from("trades")
      .select("trade_id")
      .eq("user_id", userId)
      .order("trade_id", { ascending: false })
      .limit(1)
      .maybeSingle();
    let nextId = ((maxRow?.trade_id as number | undefined) ?? 0) + 1;
    let runningBalance = 0;

    const batchSize = opts.batchSize ?? DEFAULT_BATCH;
    let buf: ReturnType<typeof toRow>[] = [];

    // Pre-fetch existing rows for this (broker, account) so we can preserve
    // user-edited fields on re-sync without an extra round-trip per row.
    // For first-time imports this returns an empty map — cost is ~one query.
    const existingByKey = new Map<string, Record<string, unknown>>();
    {
      let q = supabase
        .from("trades")
        .select("external_id, data")
        .eq("user_id", userId)
        .eq("broker_id", opts.broker_id)
        .not("external_id", "is", null);
      q = opts.account_label
        ? q.eq("account_label", opts.account_label)
        : q.is("account_label", null);
      const { data: existing } = await q;
      for (const row of existing ?? []) {
        const data = (row as { data?: Record<string, unknown> }).data;
        if (!data) continue;
        const preserved: Record<string, unknown> = {};
        for (const k of USER_EDITABLE_DATA_KEYS) {
          if (data[k] != null) preserved[k] = data[k];
        }
        if (Object.keys(preserved).length > 0) {
          existingByKey.set(String(row.external_id), preserved);
        }
      }
    }

    const flush = async () => {
      if (!buf.length) return;
      const { error, count } = await supabase
        .from("trades")
        .upsert(buf, {
          onConflict: "user_id,broker_id,account_label,external_id",
          ignoreDuplicates: false,
          count: "exact",
        });
      if (error) {
        report.errors.push({ message: error.message });
        report.ok = false;
      } else {
        report.inserted += count ?? buf.length;
      }
      buf = [];
    };

    for await (const raw of stream) {
      const t = opts.onBeforePersist ? opts.onBeforePersist(raw) : raw;
      if (!t) {
        report.skipped++;
        continue;
      }
      // Enforce provenance from the caller's options (defensive).
      const trade: NormalizedTrade = {
        ...t,
        broker_id: opts.broker_id,
        account_label: opts.account_label,
        source_type: opts.source_type,
      };
      runningBalance += trade.pnl;
      const preserved = existingByKey.get(trade.external_id) ?? null;
      buf.push(toRow(userId, trade, nextId, runningBalance, preserved));
      nextId++;
      if (buf.length >= batchSize) await flush();
    }
    await flush();

    if (report.inserted > 0 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("orca:trades-synced"));
    }
    return report;
  },
};
