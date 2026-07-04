/**
 * Interactive Brokers (Flex Web Service) — client-side adapter shim.
 *
 * The real work lives server-side in `sync-ibkr-flex` (Edge Function) which
 * pulls the daily Activity Flex XML, runs FIFO reconstruction, and persists
 * canonical trades. This wrapper only registers metadata + branding so the
 * ExchangesPanel renders an IBKR card automatically.
 *
 * Credential shape:
 *   api_key    = Activity Flex Query ID (plaintext by design — not a secret)
 *   api_secret = Flex Token (vaulted by the existing exchange_credentials trigger)
 */

import { BrokerRegistry } from "./registry";
import type {
  ApiAdapterInput,
  BrokerAdapter,
  DetectResult,
  NormalizedTrade,
  OpenPosition,
} from "./types";

export const ibkrFlexAdapter: BrokerAdapter = {
  meta: {
    id: "ibkr_flex",
    name: "Interactive Brokers",
    kind: "api",
    assetClasses: ["equities", "futures", "options", "fx"],
    accent: "#D91F2B",
    gradient:
      "linear-gradient(135deg, rgba(217,31,43,0.18), rgba(217,31,43,0.04))",
    supportsSync: true,
    tagline: {
      he: "סנכרון יומי אוטומטי דרך Activity Flex Query",
      en: "Daily auto-sync via Activity Flex Query",
    },
    credentialLabels: {
      accountLabel: { he: "שם לחשבון", en: "Account name" },
      apiKey: { he: "Activity Flex Query ID", en: "Activity Flex Query ID" },
      apiSecret: { he: "Flex Token", en: "Flex Token" },
      apiKeyPlaceholder: "123456",
      apiSecretPlaceholder: "XXXXXXXXXXXXXXXXXXXX",
    },
  },

  async detectFormat(input): Promise<DetectResult> {
    if ("brokerHint" in input && input.brokerHint === "ibkr_flex") {
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

BrokerRegistry._register(ibkrFlexAdapter);
