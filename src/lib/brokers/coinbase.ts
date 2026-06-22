/**
 * Coinbase Advanced Trade Broker Adapter (client-side wrapper).
 *
 * Server-side sync lives in `sync-futures-trades` (dispatched by
 * provider === 'coinbase'). Coinbase exposes user fills via
 * `/api/v3/brokerage/orders/historical/fills`; reconstruction is the
 * generalised spot FIFO with §3.1 proportional fees.
 *
 * CDP credential shape (special-cased throughout):
 *   - "API Key" is a key NAME of the form `organizations/{org}/apiKeys/{id}`
 *     (contains slashes — the default sanitizer would reject it).
 *   - "API Secret" is a MULTI-LINE PEM private key (Ed25519 PKCS8
 *     recommended, ECDSA SEC1 also supported) — must include the
 *     `BEGIN PRIVATE KEY` / `END PRIVATE KEY` lines.
 *
 * Auth is JWT (EdDSA / ES256), not HMAC. The edge verifier signs with
 * `jose` and passes `Authorization: Bearer <jwt>`. Read-only posture is
 * structural: we only ever GET, never POST orders.
 */

import { BrokerRegistry } from "./registry";
import type {
  ApiAdapterInput,
  BrokerAdapter,
  DetectResult,
  NormalizedTrade,
  OpenPosition,
} from "./types";

export const coinbaseAdapter: BrokerAdapter = {
  meta: {
    id: "coinbase",
    name: "Coinbase",
    kind: "api",
    assetClasses: ["crypto"],
    accent: "#0052ff",
    gradient:
      "linear-gradient(135deg, rgba(0,82,255,0.18), rgba(0,82,255,0.04))",
    supportsSync: true,
    tagline: {
      he: "סנכרון אוטומטי של עסקאות סגורות (ספוט)",
      en: "Auto-sync of closed spot trades",
    },
  },

  async detectFormat(input): Promise<DetectResult> {
    if ("brokerHint" in input && input.brokerHint === "coinbase") {
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

BrokerRegistry._register(coinbaseAdapter);
