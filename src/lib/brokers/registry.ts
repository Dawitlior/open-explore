/**
 * Broker Registry — single source of truth.
 *
 * To add a new broker:
 *   1. Create src/lib/brokers/<id>.ts implementing BrokerAdapter.
 *   2. Import & push it into ADAPTERS below.
 * Nothing else in the app should need to change.
 */

import type {
  BrokerAdapter,
  FileAdapterInput,
} from "./types";

// Adapters will be registered here as Phase 1+ ports each broker.
// Keep this array as the ONLY mutation point.
const ADAPTERS: BrokerAdapter[] = [];

export const BrokerRegistry = {
  all(): BrokerAdapter[] {
    return ADAPTERS.slice();
  },

  byId(id: string): BrokerAdapter | null {
    return ADAPTERS.find((a) => a.meta.id === id) ?? null;
  },

  apiCapable(): BrokerAdapter[] {
    return ADAPTERS.filter((a) => a.meta.kind !== "file");
  },

  fileCapable(): BrokerAdapter[] {
    return ADAPTERS.filter((a) => a.meta.kind !== "api");
  },

  /** Auto-detect the best adapter for an unknown file upload. */
  async detectFile(input: FileAdapterInput): Promise<BrokerAdapter | null> {
    const scored = await Promise.all(
      BrokerRegistry.fileCapable().map(async (a) => ({
        adapter: a,
        result: await a.detectFormat(input),
      })),
    );
    const winner = scored
      .filter((s) => s.result.matches)
      .sort((x, y) => y.result.confidence - x.result.confidence)[0];
    return winner?.adapter ?? null;
  },

  /** Internal — used by adapter modules to self-register. */
  _register(adapter: BrokerAdapter): void {
    if (ADAPTERS.some((a) => a.meta.id === adapter.meta.id)) return;
    ADAPTERS.push(adapter);
  },
};
