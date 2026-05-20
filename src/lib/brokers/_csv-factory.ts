/**
 * Generic CSV/XLSX Broker Adapter Factory
 *
 * A single shared parser (xlsx-engine's HEADER_MAP + dynamic header detection)
 * fronts every CSV-only broker tile. Each tile registers one tiny adapter
 * instance via `createCsvAdapter({ id, name, accent, ... })`.
 *
 * When a broker eventually needs a SIGNATURE parser (IBKR Flex XML, MT5 fills,
 * Sierra .txt) we'll create a dedicated adapter file with its own
 * `normalizeTrades` implementation — the factory below is the universal
 * starting point.
 */

import { parseBrokerCsvRaw } from "@/lib/xlsx-engine";
import type {
  AssetClass,
  BrokerAdapter,
  BrokerMeta,
  DetectResult,
  FileAdapterInput,
  NormalizedTrade,
} from "./types";

export interface CsvAdapterConfig {
  id: string;
  name: string;
  accent: string;
  glyph?: string;
  tagline: { he: string; en: string };
  assetClasses?: AssetClass[];
  /** Broker-specific header signature for confident auto-detection. */
  signatureHeaders?: string[];
}

function stableExternalId(
  brokerId: string,
  accountLabel: string | null,
  t: {
    coin: string;
    direction: string;
    date: string;
    entry: number;
    exit: number;
    pnl: number;
    positionSize: number;
  },
  idx: number,
): string {
  // Deterministic, idempotent across re-imports of the same file.
  const parts = [
    brokerId,
    accountLabel ?? "_",
    t.coin,
    t.direction,
    t.date,
    String(t.entry),
    String(t.exit),
    String(t.pnl),
    String(t.positionSize),
    String(idx),
  ];
  return `csv:${brokerId}:${hashString(parts.join("|"))}`;
}

// Tiny non-cryptographic 32-bit hash. Good enough for dedup-key generation.
function hashString(s: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

export function createCsvAdapter(cfg: CsvAdapterConfig): BrokerAdapter {
  const meta: BrokerMeta = {
    id: cfg.id,
    name: cfg.name,
    kind: "file",
    assetClasses: cfg.assetClasses ?? ["other"],
    accent: cfg.accent,
    tagline: cfg.tagline,
  };

  return {
    meta,

    async detectFormat(input): Promise<DetectResult> {
      if ("brokerHint" in input) {
        return input.brokerHint === cfg.id
          ? { matches: true, confidence: 3, reason: "explicit_id" }
          : { matches: false, confidence: 0 };
      }
      // Without a signature, generic CSVs all look alike — confidence 1 lets
      // any one of them claim the file when the user hasn't picked a broker.
      const headers = input.headers ?? [];
      if (cfg.signatureHeaders?.some((sig) =>
        headers.some((h) => h.toLowerCase().includes(sig.toLowerCase())),
      )) {
        return { matches: true, confidence: 3, reason: "signature_hit" };
      }
      return { matches: true, confidence: 1, reason: "generic_csv" };
    },

    async *normalizeTrades(input): AsyncIterable<NormalizedTrade> {
      // File input only — API mode isn't applicable to CSV adapters.
      if (!("file" in input)) return;
      const accountLabel =
        ("accountLabel" in input && (input as { accountLabel?: string }).accountLabel) ||
        null;

      const rawTrades = await parseBrokerCsvRaw(input.file);
      let idx = 0;
      for (const t of rawTrades) {
        const dateMs = Date.parse((t.date || "").replace(" ", "T")) || Date.now();
        const isoClose = new Date(dateMs).toISOString();
        const incomingSL = t.stopLoss;
        const hasRealSL =
          typeof incomingSL === "number" &&
          isFinite(incomingSL) &&
          incomingSL !== 0;

        const direction: "Long" | "Short" =
          t.direction === "Short" ? "Short" : "Long";

        yield {
          external_id: stableExternalId(cfg.id, accountLabel, t, idx++),
          broker_id: cfg.id,
          account_label: accountLabel,
          source_type: "csv_import",
          asset_class: (cfg.assetClasses?.[0] as AssetClass) ?? "other",
          symbol: t.coin,
          direction,
          entry: t.entry,
          exit: t.exit,
          // Preserve real stop-loss when the broker file supplies one;
          // otherwise null so the Dual-Currency Engine stays in Money mode.
          stop_loss: hasRealSL ? incomingSL : null,
          size: t.positionSize / (t.entry || 1),
          leverage: t.leverage || 1,
          pnl: t.pnl,
          fees: 0,
          opened_at: isoClose,
          closed_at: isoClose,
          raw: { ...t, _brokerTile: cfg.id, _accountLabel: accountLabel },
        };
      }
    },

    aggregatePositions(fills: NormalizedTrade[]): NormalizedTrade[] {
      // CSV broker tiles already export aggregated trades by convention.
      // IBKR/MT5 fill-level adapters will override this when introduced.
      return fills;
    },
  };
}
