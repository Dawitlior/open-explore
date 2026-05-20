/**
 * Bybit Broker Adapter (client-side wrapper).
 *
 * Bybit API keys live in Supabase Vault and HMAC signing requires the secret,
 * so the *actual* HTTP work runs server-side in `supabase/functions/sync-futures-trades`.
 * This client-side adapter exists so the registry has a complete entry for Bybit —
 * UI lists, detection, branding, and a `normalizeTrades()` that simply invokes
 * the edge function and yields zero local trades (the edge fn writes directly).
 *
 * In Phase 4 (Binance / future API brokers), per-broker logic that doesn't
 * need a vault secret can stream trades through this same adapter contract
 * end-to-end in the browser.
 */

import { BrokerRegistry } from "./registry";
import type {
  ApiAdapterInput,
  BrokerAdapter,
  DetectResult,
  NormalizedTrade,
  OpenPosition,
} from "./types";

export const bybitAdapter: BrokerAdapter = {
  meta: {
    id: "bybit",
    name: "Bybit",
    kind: "api",
    assetClasses: ["crypto"],
    accent: "#f7a600",
    tagline: {
      he: "סנכרון אוטומטי של עסקאות סגורות (180 יום)",
      en: "Auto-sync of closed positions (180-day window)",
    },
  },

  async detectFormat(input): Promise<DetectResult> {
    if ("brokerHint" in input && input.brokerHint === "bybit") {
      return { matches: true, confidence: 3, reason: "explicit_id" };
    }
    return { matches: false, confidence: 0 };
  },

  // The actual ingest happens server-side. Returning an empty async iterable
  // keeps the contract: callers can `for await` without special-casing Bybit.
  async *normalizeTrades(_input: ApiAdapterInput): AsyncIterable<NormalizedTrade> {
    // Intentionally empty — the edge function writes provenance-tagged rows
    // directly via the service-role client. StorageManager is bypassed for
    // vault-backed exchanges by design.
    return;
  },

  aggregatePositions(fills: NormalizedTrade[]): NormalizedTrade[] {
    return fills;
  },

  async fetchOpenPositions(_input: ApiAdapterInput): Promise<OpenPosition[]> {
    // Same rationale — edge fn already mirrors live open positions into
    // public.open_positions on every sync.
    return [];
  },
};

BrokerRegistry._register(bybitAdapter);
