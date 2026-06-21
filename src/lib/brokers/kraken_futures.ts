/**
 * Kraken Futures Broker Adapter (client-side wrapper).
 *
 * Server-side sync lives in `sync-futures-trades` (dispatched by
 * provider === 'kraken_futures'). Kraken only exposes fills, so the edge
 * function runs a generalised FIFO reconstruction (long + short) over the
 * /api/v3/fills feed. Short positions open via SELL fills are tracked
 * symmetrically to long positions opening via BUY fills.
 *
 * Read-only posture: Kraken does not expose per-key permission introspection
 * via the futures API, so verify-exchange-credential performs a benign
 * signed read to prove the key is valid + signs correctly. ORCA has no
 * order/withdraw code path on any provider, so even a mistakenly write-
 * capable key is never exercised for writes.
 */

import { BrokerRegistry } from "./registry";
import type {
  ApiAdapterInput,
  BrokerAdapter,
  DetectResult,
  NormalizedTrade,
  OpenPosition,
} from "./types";

export const krakenFuturesAdapter: BrokerAdapter = {
  meta: {
    id: "kraken_futures",
    name: "Kraken Futures",
    kind: "api",
    assetClasses: ["crypto"],
    accent: "#7132f5",
    gradient:
      "linear-gradient(135deg, rgba(113,50,245,0.18), rgba(113,50,245,0.04))",
    supportsSync: true,
    tagline: {
      he: "FIFO גנרי על fills — לונג ושורט",
      en: "Generalised FIFO over fills — long & short",
    },
  },

  async detectFormat(input): Promise<DetectResult> {
    if ("brokerHint" in input && input.brokerHint === "kraken_futures") {
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

BrokerRegistry._register(krakenFuturesAdapter);
