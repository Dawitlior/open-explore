/**
 * User-scoped browser storage.
 *
 * Critical: localStorage is global per-browser. Without scoping by the
 * authenticated user id, two users sharing the same device would read and
 * mutate each other's data — and a "Reset" by user A would visibly wipe
 * settings/backtests for user B.
 *
 * Every key handled through this module is namespaced as
 *   orca:<uid>:<key>
 * so each authenticated user has a completely isolated keyspace.
 */
import { supabase } from '@/integrations/supabase/client';

let cachedUid: string | null = null;
let pending: Promise<string | null> | null = null;

export function setScopedUid(uid: string | null) {
  cachedUid = uid;
}

function readAuthUidFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('sb-') || !k.includes('-auth-token')) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      let parsed: unknown = null;
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
      if (!parsed || typeof parsed !== 'object') continue;

      const p = parsed as {
        user?: { id?: unknown };
        currentSession?: { user?: { id?: unknown } };
        session?: { user?: { id?: unknown } };
      };
      const direct = p.user?.id;
      const current = p.currentSession?.user?.id;
      const session = p.session?.user?.id;
      const tuple = Array.isArray(parsed) ? (parsed[0] as { user?: { id?: unknown } } | undefined)?.user?.id : null;
      const uid = direct || current || session || tuple;
      if (typeof uid === 'string' && uid) return uid;
    }
  } catch { /* ignore */ }
  return null;
}

function getCachedUidSync(): string | null {
  if (cachedUid) return cachedUid;
  const uid = readAuthUidFromStorage();
  if (uid) cachedUid = uid;
  return cachedUid;
}

async function ensureUid(): Promise<string | null> {
  const syncUid = getCachedUidSync();
  if (syncUid) return syncUid;
  if (pending) return pending;
  pending = supabase.auth.getUser().then(r => {
    cachedUid = r.data.user?.id ?? null;
    return cachedUid;
  }).finally(() => { pending = null; });
  return pending;
}

function makeKey(uid: string | null, key: string) {
  // Anonymous fallback shouldn't leak across sessions either.
  return `orca:${uid || 'anon'}:${key}`;
}

export const scopedStorage = {
  async getItem(key: string): Promise<string | null> {
    const uid = await ensureUid();
    try { return localStorage.getItem(makeKey(uid, key)); } catch { return null; }
  },
  async setItem(key: string, value: string): Promise<void> {
    const uid = await ensureUid();
    try { localStorage.setItem(makeKey(uid, key), value); } catch { /* ignore */ }
  },
  async removeItem(key: string): Promise<void> {
    const uid = await ensureUid();
    try { localStorage.removeItem(makeKey(uid, key)); } catch { /* ignore */ }
  },
  /** Synchronous variants — only safe to call after auth has resolved. */
  getSync(key: string): string | null {
    try { return localStorage.getItem(makeKey(getCachedUidSync(), key)); } catch { return null; }
  },
  setSync(key: string, value: string): void {
    try { localStorage.setItem(makeKey(getCachedUidSync(), key), value); } catch { /* ignore */ }
  },
  removeSync(key: string): void {
    try { localStorage.removeItem(makeKey(getCachedUidSync(), key)); } catch { /* ignore */ }
  },
  /** Wipe every key belonging to the current user. */
  async wipeCurrentUser(): Promise<number> {
    const uid = await ensureUid();
    const prefix = `orca:${uid || 'anon'}:`;
    let n = 0;
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      for (const k of keys) { localStorage.removeItem(k); n++; }
    } catch { /* ignore */ }
    return n;
  },
};
