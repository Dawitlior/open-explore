/**
 * Gate.io USDT-M Futures Broker Adapter (client-side wrapper).
 *
 * Server-side sync lives in `sync-futures-trades` (dispatched by
 * provider === 'gate_futures'). Gate exposes a dedicated closed-position
 * endpoint, so reconstruction is one record → one trade — no FIFO needed.
 *
 * Read-only posture: Gate does not expose per-key permission introspection,
 * so verify-exchange-credential performs a benign signed read to prove the
 * key is valid + signs correctly. ORCA has no order/withdraw code path on
 * any provider, so even a mistakenly write-capable key is never exercised.
 *
 * Key lifetime: Gate keys without IP-binding expire after 90 days (same as
 * MEXC). Supabase Edge has no fixed egress IP, so the guide instructs the
 * user NOT to IP-bind.
 */

import { BrokerRegistry } from "./registry";
import type {
  ApiAdapterInput,
  BrokerAdapter,
  DetectResult,
  NormalizedTrade,
  OpenPosition,
} from "./types";

export const gateFuturesAdapter: BrokerAdapter = {
  meta: {
    id: "gate_futures",
    name: "Gate.io Futures",
    kind: "api",
    assetClasses: ["crypto"],
    accent: "#2354e6",
    gradient:
      "linear-gradient(135deg, rgba(35,84,230,0.18), rgba(35,84,230,0.04))",
    supportsSync: true,
    tagline: {
      he: "סנכרון אוטומטי של עסקאות סגורות",
      en: "Auto-sync of closed positions",
    },
  },

  async detectFormat(input): Promise<DetectResult> {
    if ("brokerHint" in input && input.brokerHint === "gate_futures") {
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

BrokerRegistry._register(gateFuturesAdapter);
