/**
 * MEXC Futures Broker Adapter (client-side wrapper).
 *
 * Real work happens server-side in `sync-futures-trades` (dispatched by
 * provider === 'mexc_futures'). This file only registers the provider so it
 * appears in the Exchanges panel with the right branding + key-guide hook.
 *
 * Note on read-only enforcement: MEXC does not expose per-key permission
 * introspection for normal user keys, so verify-exchange-credential performs
 * a benign signed read to prove the key is valid + signs correctly. ORCA has
 * no order/withdraw code path on any provider, so even a mistakenly write-
 * capable key is never exercised for writes.
 *
 * Note on key lifetime: MEXC keys without IP-binding expire after 90 days.
 * Supabase Edge has no fixed egress IP, so the guide instructs the user
 * NOT to IP-bind. A "needs renewal" UX is derived from validate failures
 * and `last_validated_at` age.
 */

import { BrokerRegistry } from "./registry";
import type {
  ApiAdapterInput,
  BrokerAdapter,
  DetectResult,
  NormalizedTrade,
  OpenPosition,
} from "./types";

export const mexcFuturesAdapter: BrokerAdapter = {
  meta: {
    id: "mexc_futures",
    name: "MEXC Futures",
    kind: "api",
    assetClasses: ["crypto"],
    accent: "#2d8cff",
    gradient:
      "linear-gradient(135deg, rgba(45,140,255,0.18), rgba(45,140,255,0.04))",
    supportsSync: true,
    tagline: {
      he: "סנכרון פוזיציות USDT-M סגורות (איחוד לפי positionId)",
      en: "USDT-M closed positions, grouped by positionId",
    },
  },

  async detectFormat(input): Promise<DetectResult> {
    if ("brokerHint" in input && input.brokerHint === "mexc_futures") {
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

BrokerRegistry._register(mexcFuturesAdapter);
