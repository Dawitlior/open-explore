/**
 * In-memory TTL cache for economic_events queries.
 *
 * Purpose: `economic_events` is a GLOBAL table (no per-user RLS scoping in the
 * read path) yet the slow-query log shows it is the single hottest query in
 * the platform — every hook mount issues another range scan against it.
 *
 * At 10K concurrent users this multiplies into tens of thousands of identical
 * round-trips per minute. Caching the result keyed by the query window (with
 * a short TTL) collapses N identical fetches into one, with zero behavioral
 * change for the caller. Realtime invalidation still flushes the cache so
 * fresh data appears within seconds when the sync function writes new rows.
 *
 * Safe by construction:
 *   - Process-scoped (one user / one tab), so no cross-user leakage.
 *   - TTL bounded (default 60s) — stale data window is tiny.
 *   - Public events only; no PII or per-user data.
 */

type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 60_000;

export function getCached<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

/**
 * Coalesce concurrent requests for the same key into a single in-flight
 * promise. Subsequent callers attach to the existing promise instead of
 * issuing a duplicate request.
 */
export async function dedupe<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = loader().finally(() => { inflight.delete(key); });
  inflight.set(key, p);
  return p;
}

export function invalidateEconomicCache(): void {
  store.clear();
}
