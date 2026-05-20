/**
 * Binance Broker Adapter (client-side wrapper).
 *
 * Like Bybit, Binance HMAC signing requires the API secret which lives in the
 * Supabase Vault. The actual REST calls are performed by the
 * `sync-futures-trades` edge function, dispatched by `provider === 'binance'`.
 *
 * This client adapter exists purely so the registry has a complete entry —
 * branding, detection, and an empty `normalizeTrades` (edge function writes
 * provenance rows directly via service-role client).
 */

import { BrokerRegistry } from "./registry";
import type {
  ApiAdapterInput,
  BrokerAdapter,
  DetectResult,
  NormalizedTrade,
  OpenPosition,
} from "./types";

export const binanceAdapter: BrokerAdapter = {
  meta: {
    id: "binance",
    name: "Binance",
    kind: "api",
    assetClasses: ["crypto"],
    accent: "#f3ba2f",
    gradient: "linear-gradient(135deg, rgba(243,186,47,0.18), rgba(243,186,47,0.04))",
    supportsSync: true,
    tagline: {
      he: "סנכרון USDT-M Futures דרך realized PnL",
      en: "USDT-M Futures sync via realized PnL stream",
    },
  },

  async detectFormat(input): Promise<DetectResult> {
    if ("brokerHint" in input && input.brokerHint === "binance") {
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

BrokerRegistry._register(binanceAdapter);
