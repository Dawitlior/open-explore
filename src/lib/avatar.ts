import { supabase } from '@/integrations/supabase/client';

const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 days
const CACHE_TTL_MS = 60 * 60 * 1000; // refresh signed URLs at most once/hour
const SS_PREFIX = 'orca:avatar-signed:';

type CacheEntry = { url: string; expires: number };
const memCache = new Map<string, CacheEntry>();

function readSession(key: string): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + key);
    if (!raw) return null;
    const e = JSON.parse(raw) as CacheEntry;
    return e && e.url && e.expires > Date.now() ? e : null;
  } catch { return null; }
}
function writeSession(key: string, entry: CacheEntry) {
  try { sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(entry)); } catch { /* noop */ }
}

/** Resolve a stored avatar reference (path or URL) to a usable signed URL.
 *  Cached in-memory + sessionStorage for instant subsequent renders. */
export async function resolveAvatarUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  const m = stored.match(/\/storage\/v1\/object\/(?:public|sign)\/avatars\/([^?]+)/);
  const path = m ? decodeURIComponent(m[1]) : stored;
  if (/^https?:\/\//i.test(path)) return stored; // unknown external URL

  const now = Date.now();
  const mem = memCache.get(path);
  if (mem && mem.expires > now) return mem.url;
  const ses = readSession(path);
  if (ses) { memCache.set(path, ses); return ses.url; }

  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, SIGNED_TTL);
  if (error || !data?.signedUrl) return null;
  const entry: CacheEntry = { url: data.signedUrl, expires: now + CACHE_TTL_MS };
  memCache.set(path, entry);
  writeSession(path, entry);
  return data.signedUrl;
}

/** Synchronous read of a previously cached signed URL — perfect for first paint. */
export function getCachedAvatarUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const m = stored.match(/\/storage\/v1\/object\/(?:public|sign)\/avatars\/([^?]+)/);
  const path = m ? decodeURIComponent(m[1]) : stored;
  if (/^https?:\/\//i.test(path)) return stored;
  const now = Date.now();
  const mem = memCache.get(path);
  if (mem && mem.expires > now) return mem.url;
  const ses = readSession(path);
  if (ses) { memCache.set(path, ses); return ses.url; }
  return null;
}

/** Drop cached entries when avatar changes. */
export function invalidateAvatarCache(stored?: string | null) {
  if (!stored) { memCache.clear(); try { Object.keys(sessionStorage).forEach(k => k.startsWith(SS_PREFIX) && sessionStorage.removeItem(k)); } catch { /* noop */ } return; }
  const m = stored.match(/\/storage\/v1\/object\/(?:public|sign)\/avatars\/([^?]+)/);
  const path = m ? decodeURIComponent(m[1]) : stored;
  memCache.delete(path);
  try { sessionStorage.removeItem(SS_PREFIX + path); } catch { /* noop */ }
}
