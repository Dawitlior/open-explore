/**
 * MEXC Spot Broker Adapter (client-side wrapper).
 *
 * Real work happens server-side in `sync-futures-trades` (dispatched by
 * provider === 'mexc_spot'). MEXC Spot has no account-wide trade endpoint,
 * so the edge function reconstructs closed lots via FIFO over per-symbol
 * /api/v3/myTrades fills. Symbol discovery is best-effort: non-zero balance
 * pairs (USDT-quoted) are auto-detected; users can also pre-list pairs.
 *
 * Read-only and 90-day expiry caveats are the same as MEXC Futures —
 * see mexc_futures.ts header.
 */

import { BrokerRegistry } from "./registry";
import type {
  ApiAdapterInput,
  BrokerAdapter,
  DetectResult,
  NormalizedTrade,
  OpenPosition,
} from "./types";

export const mexcSpotAdapter: BrokerAdapter = {
  meta: {
    id: "mexc_spot",
    name: "MEXC Spot",
    kind: "api",
    assetClasses: ["crypto"],
    accent: "#00b3ff",
    gradient:
      "linear-gradient(135deg, rgba(0,179,255,0.18), rgba(0,179,255,0.04))",
    supportsSync: true,
    tagline: {
      he: "FIFO על myTrades — לוטים סגורים לפי צמדים",
      en: "FIFO over myTrades — closed lots per symbol",
    },
  },

  async detectFormat(input): Promise<DetectResult> {
    if ("brokerHint" in input && input.brokerHint === "mexc_spot") {
      return { matches: true, confidence: 3, reason: "explicit_id" };
    }
    return { matches: false, confidence: 0 };
  },

  async *normalizeTrades(_input: ApiAdapterInput): AsyncIterable<NormalizedTrade> {
    return;
  },

  aggregatePositions(fills: NormalizedTrade[]): NormalizedTrade[] {
    return fills;
  },

  async fetchOpenPositions(_input: ApiAdapterInput): Promise<OpenPosition[]> {
    return [];
  },
};

BrokerRegistry._register(mexcSpotAdapter);
