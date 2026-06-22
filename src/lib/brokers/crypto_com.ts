/**
 * Crypto.com Exchange Broker Adapter (client-side wrapper).
 *
 * Server-side sync lives in `sync-futures-trades` (dispatched by
 * provider === 'crypto_com'). Crypto.com Exchange v1 returns user fills via
 * `private/get-trades`; reconstruction is the generalised spot FIFO with
 * §3.1 proportional fees (same engine as MEXC spot / Kraken, scoped to
 * long-only spot lots).
 *
 * Read-only posture: Crypto.com does NOT expose per-key permission
 * introspection, so verify-exchange-credential performs a benign signed read
 * (`private/user-balance`) to prove the key is valid + signs correctly.
 * ORCA has no order/withdraw code path on any provider, so even a
 * mistakenly write-capable key is never exercised.
 */

import { BrokerRegistry } from "./registry";
import type {
  ApiAdapterInput,
  BrokerAdapter,
  DetectResult,
  NormalizedTrade,
  OpenPosition,
} from "./types";

export const cryptoComAdapter: BrokerAdapter = {
  meta: {
    id: "crypto_com",
    name: "Crypto.com",
    kind: "api",
    assetClasses: ["crypto"],
    accent: "#003399",
    gradient:
      "linear-gradient(135deg, rgba(0,52,153,0.18), rgba(0,52,153,0.04))",
    supportsSync: true,
    tagline: {
      he: "סנכרון אוטומטי של עסקאות סגורות (ספוט)",
      en: "Auto-sync of closed spot trades",
    },
  },

  async detectFormat(input): Promise<DetectResult> {
    if ("brokerHint" in input && input.brokerHint === "crypto_com") {
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

BrokerRegistry._register(cryptoComAdapter);
