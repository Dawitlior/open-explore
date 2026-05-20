/**
 * Manual Trade Adapter
 *
 * Wraps trades created by hand in the Journal / Trade Entry forms so they
 * flow through the same dispatcher contract as everything else. The actual
 * persistence path for manual entries still goes through `useTrades.addTrade`
 * today; this adapter exists so:
 *   • The registry lists "manual" as a first-class source.
 *   • Future "manual bulk paste" or "import from screenshot" features can
 *     stream their trades into the same StorageManager.
 */

import { BrokerRegistry } from "./registry";
import type { BrokerAdapter, NormalizedTrade } from "./types";

export const manualAdapter: BrokerAdapter = {
  meta: {
    id: "manual",
    name: "Manual",
    kind: "hybrid",
    assetClasses: ["crypto", "fx", "equities", "futures", "options", "other"],
    accent: "#94a3b8",
    tagline: {
      he: "רישום ידני של עסקאות",
      en: "Hand-entered trades",
    },
  },

  async detectFormat(input) {
    if ("brokerHint" in input && input.brokerHint === "manual") {
      return { matches: true, confidence: 3 };
    }
    return { matches: false, confidence: 0 };
  },

  async *normalizeTrades(): AsyncIterable<NormalizedTrade> {
    // Manual entries are constructed in form components and handed directly
    // to `useTrades.addTrade` / `upsertJournalTrade`. This stub keeps the
    // contract complete without re-routing those well-tested paths.
    return;
  },

  aggregatePositions(fills) {
    return fills;
  },
};

BrokerRegistry._register(manualAdapter);
